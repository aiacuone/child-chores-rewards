# Rocket Rewards: Spec and Decisions

The app's display name is **Rocket Rewards**, at https://rocket-rewards.duckdns.org.

A family app where children finish chores, grown-ups approve them, and approved chores earn stars and rewards. This document records the rules behind the screens so the build does not depend on chat history. The screens are in `design/screens/` and the flows are listed in `design/FLOWS.md`.

## Overview

- **Web app** used on several devices: the grown-up's phone and the children's tablet. No installs.
- **Two roles:** children pick their name on "Who's flying?" and see their own trip. Grown-ups enter grown-up mode with a PIN and see everything.
- **Core loop:** a child taps "I did it!", the chore shows "Grown-up checking", and a grown-up accepts it. Only then is it Completed and the stars are earned.
- **Grown-up tabs:** Home, Chores, Rewards, Ranks, Settings.
- **Style:** Space trip theme, dark. Lilita One headings, Nunito body, touch targets of at least 44 px, phone boards 390 x 844. See `design/TOKENS.md`.

## Chores

The Chores tab is a library of every chore, including ones nobody is assigned to. Each child a chore is assigned to gets their own copy, with its own status.

| Status | Meaning | Who sets it |
| --- | --- | --- |
| Pending | Due and not done yet | Automatic |
| Waiting for grown-up | Child tapped "I did it!"; needs approval | Child |
| Completed | Grown-up accepted it | Grown-up (Accept) |
| Skipped | Excused, no penalty | Grown-up |

- **Two children, same chore:** each child has a separate row and status. One finishing does not complete the other's.
- **Filters:** one row of five chips that fits the screen with no scrolling, including Unassigned.
- **Assigning:** a grown-up assigns or unassigns each child from the chore itself.
- **Hide:** a hidden chore disappears from children's screens. Grown-ups still see it (marked Hidden) and can unhide it.
- **Skip:** a grown-up can excuse a chore for today, or for several days (today only, 2 days, 3 days, a chosen date, or until turned back on). It reads Skipped and does not count as missed.
- **Chore actions:** Complete for the child; Edit, Remove, Skip and Hide for grown-ups.
- **Compact rows:** the chore list uses compact rows so a long list scrolls less.

## Repeating chores

Each chore has its own schedule, chosen on the Edit chore screen. Every chore resets at one shared daily time, 6:00 am by default. A chore has no time of day of its own.

| Repeat | Behaviour |
| --- | --- |
| Daily | Due every day |
| Weekly | Due on the days the grown-up picks |
| Monthly | Due on a chosen day of the month |
| Custom | Due every set number of days or weeks |
| Once | Due on one date, then never again |

- **Not due today:** a chore that is not due does not appear on the child's trip. Children see a "Coming up" section for chores due on later days.
- **Daily reset:** at the reset time, Completed and Skipped chores that are due again return to Pending. Set in Settings under "Daily reset and bonus".
- **Time zone:** all times, including the reset time, are Melbourne time (Australia/Melbourne), whatever the server's clock or the device's settings.
- **Chore day:** before the reset time it is still the day before, so at 3:00 am Tuesday Monday's chores are showing.
- **Picking the schedule** (decided in #21; only Weekly is designed):
  - Weekly: the day buttons M T W T F S S. At least one day must be ticked.
  - Monthly: a − day + stepper, 1st to 31st. In a month without that day it is due on the last day (the 31st falls on 30 November).
  - Custom: an "Every − 2 +" stepper (1 to 30) with a Days / Weeks switch, counted from the day it is saved. Changing only the name, picture, stars or children keeps the count.
  - Once: buttons for today and the next 6 days (Today, Tomorrow, Thu …). The chore stays in the library after its day and is never due again.
- **Labels:** "Every day", "Mon, Wed, Fri", "Monthly, on the 15th", "Every 3 days", "Every 2 weeks", "Once, Sunday" (or "Once, 3 Dec" once the day is more than a week away). Saving a new schedule shows "Saved · now repeats …".

## Grown-up mode and PIN

Grown-up mode is protected by a PIN and locks itself, so a child cannot be left with grown-up powers.

- **Entering:** tap "I'm a grown-up" on Who's flying and enter the PIN. All grown-ups share one PIN.
- **Always visible:** a bar shows on every grown-up screen while grown-up mode is on, with the time left ("locks in 1:52").
- **Auto-lock:** grown-up mode locks after 1, 2 or 5 minutes of no activity. The default is 2 minutes. A short warning appears before it locks. One PIN entry covers the whole window, so several chores can be checked with one PIN.
- **App closed:** closing the app always locks grown-up mode.
- **Recovery email:** set in advance in Settings while in grown-up mode. Any address works, not only the sign-in email. A new address is verified by a link, and changing it needs the current PIN. The old address stays in use until the new one is confirmed.
- **Forgot PIN:** the screen shows the recovery email partly hidden (for example j•••@example.com). It emails a one-time 6-digit code, never the PIN itself, and only to that address. The code leads to a "Set a new PIN" screen.
- **Wrong PIN:** a wrong PIN shows "Wrong PIN, try again." After 5 wrong tries in a row the PIN pad locks with a countdown ("Try again in 0:30"): 30 seconds, then 1 minute, then 5 minutes, then 15 minutes for every further wrong try. The count is per family, not per device, and the right PIN resets it. "Forgot PIN?" still works while the pad is locked.
- **Wrong reset code:** each emailed code allows 5 wrong tries. After that it is cancelled and a new code has to be sent.
- **Safety alerts:** every grown-up gets an ntfy notification when a reset code is sent, when the recovery email is changed, and when the PIN pad first locks after wrong tries (once per run of wrong tries).

## Notifications with ntfy

Grown-ups get push alerts through ntfy, which has apps for iOS, Android and desktop. The app publishes to a topic over HTTP; grown-ups subscribe to that topic in the ntfy app.

| Alert | Sent to | Can be turned off |
| --- | --- | --- |
| Chore waiting for approval | Every grown-up | Yes |
| Reward claimed | Every grown-up | Yes |
| PIN reset code sent | Every grown-up | No, always on (locked switch) |
| Recovery email changed | Every grown-up | No, always on (locked switch) |
| PIN pad locked after wrong tries | Every grown-up | No, always on (locked switch) |

- **Topic name is a secret:** topics on the public ntfy.sh server can be read and published to by anyone who knows the name. The app generates a long random topic name and shows it only in grown-up mode. There is no extra password or own server.
- **Setup flow:** Settings > Notifications > ntfy shows the topic, a Send test button and a Subscribe step.
- **Tapping an alert:** opens the app at the PIN screen, and then directly at that chore's (or reward's) check screen.
- **No names or details in alerts:** alerts pass through the public ntfy.sh server, so they say only what kind of thing happened: "A chore is ready to check" (body "A chore is waiting. Open Rocket Rewards to take a look."), "A reward was claimed" (body "A child wants a reward. Open Rocket Rewards to hand it out."), "PIN reset code sent" (body "A PIN reset code was sent. If this wasn't you, open the app and change the PIN."), "PIN pad locked" (body "Too many wrong PIN tries. The PIN pad is locked for 30 seconds.") No child names, chore or reward names, or email addresses. Tapping the alert shows the details after the PIN. Messages are sent with ntfy caching turned off (`Cache: no`).

## Settings

Settings is a grown-up-only tab. Rows:

| Row | What it controls |
| --- | --- |
| Children | Add a child, edit name and picture, remove a child, optional picture passcode |
| Grown-ups | Who can sign in; invite another grown-up by Google email |
| Grown-up PIN | Change the PIN (current PIN required) |
| Recovery email | Where PIN reset codes are sent |
| Sign-in and devices | The signed-in account, "Sign out of this device", "Sign out all other devices" |
| Auto-lock | Lock after 1, 2 or 5 minutes of inactivity; default 2 |
| Back to Who's flying | A child's trip returns to Who's flying after 30 seconds, 1 minute (default) or 2 minutes of no touches |
| Notifications | ntfy topic, test message, which alerts are on |
| Daily reset and bonus | Time chores reset (default 6:00 am) and the daily bonus amount (default +20 stars) |

- **Removing a child:** needs a confirmation step. The screen says what will be removed before the grown-up confirms.
- **Changing a picture:** children can change their own rocket picture from Who's flying.

## Devices and sign-in

- A grown-up signs in with Google. There are no passwords and no installs. The first person to finish setup creates the family and is its owner.
- Each new device opens the web address and signs in with the same Google account once. Every device starts on Who's flying after sign-in. Grown-up screens always need the PIN, on any device.
- Grown-up setup has 4 steps: children, PIN, recovery email, alerts. A kids' tablet shows a one-time "Add to Home Screen" tip on Who's flying.
- More than one grown-up can sign in, each with their own Google account. All grown-ups share one PIN. They join through an emailed invite (an invite is how the app knows which Google accounts belong to the family). Only Google accounts on the allowed list (the server's ALLOWED_EMAILS setting) can sign in. The first allowed account to sign in creates the family and owns it. Any other account sees "That Google account is not on the list." and cannot start a family. Invites will replace the list when they are built.
- Settings > Sign-in and devices has no list of devices; it has the two sign-out buttons for a lost tablet.
- The sign-in page shows the Setup-Welcome screen until the first family exists, and the Tablet-SignIn screen after that.
- If Google sign-in fails, the sign-in page shows one short line above the button: "Sign-in was cancelled. Try again when you are ready.", "Google sign-in did not work. Try again.", "That Google account is not on the list." or, after 10 failed tries in 15 minutes, "Too many tries. Try again in 15 minutes."
- The recovery email is separate from the Google account. It only receives PIN reset codes and can be any email.

## Trip, stars and bonus

- A child's trip is today's chores. A child can do the stops in any order, and every unfinished stop can be opened.
- **Trip order** (decided in #22): from the start of the path, done stops, then stops waiting for a grown-up, then the rest, each group oldest chore first. The first of the rest is "Up next". More than 5 stops make the trip taller, and the page scrolls.
- **Expectations** (decided in #22): a chore has an optional "Expectations" line (up to 200 characters) saying what done looks like, for example "Put every toy back in the box and push it under your bed." Grown-ups write it on New chore and Edit chore, and the child sees it on the stop.
- **Coming up** (decided in #22): the child's chores that are not due today but are due in the next 6 days, soonest first, with the day ("Thursday"). The "Coming up · 2" button shows only when there is at least one.
- **Nothing to do today** keeps the trip's header (name, "Not Mia? Switch", stars), so the name stays on every trip screen.
- Finished stops move to the front of the path. Stops waiting for a grown-up come next, then unfinished ones. The orange "Up next" is only a suggestion.
- Skipped, hidden and not-due chores leave the path, so the count (for example "2 of 4") shrinks with them. A skipped or hidden chore does not stop a child earning the bonus for the rest.
- Finishing every stop for the day earns a daily bonus (default +20 stars, set by a grown-up). The end of the trip is a bonus planet, not a reward.
- With no chores due, the child sees "Nothing to do today".
- Stars only go down when a reward is claimed. There are no penalties.
- **Ranks** (Cadet 0, Pilot 50, Explorer 100, Captain 250, Commander 500) use the child's current star balance, so a rank can drop after a reward is handed out. Rank shows on the child's rocket, which keeps the child's colour: Cadet plain, Pilot wing and hull stripes, Explorer side boosters, Captain gold collar and wing tips, Commander gold star and glow. The rocket upgrades everywhere it appears at 40 px or taller.
- **Star history (grown-ups only):** on the Ranks tab, each child has a "Star history" link that opens a list of that child's star changes, grouped by day, newest first (chores, daily bonus, rewards handed out). Undo and "That wasn't Mia" correct the history rather than adding rows, so it shows only what stands. Children never see it.

## Rewards

- Children spend stars on rewards. Stars are a running balance, so claiming a reward subtracts its cost.
- A reward is claimable when a child's stars reach its cost. The child's My rewards screen and the grown-up's Rewards screen both show a meter per child and a clear "ready" state.
- **Claiming:** the child taps Claim and sees "Asked a grown-up". A grown-up gets an ntfy alert, enters the PIN, and confirms. Stars are only taken when the grown-up confirms.
- **Declining:** a grown-up can decline a claim with a message (for example "Maybe on the weekend!"). The child sees the message and keeps their stars.
- Sample data: Extra screen time costs 100 stars, Movie night 150, Pizza night 200 and Park trip 90.

## Checking, undo and send back

- A child can tap Undo for about a minute after "I did it!" while the chore is still waiting for a grown-up.
- **After "I did it!"** (decided in #23): the trip shows "Sent! A grown-up will check it." with Undo for 60 seconds. When the stop was not Up next, it reads "Set the table moved to the front!" instead, still with Undo. The message goes as soon as a grown-up checks the chore.
- **Live updates** (decided in #23): screens check for changes every 4 seconds, and at once when the app comes back into view.
- A grown-up can undo an accepted chore for 1 minute after accepting it.
- A grown-up can send a chore back with a kind message ("Almost! Give it another go", and others). The child sees the message on the trip, and the stop opens again.
- A grown-up can also choose "That wasn't Mia" to move a chore and its stars to the right child.

## Keeping children from mixing up trips

- After "I did it!", the child confirms "Are you Mia?".
- Each child's colour and name stay on their trip screens, with a "Not Mia? Switch" link.
- A child's trip returns to Who's flying after no touches for 30 seconds, 1 minute (default) or 2 minutes, with a 10-second "Still there?" warning.
- A picture passcode (three pictures) is an optional setting per child, off by default.

## Photos

- A child can add a photo to their rocket's window from Who's flying. Photos are stored in the family account, so they show on every signed-in device.
- Chores and rewards use a built-in picture by default. A grown-up can add their own photo instead (take or pick, then crop to a square for chores or a circle for rewards).
- A reward always keeps its planet: the photo shows as a small round badge on the planet's corner in lists, and large on the claim screens.
- Photos are resized on upload and deleted with the chore, reward or child. If a photo is missing or fails to load, the built-in icon or planet shows instead.
- "Take a photo" should use the device camera (file picker with the camera hint). Camera permission needs https.

## Accessibility

- Progress meters and bars have a minimum contrast against their background, and meters are labelled as progress bars for screen readers.
- Touch targets are at least 44 px. The smallest text is 13 px.
- State is never shown by colour alone: icons and words go with it. The current tab and filter are marked for screen readers.
- There are no animations yet. When added, they should respect reduced motion.

## Not designed yet (decide while building)

- Leo's own trip (every child tile opens the sample trip).
- A "camera is blocked" message and a "Remove photo" action.
- A fallback look for a chore photo that has not loaded.
- A "Coming up" screen for each child beyond the sample.
