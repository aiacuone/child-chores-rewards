#!/usr/bin/env bash
# Daily backup of the Rocket Rewards database to its own private R2 bucket.
# Installed as /usr/local/bin/rocket-rewards-backup and run by
# rocket-rewards-backup.timer. Runs as root.
#
# It takes a safe copy while the app runs, uploads it only when the data has
# changed since the last upload, and keeps the newest 14 copies.
# The R2 keys come from /etc/rocket-rewards/r2.env and are never printed.
set -euo pipefail
umask 077
# Only show rclone problems, not its notices (such as a missing config file).
export RCLONE_LOG_LEVEL=ERROR

DB_FILE=${DB_FILE:-/var/lib/rocket-rewards/rocket-rewards.db}
STATE_DIR=${STATE_DIR:-/var/lib/rocket-rewards-backup}
LIB_DIR=${LIB_DIR:-/usr/local/lib/rocket-rewards-backup}
KEEP=${KEEP:-14}

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

if [ ! -f "$DB_FILE" ]; then
  echo "no database at $DB_FILE yet, nothing to back up"
  exit 0
fi

install -d -m 700 "$STATE_DIR"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

python3 "$LIB_DIR/db.py" backup "$DB_FILE" "$tmp/copy.db"
[ "$(python3 "$LIB_DIR/db.py" check "$tmp/copy.db")" = ok ] || { echo "the copy failed its integrity check, nothing uploaded" >&2; exit 1; }

hash=$(python3 "$LIB_DIR/db.py" hash "$tmp/copy.db")
if [ -f "$STATE_DIR/last.sha256" ] && [ "$(cat "$STATE_DIR/last.sha256")" = "$hash" ]; then
  echo "no changes since the last upload, nothing uploaded"
  exit 0
fi

name="rocket-rewards-$(date -u +%Y%m%dT%H%M%SZ).db.gz"
gzip -c "$tmp/copy.db" > "$tmp/$name"
rclone copyto "$tmp/$name" "$BACKUP_REMOTE/$name"
echo "$hash" > "$STATE_DIR/last.sha256"
echo "uploaded $name"

# Keep the newest $KEEP copies. Names sort by time.
mapfile -t copies < <(rclone lsf --files-only "$BACKUP_REMOTE/" | grep -E '^rocket-rewards-[0-9]{8}T[0-9]{6}Z\.db\.gz$' | sort)
extra=$(( ${#copies[@]} - KEEP ))
if [ "$extra" -gt 0 ]; then
  for old in "${copies[@]:0:extra}"; do
    rclone deletefile "$BACKUP_REMOTE/$old"
    echo "removed old copy $old"
  done
fi
