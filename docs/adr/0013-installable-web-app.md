# 13. Installable web app

Status: accepted

## Context

The kids' tablet shows a one-time tip: "use 'Add to Home Screen' so Chore Rockets opens full screen". The app is a web app, not a store install. Firefox on Android shows a site's own icon on the home screen only when the site has a manifest, PNG icons and a registered service worker. The owner's other apps hit this in October 2026, and todo's files fixed it. The screens get live data by polling ([ADR 0006](0006-live-updates-between-devices.md)), and grown-up actions need the server ([ADR 0007](0007-pin-and-grown-up-mode.md)).

## Options considered

### Option 1: Manifest and a small service worker

A web manifest, PNG icons, and a small service worker copied from todo that caches no data and could show an offline page.

- Firefox on Android shows the app's real icon.
- Opens full screen, as the tablet tip promises.
- The service worker is an extra file whose request handling does nothing for the app itself: it exists for the browser's install check.

### Option 2: Manifest only

A web manifest and PNG icons, with no service worker.

- Opens full screen, as the tablet tip promises.
- Less to set up.
- Firefox on Android may show the generic icon, as it did for the other apps.

### Option 3: Full offline

The service worker caches the app and today's data, and queues children's taps while offline.

- Works without Wi-Fi for children's screens.
- Grown-up actions still need the server.
- Caching data and queueing changes is new, tricky, and can go stale or clash with what a grown-up did meanwhile.

## Decision

We chose **Option 2: Manifest only**.

- It is slightly less to set up.
- A service worker is an extra moving part that does nothing for the app itself, only for the browser's install check.

The strongest alternative was Option 1, a manifest and a small service worker, for the real icon in Firefox.

## Consequences

- The manifest sets the name, PNG icons, the dark theme colours and full-screen display, so "Add to Home Screen" opens without the browser bar.
- In Firefox on Android the home-screen shortcut may show a generic icon. If that matters on the tablet, todo's small service worker can be added later without changing anything else.
- With no Wi-Fi the tablet shows the browser's own error page, not a page in the app's style.
- No data or photos are cached on devices.
