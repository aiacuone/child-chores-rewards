#!/usr/bin/env bash
# Restore a Rocket Rewards backup from R2. Installed as
# /usr/local/bin/rocket-rewards-restore. Run it as root, by hand.
#
#   sudo rocket-rewards-restore                 latest backup, into a copy
#   sudo rocket-rewards-restore NAME            that backup, into a copy
#   sudo rocket-rewards-restore --live [NAME]   replace the live database
#
# Into a copy: the live app is left alone. The copy is checked and its row
# counts are shown next to the live database's, to prove the backup works.
# --live: asks you to type RESTORE, stops the app, keeps the current database
# as rocket-rewards.db.before-restore-<time>, puts the backup in, starts the app.
set -euo pipefail
umask 077
# Only show rclone problems, not its notices (such as a missing config file).
export RCLONE_LOG_LEVEL=ERROR

DB_FILE=${DB_FILE:-/var/lib/rocket-rewards/rocket-rewards.db}
STATE_DIR=${STATE_DIR:-/var/lib/rocket-rewards-backup}
LIB_DIR=${LIB_DIR:-/usr/local/lib/rocket-rewards-backup}
SERVICE=rocket-rewards
APP_USER=rocket-rewards

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

live=
if [ "${1:-}" = --live ]; then live=1; shift; fi
name=${1:-}
[ $# -le 1 ] || die "usage: rocket-rewards-restore [--live] [NAME]"

if [ -z "${BACKUP_REMOTE:-}" ]; then
  set -a
  # shellcheck source=/dev/null
  . /etc/rocket-rewards/r2.env
  set +a
  export RCLONE_CONFIG_R2_TYPE=s3
  export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
  export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
  export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
  export RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT"
  export RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true
  BACKUP_REMOTE="r2:$R2_BUCKET/db"
fi

pattern='^rocket-rewards-[0-9]{8}T[0-9]{6}Z\.db\.gz$'
if [ -z "$name" ]; then
  name=$(rclone lsf --files-only "$BACKUP_REMOTE/" | grep -E "$pattern" | sort | tail -n 1 || true)
  [ -n "$name" ] || die "no backups found"
fi
printf '%s\n' "$name" | grep -Eq "$pattern" || die "not a backup name: $name"

install -d -m 700 "$STATE_DIR"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "==> downloading $name"
rclone copyto "$BACKUP_REMOTE/$name" "$tmp/$name"
gunzip -c "$tmp/$name" > "$tmp/restored.db"
[ "$(python3 "$LIB_DIR/db.py" check "$tmp/restored.db")" = ok ] || die "the backup failed its integrity check"
echo "==> integrity check: ok"

if [ -z "$live" ]; then
  copy="$STATE_DIR/restore-test.db"
  mv "$tmp/restored.db" "$copy"
  echo "==> restored into a copy: $copy (the live app was not touched)"
  echo
  echo "rows per table (backup copy | live now):"
  python3 "$LIB_DIR/db.py" counts "$copy" > "$tmp/copy.txt"
  if [ -f "$DB_FILE" ]; then python3 "$LIB_DIR/db.py" counts "$DB_FILE" > "$tmp/live.txt"; else : > "$tmp/live.txt"; fi
  join -a1 -a2 -e '-' -o 0,1.2,2.2 "$tmp/copy.txt" "$tmp/live.txt" | awk '{printf "  %-20s %6s | %s\n", $1, $2, $3}'
  echo
  echo "Live rows can be higher if things changed since the backup (sessions renew on use)."
  echo "Delete the copy when you are done: sudo rm $copy"
  exit 0
fi

[ -t 0 ] || die "--live must be run by hand in a terminal"
echo "This replaces the live database with $name."
read -r -p "Type RESTORE to continue: " answer
[ "$answer" = RESTORE ] || die "cancelled, nothing changed"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
echo "==> stopping $SERVICE"
systemctl stop "$SERVICE"
for f in "$DB_FILE" "$DB_FILE-wal" "$DB_FILE-shm"; do
  if [ -f "$f" ]; then mv "$f" "$f.before-restore-$stamp"; fi
done
install -m 600 -o "$APP_USER" -g "$APP_USER" "$tmp/restored.db" "$DB_FILE"
echo "==> starting $SERVICE"
systemctl start "$SERVICE"
echo "==> done. The previous database is $DB_FILE.before-restore-$stamp"
