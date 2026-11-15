#!/usr/bin/env bash
# Create the account GitHub Actions deploys with. Run it ON the VM, as root:
#
#   sudo bash vm-deploy-user.sh [PUBLIC_KEY_FILE]
#
# PUBLIC_KEY_FILE is the public half of the deploy key (default:
# ~/rocket-deploy.pub of the user who ran sudo). Run it again with a new key
# to replace the old one.
#
# The deploy user is deliberately weak. It can log in with that one key, it
# owns /opt/rocket-rewards, and its only sudo rights are to stop, start and
# check rocket-rewards.service. It cannot read /etc/rocket-rewards (secrets)
# or /var/lib/rocket-rewards (the database), and it has no other sudo. A bad
# package run during the deploy therefore cannot take over the shared VM.
# Nothing here touches shtrong, price-tracker or umami.
set -euo pipefail

APP=rocket-rewards
DEPLOY=rocket-deploy
CODE_DIR=/opt/$APP

say() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run this as root: sudo bash $0"
[ -n "${SUDO_USER:-}" ] || die "run it with sudo from your own login"
LOGIN_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
KEY_FILE=${1:-$LOGIN_HOME/rocket-deploy.pub}

[ -f "$KEY_FILE" ] || die "public key $KEY_FILE not found. Copy it to the VM first (see docs/how-to/rotate-secrets.md)"
[ -d "$CODE_DIR" ] || die "$CODE_DIR not found. Run vm-setup.sh first"
[ "$(wc -l < "$KEY_FILE")" -le 1 ] || die "$KEY_FILE must hold exactly one public key"
key_line=$(grep -v '^$' "$KEY_FILE")
case "$key_line" in
  ssh-ed25519\ *) ;;
  *PRIVATE*) die "that is a PRIVATE key. Copy the .pub file, never the private one" ;;
  *) die "$KEY_FILE is not an ssh-ed25519 public key" ;;
esac
ssh-keygen -l -f "$KEY_FILE" >/dev/null || die "$KEY_FILE is not a valid public key"

SYSTEMCTL=$(readlink -f "$(command -v systemctl)")
[ -x "$SYSTEMCTL" ] || die "systemctl not found"

if ! id "$DEPLOY" >/dev/null 2>&1; then
  say "creating user $DEPLOY"
  useradd --create-home --shell /bin/bash --comment "Rocket Rewards deploy" "$DEPLOY"
fi
DEPLOY_HOME=$(getent passwd "$DEPLOY" | cut -d: -f6)

say "installing the deploy key (one key, no forwarding)"
install -d -m 700 -o "$DEPLOY" -g "$DEPLOY" "$DEPLOY_HOME/.ssh"
printf 'restrict %s\n' "$key_line" > "$DEPLOY_HOME/.ssh/authorized_keys"
chown "$DEPLOY:$DEPLOY" "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"

say "giving $DEPLOY the code folder"
chown -R "$DEPLOY:$DEPLOY" "$CODE_DIR"
chmod 755 "$CODE_DIR"

say "writing the sudo rule (this service only)"
tmp=$(mktemp)
cat > "$tmp" <<EOF
# Written by scripts/vm-deploy-user.sh
$DEPLOY ALL=(root) NOPASSWD: $SYSTEMCTL stop $APP, $SYSTEMCTL start $APP, $SYSTEMCTL status $APP, $SYSTEMCTL status $APP --no-pager
EOF
visudo -cf "$tmp" >/dev/null || { rm -f "$tmp"; die "the sudo rule did not validate. Nothing was installed"; }
install -m 440 -o root -g root "$tmp" "/etc/sudoers.d/$APP-deploy"
rm -f "$tmp"

say "done"
cat <<EOF

Test the key from the developer's machine:
  ssh -i <private key> -o IdentitiesOnly=yes $DEPLOY@<this VM's address> 'sudo -n $SYSTEMCTL status $APP --no-pager | head -3; sudo -n true && echo "BAD: general sudo works" || echo "good: no general sudo"'

Then point the GitHub secret DEPLOY_SSH_KEY at the matching private key.
Old deploy keys on the ubuntu login can be removed once a deploy has worked.
EOF
