# 9. ntfy alerts

Status: accepted

## Context

Grown-ups get phone alerts through ntfy. The spec already settles how:

- alerts use the public ntfy.sh server, with no own server and no extra password,
- the app publishes to a long random topic over HTTP,
- the topic is shown only in grown-up mode, so the app's server publishes, never the kids' tablet.

Anyone who learns the topic can read the alerts, and the Ntfy settings screen warns about this. The family's data, including the children's names, should stay private. Tapping an alert opens the PIN screen and then goes straight to that chore or reward, so the details are always one PIN away.

The open question was what the alerts say. The designed alerts include the child's name and details, for example "Mia finished a chore. Tidy the toy box is waiting for you to check."

## Options considered

### Option 1: As designed

Alerts use the designed wording, with the child's name, the chore or reward, and the masked recovery email.

- Matches the designed alert screens word for word.
- You can tell from the lock screen what is waiting and for whom.
- Children's names and routines can be read by anyone with the topic.

### Option 2: Name only

Alerts give the child's name but no chore, reward or email.

- Still says which child.
- Children's names still leave the app.
- Changes the designed wording.

### Option 3: No names or details

Alerts say what kind of thing happened and nothing personal, for example "A chore is waiting for you to check".

- Nothing private leaves the app.
- Changes the designed wording.
- To see which child and what, a grown-up taps the alert and enters the PIN.

## Decision

We chose **Option 3: No names or details**.

- The children's privacy is a ground rule, so nothing personal should leave the app, even if the topic leaks.
- Tapping the alert still goes straight to the chore or reward after the PIN, so little is lost.

The strongest alternative was Option 1, as designed, for seeing the child and chore on the lock screen.

## Consequences

- Alert wording changes from the designs. The spec now lists the wording, and the alert screens (Parent-Notification, Notif-Claim, Notif-Reset) need updating to match.
- Alerts carry a link to the chore or reward by its ID only. The ID reveals nothing on its own.
- Messages are sent with ntfy caching turned off (`Cache: no`), so a late subscriber cannot read old alerts. It is believed, but not checked, that ntfy.sh otherwise keeps messages for about 12 hours.
- The topic must be long and random. The Notifications screen's sample topic is short, and its design should show a longer one.
