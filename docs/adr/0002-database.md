# 2. Database

Status: accepted

## Context

The app needs somewhere to keep the family, children, chores, stars and rewards. It is one SvelteKit project running as a Node server ([ADR 0001](0001-app-stack.md)), so a database on that server's disk is possible.

Some changes must be saved together or not at all:

- taking a reward's cost off a child's stars when a grown-up confirms the claim,
- moving a chore and its stars to the right child ("That wasn't Mia").

All the options considered can do this. Photos are a separate decision.

## Options considered

### Option 1: SQLite file

One SQLite database file on the server's disk, used through better-sqlite3 and drizzle.

- Fast local reads and writes, so accepting and undoing feel instant.
- Can be backed up while the app is running.
- Already used with drizzle in todo, price-tracker and transcripts.
- One writer at a time, which is fine for one family.
- Ties the app to one server with a disk.

### Option 2: PGlite (embedded Postgres)

Postgres running inside the Node server, stored as a folder on disk, as shtrong does.

- Real Postgres types, such as time-zone-aware timestamps and JSON.
- Can switch to a full Postgres server later by setting a connection URL.
- Already running in shtrong with a tested backup.
- Young (not yet version 1.0, runs in WebAssembly, one connection at a time).
- Backups have to stop the app.
- Ties the app to one server with a disk.

### Option 3: Managed Postgres (Neon)

A hosted Postgres database that the server reaches over the internet.

- The provider handles backups and point-in-time restore.
- The app can move hosts without moving the data.
- Every query crosses the network, and free tiers sleep and wake slowly.
- Free tier limits.
- Children's names and data are held by another company.

### Option 4: Managed SQLite (Turso)

A hosted SQLite-compatible database on Turso.

- The provider handles backups.
- Same SQLite dialect, so it could move to a local file later.
- Every query crosses the network.
- Free tier limits, and a smaller, less proven vendor.
- Children's names and data are held by another company.

## Decision

We chose **Option 1: SQLite file**.

- Local reads and writes are fast, so accepting and undoing a chore feel instant.
- Being tied to one server is a small cost for a family app on a VM that already runs other apps.
- PGlite, the closest alternative, is young and not yet at version 1.0.

The strongest alternative was Option 2, PGlite, for real Postgres and the same setup as shtrong.

## Consequences

- The app needs a host with a persistent disk. That rules out serverless hosting such as Netlify or Vercel functions for the server side, and shapes the hosting decision.
- If the server is lost, the app is down until it is rebuilt and the latest backup restored. Backups have to be set up deliberately, and anything since the last backup would be lost.
- Only one write runs at a time. That is fine for one family, but long writes should be avoided.
- SQLite has fewer types than Postgres. Dates and times are stored as text or numbers, so time zones (for example for the 6:00 am reset) must be handled in code.
