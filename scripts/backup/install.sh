#!/usr/bin/env bash
# Install the Rocket Rewards backup on the shared VM. Run it ON the VM, as root,
# from the folder copied over (see docs/how-to/backup-and-restore.md):
#
#   sudo bash backup/install.sh
#
# It installs rocket-rewards-backup and rocket-rewards-restore, a daily timer
# at 3:00 am, and runs a first backup. Safe to run again.
# Nothing here touches shtrong, price-tracker or umami.
set -euo pipefail

APP=rocket-rewards
HERE=$(cd "$(dirname "$0")" && pwd)
LIB_DIR=/usr/local/lib/$APP-backup
STATE_DIR=/var/lib/$APP-backup

say() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run this as root: sudo bash $0"
for tool in python3 rclone gzip; do
  command -v "$tool" >/dev/null || die "$tool is not installed"
done
python3 -c 'import sqlite3' 2>/dev/null || die "python3 has no sqlite3 module"
[ -f /etc/$APP/r2.env ] || die "/etc/$APP/r2.env not found. Run vm-setup.sh first"
for v in R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_ENDPOINT R2_BUCKET; do
  grep -q "^$v=." /etc/$APP/r2.env || die "$v is missing from /etc/$APP/r2.env"
done
for f in backup.sh restore.sh db.py; do
  [ -f "$HERE/$f" ] || die "missing $HERE/$f"
done

say "installing the scripts"
install -d -m 755 "$LIB_DIR"
install -m 644 "$HERE/db.py" "$LIB_DIR/db.py"
install -m 755 "$HERE/backup.sh" "/usr/local/bin/$APP-backup"
install -m 755 "$HERE/restore.sh" "/usr/local/bin/$APP-restore"
install -d -m 700 "$STATE_DIR"

say "writing the daily timer"
cat > "/etc/systemd/system/$APP-backup.service" <<EOF
[Unit]
Description=Back up Rocket Rewards to R2
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/$APP-backup
Nice=10
IOSchedulingClass=idle
EOF

cat > "/etc/systemd/system/$APP-backup.timer" <<EOF
[Unit]
Description=Back up Rocket Rewards every day at 3:00 am

[Timer]
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now "$APP-backup.timer" >/dev/null 2>&1

say "running a first backup now"
if systemctl start "$APP-backup.service"; then
  journalctl -u "$APP-backup.service" -n 5 --no-pager -o cat
else
  journalctl -u "$APP-backup.service" -n 20 --no-pager -o cat || true
  die "the first backup failed (see above)"
fi

say "done. Next run: $(systemctl list-timers "$APP-backup.timer" --no-legend | awk '{print $1, $2, $3}')"
cat <<EOF

Prove the restore works (into a copy, the live app is not touched):
  sudo $APP-restore
EOF
