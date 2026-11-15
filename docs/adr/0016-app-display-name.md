# 16. App display name

Status: accepted

## Context

The app needs a name that children and grown-ups see. It appears in:

- every screen's page title,
- the wordmark on Who's flying,
- the tablet's "Add to Home Screen" tip,
- the tablet sign-in screen and the ntfy alert header,
- the home-screen label ([ADR 0013](0013-installable-web-app.md)),
- the Google sign-in consent screen ([ADR 0005](0005-google-sign-in-and-sessions.md)),
- the web address ([ADR 0004](0004-hosting-and-deploy.md)).

The designs use "Chore Rockets". The spec's heading is a description ("Kids Chores & Rewards App"), not a name. The repo stays `child-chores-rewards`.

## Options considered

### Option 1: Chore Rockets

Keep the name the designs already use.

- Already in the wordmark, the tip and every screen title, so no design changes.
- Fits the space-trip theme.

### Option 2: A name we choose

A new name, with the designs updated to match. The candidates included Rocket Rewards, Starhop, Mission Chores, Blast Off Chores and Liftoff.

- A name we are fully happy with.
- The wordmark, the tip and every screen title change, in one rename pass.

### Option 3: A plain description

A descriptive name such as "Chores & Rewards".

- Close to the spec's own heading.
- Children may find it dull, and it needs the same rename pass.

## Decision

We chose **Option 2: A name we choose**, and the name is **Rocket Rewards**.

- It names the payoff, the rewards, rather than the chores.

The strongest alternative was Option 1, Chore Rockets, which needed no design changes.

The web address is **rocket-rewards.duckdns.org**, served over https by Caddy.

## Consequences

- The designs were renamed from "Chore Rockets" to "Rocket Rewards" in one pass: every page title, the "CHORE ROCKETS" wordmark, the tablet tip, the tablet sign-in screen, the ntfy alert header and the canvas title.
- The manifest, the Google consent screen and the alert sender name use "Rocket Rewards".
- The Google sign-in redirect address is https://rocket-rewards.duckdns.org/login/google/callback.
- Names were not checked for trademarks or app-store clashes, and "rocket-rewards" on DuckDNS still has to be claimed.
