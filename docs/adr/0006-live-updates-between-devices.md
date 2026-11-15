# 6. Live updates between devices

Status: accepted

## Context

The kids' tablet shows states that change on another device. A stop reads "Grown-up checking" until a grown-up accepts it on their phone, and a sent-back chore or a declined reward shows the grown-up's message. The tablet has to notice these changes without anyone reloading.

The child is often not watching: a trip returns to Who's flying after 1 minute of no touches by default. Grown-ups are already alerted by ntfy, so this decision is about screens refreshing, not about notifications. The app is one SvelteKit server ([ADR 0001](0001-app-stack.md)) behind Caddy on the shared VM ([ADR 0004](0004-hosting-and-deploy.md)).

## Options considered

### Option 1: Polling

Each open screen asks the server for changes every few seconds, and again when the app comes back into view.

- Ordinary requests only: Caddy, restarts and deploys need nothing extra.
- Up to a few seconds' delay.
- A tablet left open keeps sending small requests all day.

### Option 2: Server-sent events

Each open screen keeps one connection to a SvelteKit route, and the server sends a short "changed" message when something changes in the family.

- Changes show instantly.
- Connections drop on deploys and when a device sleeps, and the browser has to reconnect.

### Option 3: WebSockets

A two-way socket between each screen and the server.

- Changes show instantly.
- Two-way messages are not needed, because the screens only listen.
- SvelteKit's Node adapter has no built-in WebSocket support, so it needs a custom server file.

## Decision

We chose **Option 1: Polling**.

- It is the simplest thing that works: ordinary requests, with nothing to reconnect.
- It is easier to maintain, since Caddy, restarts and deploys need nothing extra.
- The child is often not watching, so instant updates are worth less.
- It is easy to switch to server-sent events later.

The strongest alternative was Option 2, server-sent events, for instant updates.

## Consequences

- A change can take a few seconds to show on another device. Each screen should also check at once when the app comes back into view.
- Screens reload their data when told something changed, so only the "tell" part would change if we move to server-sent events later.
- The check should be cheap. For example, a single "last changed" value per family that the screen compares before fetching anything else, so a tablet left open all day costs little on the shared VM.
