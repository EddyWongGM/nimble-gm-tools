# Hosted Deployment Strategy

Last reviewed: 2026-08-24

## Context

Split out from [IMPROVE_BACKUP_PLAN.md](IMPROVE_BACKUP_PLAN.md), where it
started as recommendation #8 ("Mongo needs a backup story too") and grew
into a different kind of concern than the rest of that plan: not a
client-side backup/restore UX fix, but deployment/security considerations
for a *hypothetical future hosted, multi-tenant version* of this app (raised
as a "what if I monetize this as a service" possibility).

**None of this applies to the current single local DM self-host setup** -
it's speculative and forward-looking. Revisit when that direction is
actually pursued; nothing here is blocking anything else.

## Mongo-backed account data needs its own backup story

When self-hosting with `DEFAULT_ACCOUNT_LEVEL` set (the README's own
recommended self-host setup), `session.hasStorage = true` is forced
([routes.ts:317-329](server/routes.ts#L317-L329)), which fully activates
Account Sync for that single local DM - every settings change and every
library item auto-syncs to MongoDB, the same as a real Patreon-tier user. So
for anyone following the documented setup, Mongo is the canonical store, not
an optional extra - the browser's IndexedDB/localStorage is just a mirror of
it.

Today the only backup path for that data is the README's documented "stop
the server, copy `data\db`" - coarse (all-or-nothing), requires a clean
shutdown first, not versioned, not inspectable.
[`dbconnection.ts:13-27`](server/dbconnection.ts#L13-L27) already accepts
any Mongo connection string via `DB_CONNECTION_STRING` - local or a managed
cloud provider (e.g. MongoDB Atlas) - so pointing a deployment at a hosted
provider instead of the local `data\db` instance hands off backup/redundancy
to that provider's own infrastructure (Atlas's free tier already includes
continuous backups).

## Hosted Mongo is not a free config change - it trades away offline startup

[`server.ts:21-22`](server/server.ts#L21-L22) calls `await
DB.initialize(dbConnectionString)` *before* `server.listen()`, with no
try/catch around it. Today, with no `DB_CONNECTION_STRING` set, that
connects to an embedded local Mongo with zero network dependency - the
reason this app currently works fully offline. Point `DB_CONNECTION_STRING`
at a hosted provider instead, and that same startup step now needs internet
access to succeed just to *start the server* - if it can't reach it (no wifi
at the table, which is common for tabletop groups), the whole app fails to
start, not just account sync.

(The actual gameplay sync calls in
[`AccountClient.ts`](client/Account/AccountClient.ts) do degrade gracefully
once running - retries then gives up silently - so this is specifically a
startup-time gate, not a mid-session risk.)

So hosted Mongo only makes sense where the *server itself* runs somewhere
with reliable internet - a real cloud-hosted deployment - not a GM's laptop
at their table. This is the natural on-ramp if this ever becomes a real
hosted service for more than one self-hoster, not something to recommend for
a single local DM's install.

## Shut Down / Rebuild buttons aren't safe for a shared hosted instance

If the hosted-service direction is ever pursued: `ALLOW_SERVER_SHUTDOWN` and
`ALLOW_SERVER_REBUILD` must stay off, and this needs to be a hard
requirement, not just the current default.

Both are already off by default and the README already warns "never enable
on a shared/public deployment" ([README.md:62-63](README.md#L62-L63)), and
even when enabled, the per-process `shutdownToken`/`rebuildToken` guard
([routes.ts:52-74](server/routes.ts#L52-L74)) is only ever handed to the
DM-facing tracker page - explicitly to stop *other devices on the same LAN*
(e.g. a player's tablet) from triggering it. That guard's threat model is
"one DM, other devices are players" - it does not cover a hosted
multi-tenant deployment, where every tenant's own DM-facing page would
receive a valid token for the *same shared process*. If these flags were
ever accidentally left on for a shared hosted instance, any one tenant could
shut down or trigger a rebuild of the server for every other tenant on it.

### Planned mitigation (not yet implemented)

A separate production and development hosted instance, plus one code-level
master switch as defense-in-depth:

- **Two instances.** Production (the instance real tenants would touch)
  always has `ALLOW_SERVER_SHUTDOWN`/`ALLOW_SERVER_REBUILD` off; a separate
  development instance can keep them on, since its threat model reverts to
  "single trusted user" - the case these flags were designed for - *provided
  the dev instance isn't openly reachable* (access gate, VPN, or off the
  public internet entirely - "nobody knows the URL" alone isn't enough).
- **A master-switch env var**, since the two-instance split alone still
  depends on remembering to keep the two configs different forever (a
  shared `.env` template, a copy-paste mistake). E.g.
  `MULTI_TENANT_DEPLOYMENT=true`, forcibly overriding both flags off
  regardless of their own values. In [routes.ts:36](server/routes.ts#L36)
  and [:46](server/routes.ts#L46):
  ```ts
  const isMultiTenant = process.env.MULTI_TENANT_DEPLOYMENT === "true";
  const allowServerShutdown = !isMultiTenant && process.env.ALLOW_SERVER_SHUTDOWN === "true";
  // ...
  const allowServerRebuild = !isMultiTenant && process.env.ALLOW_SERVER_REBUILD === "true";
  ```
  Production sets `MULTI_TENANT_DEPLOYMENT=true`, so even a stray
  `ALLOW_SERVER_SHUTDOWN=true` leaking into that environment is inert; dev
  leaves it unset and behaves exactly as today.

Small, self-contained change, not yet implemented - turns "two configs must
both be right forever" into "one flag has to be right, and getting it wrong
fails closed." At minimum, whichever of this actually gets built needs to be
an explicit item on whatever deployment checklist a hosted-service launch
would use.
