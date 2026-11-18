# Privacy: what the app stores and where it goes

Rocket Rewards is for one family's own use, and much of what it holds is about children. This page describes what the app does today, for anyone running or changing it. It is not a legal policy.

## What is stored

Everything is in one SQLite file on the app's server.

| About | What is kept |
| --- | --- |
| Grown-ups | Name and email from Google, the Google account id, and each signed-in device as a hashed session id. |
| The family | The PIN as a hash, the recovery email, the alert topic and the family's settings. |
| Invites | The invited email and when it was sent, used or cancelled. |
| Children | Name, rocket colour, chores and their status, star history, rewards, reward requests and messages from grown-ups. |
| Picture passcode | A hash of the three pictures, if one is set. |
| Rocket photo | A rebuilt 400 px image, if one is added. Hidden data in the original, such as location, is not kept. |

## Who can see it

- Only devices signed in to the family can see its data, and every query is limited to that family.
- Grown-up screens also need the shared PIN.
- Children's trips are open to anyone using a signed-in family device, unless the child has a picture passcode.
- Rocket photos are served only to signed-in devices in the family.
- Another family's data answers "not found".

## What leaves the server

| Service | What it receives | Why |
| --- | --- | --- |
| Google sign-in | The sign-in itself | Proves who a grown-up is. |
| Google Fonts | The device's network address, when it loads the fonts | The app's two fonts. |
| Gmail | The recipient's address and the message | Invites, recovery links and PIN reset codes. These never include children's names. |
| ntfy.sh | A general alert on the family's secret topic | Tells grown-ups something is waiting. Alerts contain no names or details. |
| Cloudflare R2 | A full copy of the database, including photos | Daily backups. |
| Oracle Cloud | Hosts the server and its disk | Runs the app. |

The app has no analytics or advertising, and its security policy lets it run only its own scripts.

## How things are deleted

| Action | What goes |
| --- | --- |
| Remove a child | Their trip, chore copies, stars, reward requests, passcode and photo. Shared chores and rewards stay. |
| Remove photo | The child's rocket photo. |
| Remove a grown-up | Their account and every device they signed in on. |

Deleted data stays in older backups until 14 newer copies replace it. That is about two weeks, or longer if the data rarely changes.

## Known gaps

- **Backups are not encrypted.** They contain children's names and photos, so the R2 bucket must stay private and its keys must stay out of git ([backup-and-restore.md](how-to/backup-and-restore.md)).
- **There is no "delete our family" button.** Removing everything needs work on the server.
- **Old invite rows keep the invited email**, even after an invite is cancelled or the grown-up is removed. They are used to count how many invites were sent.
