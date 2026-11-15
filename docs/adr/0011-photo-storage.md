# 11. Photo storage

Status: accepted

## Context

Children can put a photo in their rocket's window, and grown-ups can use their own photos for chores and rewards. The spec's rules:

- photos show on every signed-in device,
- they are deleted with their chore, reward or child,
- if a photo is missing or fails to load, the built-in icon or planet shows instead.

The photo screen says "Only your family can see it".

Some things are the same in every option:

- photos are cropped and resized on the device before upload, using the designed "Move and zoom" screens, which keeps the shared VM light ([ADR 0004](0004-hosting-and-deploy.md)),
- the server checks each photo's type and size,
- photos are shown only through an app route that checks the family session.

There are about 35 photos at roughly 30–80 KB each, so about 1–3 MB in total (an estimate). Data is in SQLite ([ADR 0002](0002-database.md)).

## Options considered

### Option 1: Files on the VM

Photos are saved as files in a folder next to the database.

- Easy to serve with browser caching.
- A folder backs up to R2 with tar and rclone, as shtrong does.
- The folder and the database are backed up at different moments, so a restore could show an icon instead of a photo.

### Option 2: Inside the database

Each photo is stored as a binary value in the SQLite database.

- One file holds the data and the photos, so one backup copies both together.
- Deleting a chore, reward or child removes its photo in the same step.
- The database file grows with photos.

### Option 3: Cloudflare R2

Photos go to a private R2 bucket and are shown through short-lived signed links.

- Photos live off the VM as soon as they are uploaded.
- Anyone holding a signed link can open the photo until it expires, without the family check.
- Links expire, so a tablet left open can show the fallback.
- New code for R2's API and signed links.

## Decision

We chose **Option 2: Inside the database**.

- One file holds the data and the photos, so one backup copies both together.
- Removing a chore, reward or child always removes its photo too, with no leftover files.
- The photos are only a few MB, so the database growing does not matter.

The strongest alternative was Option 1, files on the VM, for plain files and easy caching.

## Consequences

- Photos live in their own table and are loaded only when shown, never with ordinary lists, so lists stay fast.
- The photo route sends caching headers keyed to the photo's version, so devices do not download the same photo again.
- Backups of the database include the photos. They are children's photos, so backups need the same care as the live data.
- The server limits upload size, so one bad upload cannot bloat the database.
