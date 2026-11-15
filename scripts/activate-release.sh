#!/usr/bin/env bash
# Runs ON the VM, as the deploy user, after the workflow has synced the source
# into ~/rocket-rewards-src. Builds it, swaps it into /opt/rocket-rewards and
# restarts the service. If the app does not answer afterwards, the previous
# release is put back.
set -euo pipefail

APP=rocket-rewards
PORT=3003
src="${HOME}/${APP}-src"
prev="${HOME}/${APP}-prev"
live=/opt/${APP}

cd "$src"
npm ci
npm run build

healthy() {
  node --input-type=module -e "const r = await fetch('http://127.0.0.1:${PORT}/'); if (!r.ok) process.exit(1)"
}

wait_healthy() {
  local _
  for _ in $(seq 1 20); do
    if healthy; then
      return 0
    fi
    sleep 1
  done
  return 1
}

sudo systemctl stop "$APP"
rsync -a --delete "$src"/ "$live"/
sudo systemctl start "$APP"

if wait_healthy; then
  rm -rf "$prev"
  mkdir -p "$prev"
  rsync -a --delete "$src"/ "$prev"/
  echo "${APP} is up"
  exit 0
fi

echo "${APP} did not answer on :${PORT} after restart" >&2
sudo systemctl status "$APP" --no-pager || true

if [ -d "$prev/build" ]; then
  echo "restoring previous release" >&2
  sudo systemctl stop "$APP" || true
  rsync -a --delete "$prev"/ "$live"/
  sudo systemctl start "$APP" || true
fi

exit 1
