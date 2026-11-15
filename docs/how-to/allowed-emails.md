# Add or remove an allowed grown-up

Only Google emails in the `ALLOWED_EMAILS` setting can sign in. The list lives in two places, and both must match:

- `~/.config/rocket-rewards/allowed.env` on your machine. `scripts/vm-setup.sh` rebuilds the VM's file from it.
- `/etc/rocket-rewards/app.env` on the VM, which is what the running app reads.

The format is one line, with emails separated by commas:

```
ALLOWED_EMAILS=mum@example.com,dad@example.com
```

## Change the list

1. Edit `~/.config/rocket-rewards/allowed.env` on your machine.
2. Log in to the VM:

   ```
   ssh ubuntu@shtrong.duckdns.org
   ```

3. Edit the VM's file. There must be exactly one `ALLOWED_EMAILS` line, so change it in place and delete any duplicate:

   ```
   sudo nano /etc/rocket-rewards/app.env
   ```

4. Restart the app:

   ```
   sudo systemctl restart rocket-rewards
   ```

5. Check by signing in at https://rocket-rewards.duckdns.org with the new account.

## Things to know

- **Each new email starts its own family.** Invites are not built yet, so a second grown-up who signs in does not join your family. Add only the accounts that should have a family of their own, until invites exist.
- **Removing an email blocks new sign-ins only.** Devices already signed in stay signed in until their session ends (up to 60 days). To cut someone off now, delete their sessions on the VM, if `sqlite3` is installed there:

  ```
  sudo sqlite3 /var/lib/rocket-rewards/rocket-rewards.db "delete from session where user_id = (select id from user where email = 'their@email.com')"
  ```

- An empty or missing list lets nobody in.
