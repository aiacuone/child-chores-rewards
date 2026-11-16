# Architecture decision records

Each record explains one technical decision: the options, what was chosen, why, and what it costs. The register of decisions is issue #1.

## Key decisions

| ADR | Decision | Outcome |
| --- | --- | --- |
| [0001](0001-app-stack.md) | App stack | SvelteKit, one project running as a Node server |
| [0002](0002-database.md) | Database | One SQLite file on the server's disk (better-sqlite3 and drizzle) |
| [0003](0003-data-model-for-stars.md) | Data model for stars | An event log; balance and ranks are sums, undo deletes rows |
| [0004](0004-hosting-and-deploy.md) | Hosting and deploy | The shared Oracle VM, with its own DuckDNS name, service, deploy and R2 bucket |
| [0005](0005-google-sign-in-and-sessions.md) | Google sign-in and sessions | Copy of shtrong's sign-in code, with its own Google client and database sessions |
| [0007](0007-pin-and-grown-up-mode.md) | PIN and grown-up mode | Server-checked PIN, grown-up token kept in page memory, wrong-try lockout per family |
| [0009](0009-ntfy-alerts.md) | ntfy alerts | Public ntfy.sh, published by the server, no names or details, caching off |
| [0011](0011-photo-storage.md) | Photo storage | Inside the SQLite database, cropped and resized on the device |
| [0012](0012-backups.md) | Backups | Daily online backup to the app's own R2 bucket, 14 copies, not encrypted |

## Supporting choices

| ADR | Decision | Outcome |
| --- | --- | --- |
| [0006](0006-live-updates-between-devices.md) | Live updates between devices | Polling every few seconds and when the app comes back into view |
| [0008](0008-email-for-pin-reset-and-invites.md) | Email for PIN reset and invites | The owner's Gmail over SMTP with an app password |
| [0010](0010-daily-reset.md) | Daily reset | A job inside the app at the reset time, with catch-up on start, in Melbourne time |
| [0013](0013-installable-web-app.md) | Installable web app | Manifest and PNG icons only, no service worker |
| [0014](0014-styling.md) | Styling | Tailwind with the tokens as theme values, Bits UI for the date picker, dialogs and switches |
| [0015](0015-testing.md) | Testing | Vitest for the rules, Playwright for key flows and accessibility, before each deploy |
| [0016](0016-app-display-name.md) | App display name | Rocket Rewards, at rocket-rewards.duckdns.org |
| [0017](0017-grown-up-invites.md) | Grown-up invites | Invited Google emails join the family; everyone else is refused, with no server list after the first family |
