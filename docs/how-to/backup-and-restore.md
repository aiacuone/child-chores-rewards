# Back up and restore the database

The app's data is one SQLite file on the VM. Every day at 3:00 am a timer copies it to the private R2 bucket `rocket-rewards-backups`, but only if the data changed, and keeps the newest 14 copies ([ADR 0012](../adr/0012-backups.md)). Up to a day of changes can be lost, including stars.

The scripts are in `scripts/backup/`. On the VM they become `rocket-rewards-backup` (the daily job) and `rocket-rewards-restore`.

## Install on the VM

Run this once, from your machine in the repo folder. It needs `/etc/rocket-rewards/r2.env` on the VM (made by `vm-setup.sh`).

1. Copy the folder over:

   ```
   scp -r scripts/backup ubuntu@shtrong.duckdns.org:rocket-rewards-backup-install
   ```

2. Install it. This sets up the daily timer and runs a first backup:

   ```
   ssh -t ubuntu@shtrong.duckdns.org 'sudo bash rocket-rewards-backup-install/install.sh'
   ```

3. Delete the copy:

   ```
   ssh ubuntu@shtrong.duckdns.org 'rm -r rocket-rewards-backup-install'
   ```

Run the same steps again to update the scripts. It is safe to repeat.

## Check that backups are happening

- On the VM, see the last runs and the next one:

  ```
  ssh ubuntu@shtrong.duckdns.org 'journalctl -u rocket-rewards-backup -n 20 --no-pager -o cat; systemctl list-timers rocket-rewards-backup.timer --no-pager'
  ```

  "uploaded rocket-rewards-....db.gz" means a copy was sent. "no changes since the last upload" is normal on a quiet day.

- In Cloudflare, open https://dash.cloudflare.com (sign-in needed), then R2, then `rocket-rewards-backups`, and look in the `db/` folder.

## Prove a restore works (into a copy)

Do this after installing, and now and then after that. The live app is not touched.

```
ssh -t ubuntu@shtrong.duckdns.org 'sudo rocket-rewards-restore'
```

It downloads the latest backup, checks it, and prints the rows per table in the backup next to the live database. The numbers should be the same or close. Then delete the copy:

```
ssh ubuntu@shtrong.duckdns.org 'sudo rm /var/lib/rocket-rewards-backup/restore-test.db'
```

To try a particular backup, add its name from the bucket, for example `sudo rocket-rewards-restore rocket-rewards-20261116T170000Z.db.gz`.

## Restore for real (replace the live database)

Only if the live data is lost or broken. Everything since that backup is lost.

1. Run it in a terminal:

   ```
   ssh -t ubuntu@shtrong.duckdns.org 'sudo rocket-rewards-restore --live'
   ```

   It stops the app, asks you to type `RESTORE`, moves the current database aside as `rocket-rewards.db.before-restore-<time>`, puts the backup in, and starts the app. Add a backup name to pick an older one.

2. Open https://rocket-rewards.duckdns.org and sign in. If the backup is older than the current code, the app brings the database up to date when it starts (see [migrations.md](migrations.md)).

3. To undo, stop the app, move the `before-restore` files back over `rocket-rewards.db`, and start it again.

## Things to know

- **The backups are not encrypted.** They hold the children's names, photos and emails. The bucket must stay private, with no public `r2.dev` URL, and its keys must stay off git.
- If the R2 keys change, update `r2.env` as in [rotate-secrets.md](rotate-secrets.md). The backup reads the file on every run, so nothing needs restarting.
- A backup that fails its integrity check is not uploaded, and the run fails, so check the journal if you stop seeing new copies.
- Test the scripts on your machine, with no keys, using `bash scripts/backup/test-local.sh`. It needs `rclone`.
