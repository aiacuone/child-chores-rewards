#!/usr/bin/env bash
# Set up Rocket Rewards on the shared Oracle VM. Run it ON the VM, as root:
#
#   sudo bash vm-setup.sh [SECRETS_DIR]
#
# SECRETS_DIR holds the five env files copied from the developer's machine
# (duckdns.env, google.env, gmail.env, r2.env, allowed.env). It defaults to
# ~/rocket-rewards-secrets of the user who ran sudo. Delete it afterwards.
#
# It creates only things named after this app:
#   user rocket-rewards, /opt/rocket-rewards, /var/lib/rocket-rewards,
#   /etc/rocket-rewards, rocket-rewards.service, its own DuckDNS updater
#   (rocket-rewards-duckdns.service and .timer) and a Caddy site file.
# The only shared file it changes is /etc/caddy/Caddyfile, and only to add one
# line (import /etc/caddy/conf.d/*.caddy), after saving a backup copy.
# It is safe to run again: it finds what exists and updates it.
# Nothing here touches shtrong, price-tracker or umami.
set -euo pipefail

APP=rocket-rewards
DOMAIN=rocket-rewards.duckdns.org
PORT=3003
NODE=/usr/local/bin/node

CODE_DIR=/opt/$APP
DATA_DIR=/var/lib/$APP
ETC_DIR=/etc/$APP
CADDYFILE=/etc/caddy/Caddyfile
CADDY_DIR=/etc/caddy/conf.d
SITE_FILE=$CADDY_DIR/$APP.caddy

say() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# ---- Checks before anything changes ----------------------------------------

[ "$(id -u)" -eq 0 ] || die "run this as root: sudo bash $0"
[ -n "${SUDO_USER:-}" ] || die "run it with sudo from your own login, so I know who deploys"
DEPLOY_USER=$SUDO_USER
[ "$DEPLOY_USER" != root ] || die "run it with sudo from a normal login, not as root"

DEPLOY_HOME=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
SECRETS_DIR=${1:-$DEPLOY_HOME/rocket-rewards-secrets}

[ -x "$NODE" ] || die "$NODE not found"
command -v caddy >/dev/null || die "caddy is not installed"
command -v curl >/dev/null || die "curl is not installed"
[ -f "$CADDYFILE" ] || die "$CADDYFILE not found"
[ -d "$SECRETS_DIR" ] || die "secrets folder $SECRETS_DIR not found. Copy the env files there first (see docs/vm-setup.md)"
for f in duckdns.env google.env gmail.env r2.env allowed.env; do
  [ -f "$SECRETS_DIR/$f" ] || die "missing $SECRETS_DIR/$f"
done

# The port must be free, unless it is already ours.
if ss -ltn "sport = :$PORT" | grep -q LISTEN && ! systemctl is-active --quiet "$APP"; then
  die "port $PORT is already in use by something else. Pick another PORT at the top of this script"
fi

# ---- User and folders ------------------------------------------------------

if ! id "$APP" >/dev/null 2>&1; then
  say "creating system user $APP"
  useradd --system --home-dir "$DATA_DIR" --no-create-home --shell /usr/sbin/nologin "$APP"
fi

say "creating folders"
# The code folder belongs to the deploy user (item 7 syncs into it over SSH).
# The app user can read it but not change it.
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$CODE_DIR"
# The data folder holds the database and the photos: only the app user.
install -d -m 700 -o "$APP" -g "$APP" "$DATA_DIR"
install -d -m 700 -o root -g root "$ETC_DIR"

# ---- Secrets (root only) ---------------------------------------------------

say "installing secrets into $ETC_DIR (root only)"
umask 077
{
  echo "# Written by scripts/vm-setup.sh. Root only."
  echo "NODE_ENV=production"
  echo "HOST=127.0.0.1"
  echo "PORT=$PORT"
  echo "ORIGIN=https://$DOMAIN"
  echo "DATABASE_FILE=$DATA_DIR/$APP.db"
  cat "$SECRETS_DIR/google.env"
  echo
  cat "$SECRETS_DIR/gmail.env"
  echo
  cat "$SECRETS_DIR/allowed.env"
} | grep -v '^$' > "$ETC_DIR/app.env"
install -m 600 -o root -g root "$SECRETS_DIR/duckdns.env" "$ETC_DIR/duckdns.env"
install -m 600 -o root -g root "$SECRETS_DIR/r2.env" "$ETC_DIR/r2.env"
chmod 600 "$ETC_DIR/app.env"
chown root:root "$ETC_DIR/app.env"
umask 022

# ---- App service (enabled now, started by the deploy in item 7) ------------

say "writing $APP.service"
cat > "/etc/systemd/system/$APP.service" <<EOF
[Unit]
Description=Rocket Rewards
After=network.target

[Service]
User=$APP
Group=$APP
WorkingDirectory=$CODE_DIR
EnvironmentFile=$ETC_DIR/app.env
ExecStart=$NODE build
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF

# ---- DuckDNS updater (its own, not shtrong's) -------------------------------

say "writing the DuckDNS updater"
cat > "/usr/local/bin/$APP-duckdns" <<'EOF'
#!/usr/bin/env bash
# Tell DuckDNS this VM's current address. The token never appears in the
# process list or the log.
set -euo pipefail
. /etc/rocket-rewards/duckdns.env
reply=$(curl -fsS --max-time 20 -K - <<CURL
url = "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip="
CURL
)
echo "duckdns update for ${DUCKDNS_DOMAIN}: ${reply}"
[ "$reply" = OK ]
EOF
chmod 755 "/usr/local/bin/$APP-duckdns"

cat > "/etc/systemd/system/$APP-duckdns.service" <<EOF
[Unit]
Description=Update DuckDNS for Rocket Rewards
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/$APP-duckdns
EOF

cat > "/etc/systemd/system/$APP-duckdns.timer" <<EOF
[Unit]
Description=Update DuckDNS for Rocket Rewards every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable "$APP.service" >/dev/null 2>&1
systemctl enable --now "$APP-duckdns.timer" >/dev/null 2>&1
say "updating DuckDNS now"
systemctl start "$APP-duckdns.service" || die "DuckDNS did not answer OK. Check the token: journalctl -u $APP-duckdns"

# ---- Caddy -----------------------------------------------------------------

say "writing the Caddy site"
install -d -m 755 "$CADDY_DIR"
cat > "$SITE_FILE" <<EOF
$DOMAIN {
	encode gzip
	reverse_proxy 127.0.0.1:$PORT

	# Until the app is deployed, show a short page instead of an error.
	handle_errors {
		@down expression {err.status_code} in [502, 503, 504]
		header @down Content-Type "text/html; charset=utf-8"
		respond @down "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Rocket Rewards</title></head><body style=\"margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0F2C;color:#F3F4FF;font:800 20px Nunito,system-ui,sans-serif;text-align:center;padding:24px\"><p>Rocket Rewards is getting ready.</p></body></html>" 200
	}
}
EOF

backup=
if ! grep -qF "import $CADDY_DIR/*.caddy" "$CADDYFILE"; then
  backup="$CADDYFILE.bak-$APP-$(date +%Y%m%d%H%M%S)"
  say "adding one import line to $CADDYFILE (backup: $backup)"
  cp -p "$CADDYFILE" "$backup"
  printf '\n# Added by rocket-rewards vm-setup.sh\nimport %s/*.caddy\n' "$CADDY_DIR" >> "$CADDYFILE"
fi

if ! caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
  caddy validate --config "$CADDYFILE" --adapter caddyfile || true
  if [ -n "$backup" ]; then cp -p "$backup" "$CADDYFILE"; fi
  rm -f "$SITE_FILE"
  die "Caddy rejected the config. I restored the old Caddyfile and removed my site file. Nothing was reloaded"
fi
systemctl reload caddy

# ---- Check the result ------------------------------------------------------

say "waiting for https://$DOMAIN (the certificate can take up to a minute)"
ok=
for _ in $(seq 1 12); do
  # Quiet on purpose: the first tries fail with a TLS error until the certificate is issued.
  if curl -fs --max-time 10 -o /dev/null "https://$DOMAIN/"; then ok=1; break; fi
  sleep 5
done

if [ -n "$ok" ]; then
  say "done: https://$DOMAIN answers over https"
else
  echo "Not answering yet. Check: journalctl -u caddy -n 50, and that ports 80 and 443 are open." >&2
  exit 1
fi

cat <<EOF

Next steps:
  - Delete the temporary secrets folder:  rm -r "$SECRETS_DIR"
  - Item 7 (deploy on push) syncs the app into $CODE_DIR and starts $APP.service
EOF
