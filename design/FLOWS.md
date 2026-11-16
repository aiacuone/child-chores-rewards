# Flows

Each flow is one row on the design canvas, read left to right. Board files are in `design/screens/`. The number before the hint is the order in the canvas.

## A child finishes a chore

- `Main.dc.html`: 1 · Who’s flying? Tap Mia
- `Space-Child.dc.html`: 2 · Mia’s trip. Tap any open stop
- `Stop.dc.html`: 3 · The stop. Tap I did it!
- `Confirm-Who.dc.html`: 4 · Are you Mia? Tap Yes
- `Space-Child-Waiting.dc.html`: 5 · Trip. Stop waits for a grown-up
- `Parent-Notification.dc.html`: 6 · Grown-up’s phone. ntfy alert

## A child does chores in any order

- `Space-Child-Open.dc.html`: 1 · Trip. All stops open. Tap the last one
- `Stop-Table.dc.html`: 2 · Set the table. Tap I did it!
- `Confirm-Who-Table.dc.html`: 3 · Are you Mia? Tap Yes
- `Space-Child-Reordered.dc.html`: 4 · Trip. It moves to the front

## A child finishes the whole trip

- `Child-Bonus.dc.html`: 1 · Tap the bonus planet
- `Space-Child-AllDone.dc.html`: 2 · All 5 done. Bonus stars!
- `Child-Rewards.dc.html`: 3 · My rewards
- `Space-Child-Empty.dc.html`: 4 · A day with no chores

## A child claims a reward

- `R-Child-Rewards2.dc.html`: 1 · My rewards. Tap Claim
- `Claim-Waiting.dc.html`: 2 · Asked a grown-up
- `Notif-Claim.dc.html`: 3 · Grown-up’s phone. ntfy alert
- `Parent-PIN-Claim.dc.html`: 4 · Grown-up PIN
- `Claim-Parent.dc.html`: 5 · Hand out. Tap Yes
- `Rewards-Claimed.dc.html`: 6 · Rewards. Stars taken
- `Child-Rewards-Claimed.dc.html`: 7 · Child sees new star total

## A child undoes, or a grown-up sends a chore back

- `R-Space-Child-Waiting.dc.html`: 1 · Child taps Undo within a minute
- `R-Stop-Waiting2.dc.html`: 2 · Check it. Tap Not done yet
- `Not-Done.dc.html`: 3 · Pick a kind message. Tap Send back
- `Parent-Stops-SentBack.dc.html`: 4 · Chores. Sent back
- `Space-Child-Retry.dc.html`: 5 · Mia sees the message

## A grown-up sets up the app

- `Setup-Welcome.dc.html`: 1 · Welcome. Tap Continue with Google
- `Setup-Children.dc.html`: 2 · Add children
- `Setup-PIN.dc.html`: 3 · Choose a PIN
- `Setup-Email.dc.html`: 4 · Recovery email
- `Setup-Alerts.dc.html`: 5 · ntfy alerts
- `Setup-Done.dc.html`: 6 · All set

## A kids’ tablet signs in

- `Tablet-SignIn.dc.html`: 1 · On the tablet. Tap Continue with Google
- `R-Main-Tablet.dc.html`: 2 · Who’s flying

## A child puts their photo in the rocket

- `R-Main-Photo.dc.html`: 1 · Who’s flying? Tap Leo’s rocket
- `My-Rocket.dc.html`: 2 · Empty window. Tap Take a photo
- `My-Rocket-Crop.dc.html`: 3 · Move and zoom. Tap Looks good!
- `My-Rocket-Done.dc.html`: 4 · Face in the window
- `Main-Photo.dc.html`: 5 · Back to Who’s flying. Leo’s photo shows

## A grown-up checks a chore

- `R2-Main.dc.html`: 1 · Who’s flying? Tap I’m a grown-up
- `Parent-PIN.dc.html`: 2 · Grown-up PIN. Enter PIN
- `Parent-Home.dc.html`: 3 · Mission control. Tap 1 stop to check
- `Stop-Waiting.dc.html`: 4 · Check it. Tap Yes, it’s done!
- `Parent-Stops-Done.dc.html`: 5 · Chores. Checked
- `Space-Child-Done.dc.html`: 6 · Mia’s rocket flies on

## A grown-up adds a chore

- `Parent-Stops.dc.html`: 1 · Chores. Tap +
- `Add-Stop.dc.html`: 2 · New chore. Tap Add chore
- `Parent-Stops-Added.dc.html`: 3 · Chores. New one added

## A grown-up edits a chore and when it repeats

- `R4-Parent-Stops.dc.html`: 1 · Chores. Tap Tidy the toy box
- `Stop-Parent.dc.html`: 2 · The chore. Tap Edit chore
- `Edit-Stop.dc.html`: 3 · Edit. Pick Weekly, then days
- `Stop-Parent-Saved.dc.html`: 4 · The chore. Saved

## A grown-up skips or hides a chore

- `R5-Stop-Parent.dc.html`: 1 · The chore. Tap Skip today or Hide
- `Parent-Stops-Skipped.dc.html`: 2 · Skip today. Back tomorrow
- `Parent-Stops-Hidden.dc.html`: 3 · Hide. Children can’t see it

## A grown-up adds a reward

- `Rewards.dc.html`: 1 · Rewards. Tap +
- `Add-Reward.dc.html`: 2 · New reward. Tap Add reward
- `Rewards-Added.dc.html`: 3 · Rewards. New planet added
- `R-Child-Rewards3.dc.html`: 4 · Child sees it under My rewards

## A grown-up uses their own photo for a chore

- `R-Add-Stop.dc.html`: 1 · New chore. Tap Use my own photo
- `Photo-Choose.dc.html`: 2 · Take or pick a photo
- `Photo-Crop.dc.html`: 3 · Move and zoom. Tap Looks good
- `Add-Stop-Photo.dc.html`: 4 · New chore with a photo. Tap Add chore

## A grown-up uses their own photo for a reward

- `R-Add-Reward.dc.html`: 1 · New reward. Tap Use my own photo
- `Reward-Photo-Choose.dc.html`: 2 · Take or pick a photo
- `Reward-Photo-Crop.dc.html`: 3 · Move and zoom. Tap Looks good
- `Add-Reward-Photo.dc.html`: 4 · New reward with a photo. Tap Add reward
- `Rewards-Added-Photo.dc.html`: 5 · Rewards. New one has its photo
- `Child-Rewards-Photo.dc.html`: 6 · Child sees it under My rewards

## Where a photo shows up

- `Parent-Stops-Added-Photo.dc.html`: 1 · Chores list. Tap the new chore
- `Stop-Parent-Photo.dc.html`: 2 · The chore, as a grown-up sees it
- `Space-Child-Photo.dc.html`: 3 · The child’s trip. The stop shows the photo. Tap it
- `Stop-Photo.dc.html`: 4 · The child’s chore screen
- `Claim-Waiting-Photo.dc.html`: 5 · Child asks for the reward
- `Claim-Parent-Photo.dc.html`: 6 · A grown-up hands it out

## Kids can’t mix up trips

- `Space-Child-Idle.dc.html`: 1 · No one is touching it. Still there?
- `R-Main-Idle.dc.html`: 2 · Back to Who’s flying
- `R-Main-Pass.dc.html`: 3 · Mia has a picture passcode. Tap Mia
- `Passcode-Enter.dc.html`: 4 · Tap the 3 secret pictures
- `R-Space-Child.dc.html`: 5 · Mia’s trip opens

## A grown-up fixes the wrong child

- `R-Stop-Waiting.dc.html`: 1 · Check it. Tap That wasn’t Mia
- `Reassign.dc.html`: 2 · Who really did it? Tap Leo
- `Parent-Stops-Moved.dc.html`: 3 · Moved to Leo’s trip

## A grown-up sets a picture passcode

- `R-Child-Edit.dc.html`: 1 · Edit Leo. Tap Picture passcode
- `Passcode-Setup.dc.html`: 2 · Pick 3 pictures. Tap Save

## Grown-up mode locks itself

- `Home-Locking.dc.html`: 1 · No one has touched it. Locking soon
- `Main-Locked.dc.html`: 2 · Back to Who’s flying, locked

## A grown-up looks at a child’s star history

- `R-Ranks.dc.html`: 1 · Ranks. Tap Star history
- `Star-History.dc.html`: 2 · Star history. Newest first, scrolls
- `Star-History-Empty.dc.html`: 3 · A child with no stars yet

## A grown-up manages children

- `Settings.dc.html`: 1 · Settings. Tap Children
- `Settings-Children.dc.html`: 2 · Children. Tap Leo
- `Child-Edit.dc.html`: 3 · Edit Leo. Tap Remove Leo
- `Child-Remove.dc.html`: 4 · Are you sure? Tap Yes
- `Children-Removed.dc.html`: 5 · Children. Leo removed

## A grown-up sets up ntfy

- `R9-Settings.dc.html`: 1 · Settings. Tap Notifications
- `Notifications.dc.html`: 2 · Notifications. Tap ntfy
- `Ntfy.dc.html`: 3 · Set up ntfy. Send a test

## A grown-up forgot the PIN

- `R10-Parent-PIN.dc.html`: 1 · Grown-up PIN. Tap Forgot PIN?
- `PIN-Forgot.dc.html`: 2 · Forgot PIN. Tap Send code
- `Notif-Reset.dc.html`: 3 · Grown-ups’ phones. ntfy alert
- `PIN-Reset.dc.html`: 4 · Set a new PIN. Tap Save PIN
- `Parent-PIN-After.dc.html`: 5 · Try the new PIN

## A wrong PIN is entered

- `R-Parent-PIN-Try.dc.html`: 1 · Grown-up PIN. Enter a wrong PIN
- `Parent-PIN-Wrong.dc.html`: 2 · Wrong PIN, try again. After 5 tries it locks
- `Parent-PIN-Locked.dc.html`: 3 · Locked, with a countdown. Tap Forgot PIN?
- `Notif-PIN-Locked.dc.html`: 4 · Grown-ups’ phones. ntfy alert
- `PIN-Reset-Wrong.dc.html`: 5 · Reset code is wrong. Tap Save PIN
- `PIN-Reset-Expired.dc.html`: 6 · Code cancelled. Tap Send a new code

## A grown-up changes the recovery email

- `R11-Settings.dc.html`: 1 · Settings. Tap Recovery email
- `Recovery.dc.html`: 2 · Recovery email. Tap Change email
- `Recovery-Edit.dc.html`: 3 · New email and PIN. Tap Send link
- `Recovery-Sent.dc.html`: 4 · Check your inbox

## A child sees what’s coming up

- `R-Space-Child-Coming.dc.html`: 1 · Mia’s trip. Tap Coming up
- `Child-Coming.dc.html`: 2 · Chores due on other days

## A grown-up skips a chore for several days

- `R-Stop-Parent2.dc.html`: 1 · The chore. Tap Skip…
- `Skip-Options.dc.html`: 2 · Skip for how long? Tap 3 days
- `Parent-Stops-SkippedLong.dc.html`: 3 · Skipped until Tuesday

## A grown-up undoes an accepted chore

- `R-Parent-Stops-Done.dc.html`: 1 · Checked. Tap Undo within a minute
- `Parent-Stops-Undone.dc.html`: 2 · Waiting for a check again

## A grown-up declines a reward claim

- `R-Claim-Parent.dc.html`: 1 · Hand out? Tap Not now
- `Claim-Decline.dc.html`: 2 · Pick a message. Tap Send message
- `Rewards-Declined.dc.html`: 3 · Rewards. Message sent
- `Child-Rewards-Declined.dc.html`: 4 · Mia sees the message

## A grown-up invites another grown-up

- `R-Settings-Grownups.dc.html`: 1 · Settings. Tap Grown-ups
- `Grown-ups.dc.html`: 2 · Grown-ups. Tap Invite
- `Invite.dc.html`: 3 · Their Google email. Tap Send invite
- `Grown-ups-Invited.dc.html`: 4 · Invite sent

## Other grown-up screens

- `Ranks.dc.html`: 1 · Ranks
- `Auto-Lock.dc.html`: 2 · Auto-lock
- `Auto-Return.dc.html`: 3 · Back to Who’s flying
- `Devices.dc.html`: 4 · Devices
- `Daily-Reset.dc.html`: 5 · Daily reset and bonus
