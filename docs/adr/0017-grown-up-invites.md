# 17. Grown-up invites

Status: accepted

## Context

More than one grown-up can sign in, each with their own Google account, and they join through an emailed invite. The spec says an invite is how the app knows which Google accounts belong to the family, and that invites will replace the server's `ALLOWED_EMAILS` list. Until then, only emails on that list can sign in, and each one starts its own family.

The Invite screen asks for "Their Google email" and says "We email them an invite. They sign in with Google and use the family's grown-up PIN." Email goes out through the owner's Gmail ([ADR 0008](0008-email-for-pin-reset-and-invites.md)).

[ADR 0005](0005-google-sign-in-and-sessions.md) said an uninvited account could start its own empty family. The allowlist replaced that, so a stranger cannot use the app on the shared VM. This decision settles the rule once invites exist.

Google already proves that a person owns the email they sign in with, so a secret code in the invite adds little.

## Options considered

### Option 1: Email-matched invites

A grown-up enters the invitee's Google email. The app keeps it as a waiting invite and emails a notice with the app's address. When that verified Google email signs in, it joins the family. Any other account is refused. A server setting only says who may create the first family.

- Adding a grown-up needs nothing on the VM.
- The invitee can just open the site and sign in, even if the email is lost.
- Anyone in grown-up mode can let a new Google account into the family.

### Option 2: Secret invite link

The invite email holds a one-time secret link. The invitee must open it and sign in with the matching Google email.

- Proves the invitee received the email.
- More code: a token table, expiry and a landing page.
- A lost or expired email means sending a new invite, which is not designed.
- Anyone in grown-up mode can let a new Google account into the family.

### Option 3: Invite plus the server list

As Option 1, but `ALLOWED_EMAILS` stays, and an account must be both invited and on the list.

- A bug in the invite code, or someone in grown-up mode, cannot let a stranger in without access to the VM.
- Each new grown-up needs an edit to `app.env` on the VM and a restart.
- The spec says the list goes away.

### Option 4: Open sign-up

As ADR 0005 first said: invited accounts join the family, and any other Google account starts its own empty family.

- No list to keep.
- Anyone with a Google account can store data and photos on the shared VM.

## Decision

We chose **Option 1: Email-matched invites**.

- Adding a grown-up needs nothing on the VM.
- It is exactly what the Invite screen describes.
- The invitee can just open the site and sign in, even if the email gets lost.

The strongest alternative was Option 3, keeping the server list as a second lock that only the VM can open.

## Consequences

- This replaces ADR 0005's rule that an uninvited account starts its own empty family. Uninvited accounts are refused with "That Google account is not on the list."
- `ALLOWED_EMAILS` shrinks to deciding who may create the first family. After that, only invited emails can join.
- The invite email is only a notice; losing it does not matter. It contains no names of children.
- A grown-up in grown-up mode can invite anyone, so the PIN protects this as it protects the rest of the grown-up screens.
- Matching is on the verified email Google returns, compared without regard to case. A typo in the email invites nobody, and the invite stays "Waiting".
- How long an invite stays open, cancelling an invite and removing a grown-up (and ending their sessions) were decided when invites were built: see "Invites" and "Removing a grown-up" in the spec.
