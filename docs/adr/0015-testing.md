# 15. Testing

Status: accepted

## Context

The app is full of time-based rules that are easy to get subtly wrong:

- repeat schedules,
- the 1-minute undo windows,
- the daily reset with catch-up in Melbourne time ([ADR 0010](0010-daily-reset.md)),
- the daily bonus,
- wrong-PIN waits ([ADR 0007](0007-pin-and-grown-up-mode.md)),
- star sums from the event log ([ADR 0003](0003-data-model-for-stars.md)).

Accessibility is part of the spec, and the user flows are listed in `design/FLOWS.md`. A push to `main` deploys ([ADR 0004](0004-hosting-and-deploy.md)). Among the existing apps, most have no tests, price-tracker uses Node's test runner, and food-converter uses Vitest.

## Options considered

### Option 1: Unit tests for the rules

Vitest tests for the server-side rules, run locally and in GitHub Actions before each deploy.

- The time-based rules are tested with fixed dates and times.
- Vitest is already used in food-converter and fits SvelteKit's Vite setup.
- Screens and flows are still checked by hand.

### Option 2: Unit and end-to-end tests

Option 1, plus Playwright tests that click through key flows in a real browser, with automatic accessibility checks.

- Catches broken screens and flows, not just rules.
- Accessibility checks run automatically.
- Key flows from `FLOWS.md` are clicked through end to end.
- Playwright is new to the existing apps and needs browsers in GitHub Actions.
- End-to-end tests take longer to write and keep working as screens change.

### Option 3: Manual testing only

No automated tests.

- Nothing to set up.
- Time-based rule bugs are hard to catch by hand and would show up in front of the children.

## Decision

We chose **Option 2: Unit and end-to-end tests**.

- It catches broken screens and flows, not just rules.
- Accessibility checks run automatically.
- The key flows in `FLOWS.md` are clicked through end to end.

The strongest alternative was Option 1, unit tests for the rules only, which is less to write and maintain.

## Consequences

- Rules live in plain functions that take the current time as an input, so Vitest can test them at fixed dates and times, including Melbourne daylight-saving changes.
- Playwright covers a handful of key flows, not every screen, for example:
  - a child finishes a chore and a grown-up accepts it,
  - a reward is claimed and handed out,
  - grown-up mode locks,
  - a wrong PIN locks the pad.
- Accessibility checks (for example axe) run on the main screens in those tests.
- GitHub Actions runs both suites before deploying, so a failing test blocks the deploy. End-to-end runs need browsers installed in CI, which makes them slower than the unit tests.
- Playwright tests need a way to sign in without Google, such as a test-only sign-in available only in the test build.
