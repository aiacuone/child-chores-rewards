# Setting up the VM

Rocket Rewards runs on the shared Oracle VM ([ADR 0004](adr/0004-hosting-and-deploy.md)). `scripts/vm-setup.sh` sets up everything the app needs there. It is run by hand on the VM, once. It is safe to run again.

## What it creates

- System user `rocket-rewards`, with no login.
- `/opt/rocket-rewards`: the app's code. It is handed to the deploy user by `scripts/vm-deploy-user.sh` (see "The deploy user" below), and each deploy syncs into it.
- `/var/lib/rocket-rewards`: the SQLite file and photos, readable only by the app user.
- `/etc/rocket-rewards/`: `app.env`, `duckdns.env` and `r2.env`, root only.
- `rocket-rewards.service`: enabled, not started. The deploy in item 7 starts it, on port 3003 (3000 to 3002 are taken by other apps).
- `rocket-rewards-duckdns.service` and `.timer`: tell DuckDNS the VM's address every 5 minutes.
- `/etc/caddy/conf.d/rocket-rewards.caddy`: the https site. It shows a short "getting ready" page until the app answers.
- One added line in `/etc/caddy/Caddyfile`, `import /etc/caddy/conf.d/*.caddy`, after saving a backup copy next to it. If Caddy rejects the result, the script restores the backup.

It does not touch shtrong, price-tracker or umami.

## Running it

1. Copy the script and the five secret files to the VM, from the developer's machine:

   ```
   scp scripts/vm-setup.sh ubuntu@shtrong.duckdns.org:
   ssh ubuntu@shtrong.duckdns.org 'mkdir -p -m 700 rocket-rewards-secrets'
   scp ~/.config/rocket-rewards/{duckdns,google,gmail,r2,allowed}.env ubuntu@shtrong.duckdns.org:rocket-rewards-secrets/
   ```

2. Run it on the VM:

   ```
   ssh ubuntu@shtrong.duckdns.org
   sudo bash vm-setup.sh
   ```

3. Check it from any machine: https://rocket-rewards.duckdns.org shows "Rocket Rewards is getting ready." over https.

4. Delete the temporary copies on the VM and the script:

   ```
   rm -r ~/rocket-rewards-secrets ~/vm-setup.sh
   ```

The secrets stay in `/etc/rocket-rewards/`, root only. They are never in git.

## If something fails

- The script stops at the first problem and says what it was. Fix it and run it again.
- DuckDNS not answering OK: check the token, `journalctl -u rocket-rewards-duckdns`.
- No certificate yet: ports 80 and 443 must be open, `journalctl -u caddy -n 50`.

## The deploy user

GitHub deploys as `rocket-deploy`, not as your own login. `scripts/vm-deploy-user.sh` makes it, once, after `vm-setup.sh`:

- It can log in with one SSH key only, with no forwarding.
- It owns `/opt/rocket-rewards` and its own source folder.
- Its only sudo rights are to stop, start and check `rocket-rewards.service`. The rule is in `/etc/sudoers.d/rocket-rewards-deploy`.
- It cannot read the secrets in `/etc/rocket-rewards` or the database in `/var/lib/rocket-rewards`, and it has no other sudo.
- A package that runs code during the deploy therefore cannot take over the shared VM.

To set it up, or to replace its key, follow "The deploy key" in [how-to/rotate-secrets.md](how-to/rotate-secrets.md).

## Deploys

A push to `main` deploys, through the `deploy` job in `.github/workflows/ci.yml`:

- It runs only after the `test` job passes. A failing test stops the deploy.
- It copies the source to `~/rocket-rewards-src` of the `rocket-deploy` user over SSH, then runs `scripts/activate-release.sh` there.
- That script builds the app, swaps it into `/opt/rocket-rewards`, restarts `rocket-rewards.service` and checks that port 3003 answers. If it does not, the previous release is put back.
- The deploy key is the `DEPLOY_SSH_KEY` secret in GitHub. Its public half is the one key in `/home/rocket-deploy/.ssh/authorized_keys` on the VM. The private half is in `~/.config/rocket-rewards/rocket-deploy` on the developer's machine.
