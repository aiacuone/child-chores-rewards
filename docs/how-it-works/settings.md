# How Settings works

The Settings tab holds the family's choices (docs/SPEC.md, "Settings"; Settings, Auto-Lock, Auto-Return, Daily-Reset, Notifications, Ntfy and Devices screens). The values are columns on `family`. `src/lib/server/settings.ts` reads and saves them, and `src/lib/settings.ts` lists the allowed values and their wording.

## The pages

| Page | Screen | Does |
| --- | --- | --- |
| `/grown-up/settings` | Settings | The rows, each with its current value. |
| `/grown-up/settings/pin` | Not designed (agreed in #31) | Change the PIN: current PIN, new PIN, type it again. |
| `/grown-up/settings/recovery` | Recovery | [recovery-email.md](recovery-email.md). |
| `/grown-up/settings/devices` | Devices | The signed-in account and the two sign-out buttons. |
| `/grown-up/settings/auto-lock` | Auto-Lock | 1, 2 or 5 minutes. Saves on tap. |
| `/grown-up/settings/auto-return` | Auto-Return | 30 seconds, 1 minute or 2 minutes. Saves on tap. |
| `/grown-up/settings/notifications` | Notifications | The two alert switches and the three locked safety alerts. |
| `/grown-up/settings/notifications/ntfy` | Ntfy | The topic and a test alert. |
| `/grown-up/settings/daily-reset` | Daily-Reset | Reset time in half-hour steps, and the bonus from 5 to 100 in fives. |

The Children row opens [children.md](children.md). Temporary fix: the Grown-ups row says "Coming soon" until #33.

## What each setting changes

| Column | Default | Used by |
| --- | --- | --- |
| `auto_lock_minutes` | 2 | `tokenLife` in `grownup.ts`, and the bar through `grownup.autoLock`. |
| `auto_return_seconds` | 60 | The trip layout passes it to `StillThere`. |
| `reset_minutes` | 360 | `familyDay`, so every server rule uses the family's own chore day. Pages use `grownupToday`. |
| `daily_bonus` | 20 | `settleBonus` for new bonuses, and the trip's wording. Bonuses already earned keep their amount. |
| `alert_chores`, `alert_rewards` | on | "I did it!" and Claim check them before alerting. Safety alerts never do. |

`updateSettings` raises `family.version`, so open trips reload and pick up the change ([live-updates.md](live-updates.md)). A new unlock brings the auto-lock and reset time to the page, and a save updates them there. Another device already in grown-up mode shows the new values after its next unlock, although the server applies a new auto-lock at its next request.

## The API

All routes need a grown-up token.

| Route | Does |
| --- | --- |
| `GET /api/grown-up/settings` | The settings, the masked sign-in and recovery addresses, and the topic. |
| `PUT /api/grown-up/settings` | Saves any of the settings. `parseSettings` refuses other values and unknown fields. |
| `POST /api/grown-up/settings/test-alert` | Sends the test alert. |
| `POST /api/grown-up/pin` | Changes the PIN. |
| `POST /api/grown-up/devices` | `{ "scope": "others" }` or `{ "scope": "this" }`. |

## Security

- **Change PIN** needs the current PIN through `pinRefusal`, so wrong tries count towards the pad's lock. `changePin` then ends every other grown-up token in the family and keeps this one.
- **Sign out all other devices** deletes every other session of every grown-up in the family, and their grown-up tokens go with them. Other families are not touched.
- **The topic** is only returned to a grown-up token, because anyone who knows it can read the alerts.

## What happens when

| Situation | What happens |
| --- | --- |
| The reset time moves to before now | The chore day moves on, and the reset job runs within a minute. |
| The reset time moves to after now | It is the previous chore day again until the new time. That day's reset does not run twice. |
| The bonus changes after one was earned today | The earned one stays. The child cannot earn a second that day. |

## Tests

- `src/lib/server/settings.test.ts`: defaults, family scope, the chore day, the reset, the bonus, token life, bad input, Change PIN and signing out devices.
- `e2e/settings.test.ts`: every row, the locked switches, a shorter return time, and refusals without a token or from another family.
