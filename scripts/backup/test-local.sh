#!/usr/bin/env bash
# Try the backup and restore scripts on this machine, against a scratch folder
# standing in for the R2 bucket. It touches nothing outside a temporary folder
# and needs no keys.
#
#   bash scripts/backup/test-local.sh
#
# Needs rclone and python3. If rclone is not on the PATH, point RCLONE at it:
#   RCLONE=/path/to/rclone bash scripts/backup/test-local.sh
set -euo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
RCLONE=${RCLONE:-$(command -v rclone || true)}
[ -x "$RCLONE" ] || { echo "rclone not found. Set RCLONE=/path/to/rclone" >&2; exit 1; }

T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/bin" "$T/remote"
ln -s "$RCLONE" "$T/bin/rclone"

export PATH="$T/bin:$PATH"
export DB_FILE="$T/live.db" STATE_DIR="$T/state" LIB_DIR="$HERE" BACKUP_REMOTE="$T/remote"

pass=0
check() { # check "what" command...
  local what=$1; shift
  if "$@"; then echo "  ok   $what"; pass=$((pass + 1)); else echo "  FAIL $what"; exit 1; fi
}
count_remote() { find "$T/remote" -type f | wc -l | tr -d ' '; }
add_user() { python3 -I -c "import sqlite3,sys;c=sqlite3.connect(sys.argv[1]);c.execute('insert into user(email) values (?)',(sys.argv[2],));c.commit()" "$DB_FILE" "$1"; }

echo "Setting up a small live database (WAL mode, like the app)"
python3 -I - "$DB_FILE" <<'PY'
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
c.execute("pragma journal_mode=wal")
c.execute("create table family(id integer primary key, name text)")
c.execute("create table user(id integer primary key, email text)")
c.execute("create table __drizzle_migrations(id integer)")
c.execute("insert into family(name) values ('Our family')")
c.execute("insert into user(email) values ('a@example.com')")
c.commit()
PY

echo "1. First backup uploads one copy"
bash "$HERE/backup.sh" | sed 's/^/     /'
check "one copy in the bucket" test "$(count_remote)" = 1

echo "2. Backing up again with no changes uploads nothing"
bash "$HERE/backup.sh" | sed 's/^/     /'
check "still one copy" test "$(count_remote)" = 1

echo "3. Changes upload new copies, and only the newest 2 are kept (KEEP=2)"
for i in 1 2 3; do
  sleep 1.2
  add_user "x$i@example.com"
  KEEP=2 bash "$HERE/backup.sh" | sed 's/^/     /'
done
check "two copies kept" test "$(count_remote)" = 2

echo "4. Restore into a copy leaves the live database alone"
before=$(python3 -I "$HERE/db.py" hash "$DB_FILE")
bash "$HERE/restore.sh" | sed 's/^/     /'
after=$(python3 -I "$HERE/db.py" hash "$DB_FILE")
check "live database unchanged" test "$before" = "$after"
check "the copy passes its integrity check" test "$(python3 -I "$HERE/db.py" check "$STATE_DIR/restore-test.db")" = ok
check "the copy has the same data as live" test "$(python3 -I "$HERE/db.py" hash "$STATE_DIR/restore-test.db")" = "$before"

echo "5. Bad input is refused"
check "a bad backup name is refused" bash -c "! bash '$HERE/restore.sh' 'not-a-backup.txt' >/dev/null 2>&1"
check "--live without a terminal is refused" bash -c "! bash '$HERE/restore.sh' --live </dev/null >/dev/null 2>&1"

echo
echo "All $pass checks passed."
