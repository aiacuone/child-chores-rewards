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
7. For a local `.env`, rebuild it from the secrets files. Gmail is included so a local run can send the recovery email link:

   ```
   { cat ~/.config/rocket-rewards/google.env; echo; cat ~/.config/rocket-rewards/gmail.env; echo; cat ~/.config/rocket-rewards/allowed.env; } | grep -v '^$' > .env
   chmod 600 .env
   ```

## The deploy key

The deploy key logs in as the `rocket-deploy` user ([vm-setup.md](../vm-setup.md#the-deploy-user)). The same steps set it up the first time and replace it later.

1. Make a new key pair:

   ```
   ssh-keygen -t ed25519 -N "" -C "rocket-deploy" -f /home/adrian/.config/rocket-rewards/rocket-deploy-new
   ```

2. Copy the script and the public half to the VM, and run the script. It makes the user if it is missing, installs the key in place of any old one, and sets the sudo rule:

   ```
   scp scripts/vm-deploy-user.sh ubuntu@shtrong.duckdns.org:
   scp /home/adrian/.config/rocket-rewards/rocket-deploy-new.pub ubuntu@shtrong.duckdns.org:rocket-deploy.pub
   ssh ubuntu@shtrong.duckdns.org 'sudo bash vm-deploy-user.sh rocket-deploy.pub'
   ```

3. Test the new key. It should print the service status, then "good: no general sudo":

   ```
   ssh -i /home/adrian/.config/rocket-rewards/rocket-deploy-new -o IdentitiesOnly=yes rocket-deploy@rocket-rewards.duckdns.org 'sudo -n /usr/bin/systemctl status rocket-rewards --no-pager | head -3; sudo -n true && echo "BAD: general sudo works" || echo "good: no general sudo"'
   ```

4. Replace the GitHub secret:

   ```
   gh secret set DEPLOY_SSH_KEY < /home/adrian/.config/rocket-rewards/rocket-deploy-new
   ```

5. Push a small change to `main` and check that the deploy job passes at https://github.com/aiacuone/rocket-rewards/actions
6. Clean up. Rename the new files over the old ones locally, and delete the copies on the VM:

   ```
   mv /home/adrian/.config/rocket-rewards/rocket-deploy-new /home/adrian/.config/rocket-rewards/rocket-deploy
   mv /home/adrian/.config/rocket-rewards/rocket-deploy-new.pub /home/adrian/.config/rocket-rewards/rocket-deploy.pub
   ssh ubuntu@shtrong.duckdns.org 'rm ~/vm-deploy-user.sh ~/rocket-deploy.pub'
   ```

### One-time cleanup of the old key

The first deploy key (comment `rocket-rewards-deploy`) logs in as `ubuntu`, which has full sudo. Once a deploy has worked with the new key, remove it:

```
ssh ubuntu@shtrong.duckdns.org "sed -i '/ rocket-rewards-deploy\$/d' ~/.ssh/authorized_keys"
```

Then delete the old private key, `/home/adrian/.config/rocket-rewards/github-deploy`, and its `.pub` file. Shtrong's own deploy key is a different key and is not touched.
