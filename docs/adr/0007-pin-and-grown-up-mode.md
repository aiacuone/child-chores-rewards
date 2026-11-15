# 7. PIN and grown-up mode

Status: accepted

## Context

Grown-up mode is protected by a shared 4-digit PIN, so a child cannot be left with grown-up powers. The rules from the spec and screens:

- Grown-up screens always need the PIN, on any device.
- One PIN entry covers a window that locks after 1, 2 or 5 minutes without touches, with a "Locking soon" warning.
- Closing the app always locks grown-up mode. The Auto-Lock screen describes it as "Always on, so children can't find it unlocked".

The kids' tablet is signed in with a grown-up's Google account ([ADR 0005](0005-google-sign-in-and-sessions.md)). So unless the server checks the PIN, the tablet could do anything a grown-up can. In every option the PIN is stored hashed.

## Options considered

### Option 1: Window on the server session

The server checks the PIN and marks the device's session as grown-up until a set time, extended by each grown-up action.

- The server enforces the PIN.
- One extra column on the session table copied from shtrong.
- A page refresh keeps grown-up mode.
- The window outlives closing the app, so reopening it within the window is still unlocked.

### Option 2: Token in page memory

The server checks the PIN and returns a short-lived grown-up token whose expiry slides with activity. The page keeps it only in memory and sends it with grown-up actions.

- The server enforces the PIN.
- Closing or reloading the app loses the token, so closing the app always locks it.
- Moving between pages keeps grown-up mode, because the app does not reload.
- A page refresh mid-task asks for the PIN again.

### Option 3: Device-only

The browser checks the PIN, and the server lets any signed-in device do grown-up actions.

- The server does not enforce the PIN, so the tablet's session could approve chores and claims without it.
- Changing and resetting the PIN still need the server.

## Decision

We chose **Option 2: Token in page memory**.

- Closing the app always locks it, so a child who reopens it cannot get grown-up mode.
- The server refuses grown-up actions without the PIN.
- Moving between pages keeps grown-up mode, and only a real restart asks again.

The strongest alternative was Option 1, a window on the server session, which keeps grown-up mode through a refresh but stays unlocked if the app is reopened within the window.

## Consequences

- The token lives only in page memory. It is never put in a cookie, local storage or session storage. A refresh, a reopened app, a tapped ntfy alert, or a reload after a deploy all ask for the PIN again.
- Grown-up requests carry the token, and the server checks it against a hashed copy with an expiry. Touching the screen or tapping "Keep going" must extend that expiry, because the on-screen countdown runs on touches.
- Wrong PINs are limited per family, not per device:
  - after 5 wrong tries the pad locks for 30 seconds, then 1, 5 and 15 minutes,
  - the right PIN resets the count,
  - "Forgot PIN?" still works while the pad is locked,
  - each emailed reset code allows 5 wrong tries before it is cancelled,
  - every grown-up gets an ntfy alert when the pad first locks.
  
  These rules are in the spec, and the screen states need designing.
- If asking again after a refresh proves annoying, the token could move to session storage. That survives a refresh, but some phones restore it with closed tabs, which weakens "closing the app always locks".
