# Change who can start the first family

`ALLOWED_EMAILS` only decides who may create the first family. To add a grown-up to a family, use Settings, Grown-ups, Invite a grown-up instead; nothing on the VM changes. The list lives in two places, and both must match:

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

## Things to know

- **Once a family exists, the list lets nobody new in.** Everyone else joins by invite.
- **Removing an email does not sign anyone out.** To remove a grown-up, the owner uses Settings, Grown-ups.
- An empty or missing list lets nobody in.
