# Rotate a secret

Replace a secret when it may have leaked, or on a schedule. Secrets live in two places: `~/.config/rocket-rewards/*.env` on your machine, and root-only files in `/etc/rocket-rewards/` on the VM. Never put them in git or in chat.

| Secret | File | Make the new value at |
| --- | --- | --- |
| Google client secret | `google.env` | https://console.cloud.google.com/apis/credentials (sign-in needed) |
| Gmail app password | `gmail.env` | https://myaccount.google.com/apppasswords (sign-in needed) |
| DuckDNS token | `duckdns.env` | https://www.duckdns.org (sign-in needed) |
| R2 access keys | `r2.env` | https://dash.cloudflare.com, then R2, then API tokens (sign-in needed) |
| Deploy key | see the last section | |

## The env files (Google, Gmail, DuckDNS, R2, allowed emails)

1. Make the new value at the link above. Add the new one before removing the old one, so nothing stops in between.
   - Google: open the client and choose Add secret.
   - Gmail: create a new app password, with no spaces.
   - DuckDNS: regenerate the token.
   - R2: create a new token for the `rocket-rewards-backups` bucket only, with Object Read & Write.
2. Put the new value in the matching file in `~/.config/rocket-rewards/`. Use the full path, not `~`, in an editor. Keep mode 600:

   ```
   chmod 600 ~/.config/rocket-rewards/*.env
   ```

3. Copy the five files to the VM and run the setup script again. It is safe to repeat:

   ```
   scp scripts/vm-setup.sh ubuntu@shtrong.duckdns.org:
   ssh ubuntu@shtrong.duckdns.org 'mkdir -p -m 700 rocket-rewards-secrets'
   scp ~/.config/rocket-rewards/{duckdns,google,gmail,r2,allowed}.env ubuntu@shtrong.duckdns.org:rocket-rewards-secrets/
   ssh ubuntu@shtrong.duckdns.org 'sudo bash vm-setup.sh && sudo systemctl restart rocket-rewards'
   ```

4. Delete the temporary copies on the VM:

   ```
   ssh ubuntu@shtrong.duckdns.org 'rm -r ~/rocket-rewards-secrets ~/vm-setup.sh'
   ```

5. Check that sign-in still works at https://rocket-rewards.duckdns.org.
6. Now remove the old secret at the link in step 1.
7. For a local `.env`, rebuild it as in [run-locally.md](run-locally.md).

## The deploy key

1. Make a new key pair:

   ```
   ssh-keygen -t ed25519 -N "" -C "rocket-rewards-deploy" -f /home/adrian/.config/rocket-rewards/github-deploy-new
   ```

2. Add the new public key to the VM, then test it:

   ```
   ssh-copy-id -i /home/adrian/.config/rocket-rewards/github-deploy-new.pub ubuntu@shtrong.duckdns.org
   ssh -i /home/adrian/.config/rocket-rewards/github-deploy-new -o IdentitiesOnly=yes ubuntu@shtrong.duckdns.org 'echo key works'
   ```

3. Replace the GitHub secret:

   ```
   gh secret set DEPLOY_SSH_KEY < /home/adrian/.config/rocket-rewards/github-deploy-new
   ```

4. Push a small change to `main` and check that the deploy job passes at https://github.com/aiacuone/rocket-rewards/actions
5. Remove the old public key line (comment `rocket-rewards-deploy`, the older one) from `~/.ssh/authorized_keys` on the VM, then rename the new files over the old ones locally.
