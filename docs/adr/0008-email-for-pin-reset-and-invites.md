# 8. Email for PIN reset and invites

Status: accepted

## Context

The app sends three kinds of email, to any address:

- the one-time 6-digit PIN reset code,
- the link that verifies a new recovery email,
- invites for other grown-ups.

Volume is a few emails a month. A reset code that lands in spam leaves a grown-up locked out, so reliable delivery matters more than features.

The app's address is a DuckDNS name ([ADR 0004](0004-hosting-and-deploy.md)). DuckDNS cannot carry the records that prove email is genuine (SPF and DKIM), so the app cannot send from its own address. None of the existing apps sends email.

## Options considered

### Option 1: Your Gmail

Send through the owner's own Gmail, using an app password over SMTP (nodemailer).

- No new account, domain or bill.
- The quickest to set up.
- Gmail delivers reliably.
- The app password opens the owner's personal mailbox, and it is stored on the shared VM.

### Option 2: A Gmail just for the app

A new Gmail account used only by the app, sending the same way.

- A leaked password exposes only the app's mailbox.
- Another Google account to look after.
- Google may be wary of a new account sending automated mail (not checked).

### Option 3: Resend and a bought domain

Buy a domain (roughly US$10–15 a year) and send through Resend from an address on it.

- A proper sender address, with the best protection against spam folders.
- The domain could also replace the DuckDNS name.
- A domain to buy, renew and set up, and a service new to the existing apps.

## Decision

We chose **Option 1: Your Gmail**.

- No new account, domain or bill.
- It is the quickest to set up.
- Gmail delivers reliably, so reset codes should not land in spam.

The strongest alternative was Option 2, a Gmail account just for the app, so that the password on the VM cannot open a personal mailbox.

## Consequences

- Emails come from the owner's personal Gmail address, so invited grown-ups and anyone receiving a reset code will see it.
- The app password gives access to the owner's mailbox. It lives only in the app's root-only secrets file on the VM, never in git, and should be revoked and replaced if the VM is ever compromised.
- Gmail needs 2-Step Verification turned on to create an app password.
- Sending sits behind one "send email" function, so moving to Option 2 or 3 later only changes that function and its settings.
