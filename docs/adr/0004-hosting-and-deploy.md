# 4. Hosting and deploy

Status: accepted

## Context

The app needs a server that is always on and runs Node, with a disk that keeps the SQLite file ([ADR 0001](0001-app-stack.md), [ADR 0002](0002-database.md)). It also needs https on a stable web address, because the camera needs https and every device opens the app by its address. Serverless hosts such as Netlify and Vercel are ruled out, because their disks do not persist.

An Oracle Cloud VM already runs two other apps, shtrong and price-tracker:

- **The VM:** 1 OCPU and 6 GB, on a Pay As You Go account that stays within the Always Free limits, so Oracle does not stop it when idle.
- **Serving:** systemd runs each app. Caddy serves each one over https with a Let's Encrypt certificate, on a DuckDNS name kept up to date by an updater on the VM.
- **Deploying:** a push deploys through GitHub Actions over SSH.
- **Backups:** shtrong backs up daily to Cloudflare R2.

## Options considered

### Option 1: Shared VM

Run the app on the existing VM next to shtrong and price-tracker, with the same setup and its own DuckDNS name.

- Everything is already in place: the GitHub Actions deploy, Caddy, the DuckDNS updater and the R2 backup.
- No new machine or bill.
- If the VM fails, three apps go down together.
- The children's data shares a machine with other apps.
- Only 1 OCPU and 6 GB, shared with price-tracker's browser-based checker.

### Option 2: Its own VM

A second Oracle VM with the same setup, running only this app.

- The children's data is on a machine of its own.
- The same pattern as the existing apps, and believed to fit within the Always Free allowance (not checked).
- A second VM to set up, keep patched and back up.

### Option 3: Fly.io

A Fly.io machine with a persistent volume for the SQLite file. Fly handles https, and deploys run through `flyctl`.

- No operating system to patch.
- New to all the existing apps.
- A monthly bill, roughly US$3–5 (not checked).
- Auto-stop must be turned off to keep it always on.

## Decision

We chose **Option 1: Shared VM**.

- It reuses everything already running: the GitHub Actions deploy, Caddy, the DuckDNS updater and the R2 backup.
- There is no new machine or bill.

The strongest alternative was Option 2, its own VM, to keep the children's data apart from the other apps.

## Consequences

- If the shared VM fails, this app, shtrong and price-tracker all go down together until it is restored.
- The children's names and photos live on the same machine as the other apps. A security hole in one app could expose the others, so each app should run as its own system user, with its data folder readable only by that user.
- The app shares 1 OCPU and 6 GB with the other apps, so it should stay light. Photo resizing in particular must not use much memory.
- It needs its own DuckDNS name, a Caddy site, a systemd service and a deploy workflow, following shtrong's. The Google sign-in redirect address uses that name.
- It must not depend on anything named after shtrong, so that deleting shtrong does not break it. It gets its own DuckDNS updater, deploys by its own name rather than `shtrong.duckdns.org`, and backs up to its own R2 bucket. Only the VM itself is shared. If the VM were deleted, this app would go with it.
- If the app outgrows the VM, moving it means copying the SQLite file and photos to a new host (Option 2).
