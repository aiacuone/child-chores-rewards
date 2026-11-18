# Rocket Rewards

A kids chores-and-rewards web app (ages 5 to 12) for one family. Children fly a rocket along a trip of chores, a grown-up checks each one, and finished chores earn stars that buy rewards.

This repo holds the app, its design and its spec.

## Tech stack

| Part | Tool | Why |
| --- | --- | --- |
| App | [SvelteKit](https://svelte.dev/docs/kit), Svelte 5 and TypeScript, running on Node | [ADR 0001](docs/adr/0001-app-stack.md) |
| Database | SQLite, with better-sqlite3 and Drizzle | [ADR 0002](docs/adr/0002-database.md) |
| Styling | Tailwind CSS, using the design tokens | [ADR 0014](docs/adr/0014-styling.md) |
| Sign-in | Google sign-in | [ADR 0005](docs/adr/0005-google-sign-in-and-sessions.md) |
| Input checks | Zod | Server checks for forms and API requests |
| Photos | sharp, with photos stored in SQLite | [ADR 0011](docs/adr/0011-photo-storage.md) |
| Email | Gmail through Nodemailer | [ADR 0008](docs/adr/0008-email-for-pin-reset-and-invites.md) |
| Alerts | ntfy | [ADR 0009](docs/adr/0009-ntfy-alerts.md) |
| Backups | Cloudflare R2 through rclone | [ADR 0012](docs/adr/0012-backups.md) |
| Tests | Vitest, Playwright and axe | [ADR 0015](docs/adr/0015-testing.md) |
| Hosting | An Oracle VM with systemd and Caddy, deployed by GitHub Actions | [ADR 0004](docs/adr/0004-hosting-and-deploy.md) |

## Where things are

- `docs/how-to/local-setup.md`: run the app on your own machine
- `docs/privacy.md`: what the app stores about a family, and where it goes
- `docs/SPEC.md`: rules and decisions
- `design/screens/`: every screen as a standalone HTML file
- `design/FLOWS.md`: the user flows, screen by screen
- `design/TOKENS.md`: colours, fonts and sizes
- `docs/adr/`: why each technical decision was made
- [`docs/how-it-works/`](docs/how-it-works/README.md): how each part of the code fits together
- `CLAUDE.md`: instructions for Claude Code
