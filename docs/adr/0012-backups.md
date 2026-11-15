# 12. Backups

Status: accepted

## Context

One SQLite file holds all the app's data, including the children's photos ([ADR 0011](0011-photo-storage.md)). It can be backed up while the app runs ([ADR 0002](0002-database.md)). The app runs on a shared VM and backs up to its own R2 bucket, with nothing named after shtrong ([ADR 0004](0004-hosting-and-deploy.md)). If the VM is lost, a backup is the only way back.

Stars are an event log ([ADR 0003](0003-data-model-for-stars.md)), so any changes lost since the last backup include stars.

shtrong already has a proven pattern:

- a daily timer runs a backup script,
- the copy goes to Cloudflare R2 with rclone, only when the data changed,
- the last 14 copies are kept,
- a restore script has been tested.

R2's free tier is 10 GB stored.

## Options considered

### Option 1: Daily backup to R2

A daily timer takes an online SQLite backup, uploads it to the app's own R2 bucket with rclone if it changed, and keeps 14 copies. A restore script is tested.

- shtrong's proven pattern, without stopping the app.
- Uses the app's own R2 bucket and backs up while the app runs.
- Up to a day of changes can be lost, including stars.

### Option 2: Litestream

Litestream runs beside the app and streams every change to R2 within seconds.

- Only seconds of changes can be lost.
- A new tool and background service that none of the existing apps uses. Its R2 support and free-tier write counts were not checked.

### Option 3: Oracle volume backups

Snapshots of the VM's whole disk, kept by Oracle.

- Not the app's own R2 bucket, and lost if the Oracle account goes.
- Backs up the whole shared disk, not just this app.
- Still needs a custom policy or script to stay within five free copies.

## Decision

We chose **Option 1: Daily backup to R2**.

- It is shtrong's proven pattern, without the app stop.
- It uses the app's own R2 bucket and backs up while the app runs.
- Losing up to a day of changes is acceptable for a family app.

The strongest alternative was Option 2, Litestream, to lose only seconds of changes.

We also chose not to encrypt the backups before upload: a private R2 bucket is enough.

## Consequences

- Anything since the last daily backup is lost if the VM is lost, including that day's stars and photos.
- The backups hold the children's names and photos unencrypted, so the R2 bucket must stay private and its keys must stay off git, in the app's root-only secrets file on the VM. Anyone with the R2 keys or the Cloudflare account can read them.
- Backups follow the app's data. A deleted child stays in older backups until they age out after 14 days.
- The restore script must be tried once, restoring into a copy and checking it, before the backup counts as working, as shtrong did.
