# 10. Daily reset

Status: accepted

## Context

At the daily reset time, Completed and Skipped chores that are due again go back to Pending. The default is 6:00 am, and grown-ups can change it under "Daily reset and bonus". Skips run until a given day ("Back tomorrow at 6:00 am"), and children see later chores under "Coming up". Stars are an event log ([ADR 0003](0003-data-model-for-stars.md)), so the reset never touches stars.

The spec did not say which time zone the reset time means. The VM's clock may run on UTC, where 6:00 is mid-afternoon in Melbourne.

## Options considered

### Option 1: A job inside the app (wipe at 6:00)

A timer in the Node process runs at the reset time and sets finished chores back to Pending.

- The reset is one clear moment that can be logged and checked.
- Easy to picture: the day's ticks are wiped each morning.
- A restart or deploy at the reset time would skip it, unless the app catches up on start.

### Option 2: Worked out when needed (a new page each day)

Each status is stored per child per "chore day", and screens show today's chore day. Nothing runs at the reset time.

- Nothing can be missed.
- Skips, "Coming up" and history are date lookups.
- Every screen has to work out which chore day it is.

### Option 3: A VM timer

A systemd timer on the VM calls the app's reset route at the reset time.

- Another moving part on the VM, outside the repo, that must follow the reset time set in Settings.
- Still misses a run if the VM is down.

For the time zone, the options were the first grown-up's device at setup, Melbourne time for everyone, or a picker in Settings.

## Decision

We chose **Option 1: A job inside the app**, using **Melbourne time** for everyone.

- The reset is one clear moment that can be logged and checked.
- The whiteboard model, where the day's ticks are wiped each morning, is easier to picture than a page per day.
- The family is in Melbourne, so one fixed time zone is simplest.

The strongest alternative was Option 2, worked out when needed, because nothing can be missed.

## Consequences

- The app must catch up on start. It records when it last reset, and if a reset time has passed since then (for example during a restart or deploy), it resets straight away.
- Changing the reset time in Settings reschedules the job.
- Every time is worked out in Australia/Melbourne, including across daylight-saving changes, never in the server's local time.
- A family elsewhere would see resets at Melbourne's 6:00, so a time zone setting would be needed if the app were ever used outside Melbourne.
- Each reset is logged, so a missed or late reset can be spotted.
