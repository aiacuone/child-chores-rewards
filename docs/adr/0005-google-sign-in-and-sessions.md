# 5. Google sign-in and sessions

Status: accepted; its access rule (uninvited accounts start their own family) is superseded by [ADR 0017](0017-grown-up-invites.md)

## Context

Grown-ups sign in with Google only, with no passwords. Each device signs in once, so sessions must last a long time. A lost tablet must be signed out remotely ("Sign out all other devices"), so sessions have to be stored in the database rather than in self-contained tokens.

Family membership comes from the app itself. The first person to finish setup creates the family and owns it, other grown-ups join through an emailed invite, and an account that is not invited can only start its own empty family. Every option needs app code for this. The shared grown-up PIN is a separate decision.

shtrong already has working, deployed Google sign-in code with no auth library:

- the Google step uses state and PKCE, and requires a verified email,
- sessions are a random token in a cookie (httpOnly, secure, SameSite=lax), stored hashed in the database, lasting 60 days and renewed while in use.

Its access rule is an allowlist of emails, which does not fit this app's invites.

## Options considered

### Option 1: Copy shtrong's sign-in code

Copy shtrong's Google step and session code as a starting point, with this app's own Google client.

- Already written, deployed and working.
- No auth library to keep up with.
- A session table makes "Sign out all other devices" a single delete.
- The security-sensitive code is ours to get right.
- The tables move from Postgres to SQLite, and the allowlist is replaced with an owner and invites.

### Option 2: Arctic and own sessions

The small Arctic library handles the Google step, and the session table and cookie are written by hand.

- Arctic handles the Google token exchange and PKCE.
- One more small dependency, and new to the existing apps.

### Option 3: Auth.js

Auth.js for SvelteKit, with its Google provider and a drizzle adapter for database sessions.

- Widely used, with many examples.
- Needs adapter setup for database sessions, and is new to the existing apps.
- Believed, but not checked, to be in maintenance mode since 2025.

### Option 4: Better Auth

The Better Auth library, with its Google provider, drizzle adapter and organization plugin.

- Revoking other sessions is built in, and the organization plugin has an owner role and invitations.
- Its own tables and schema shape the database.
- New to the existing apps.

## Decision

We chose **Option 1: Copy shtrong's sign-in code**.

- The Google step and sessions are already written, deployed and working in shtrong.
- There is no auth library to keep up with.

The strongest alternative was Option 2, Arctic, to hand the Google step to a maintained library.

## Consequences

- The app gets its own Google Cloud project and OAuth client, its own redirect address on its own DuckDNS name, and its own secrets file on the VM. Nothing is shared with shtrong at runtime, so deleting shtrong does not affect sign-in.
- The consent screen needs the app's display name.
- The copied code is ours to maintain: security fixes to the Google step or session handling are not delivered by a library update.
- Access control is new code: family owner, invites, and an uninvited account starting its own empty family.
- "Sign out of this device" deletes this session. "Sign out all other devices" deletes every other session for the family.
