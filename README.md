# Nimble RPG App

_Combat tracker for the [Nimble](https://nimblerpg.com/) tabletop RPG_

This is a fork of [Improved Initiative](https://improvedinitiative.app/),
adapted from Dungeons & Dragons 5th Edition to the Nimble RPG system. See
[NIMBLE_CONVERSION.md](NIMBLE_CONVERSION.md) for what changed and why.

## Local Development

### Requirements

- [Node.js](https://nodejs.org/en/) (see package.json for specific version)

### Setup

- Clone the repo to a folder on your computer
- Open the cloned folder in a code editor such as [Visual Studio Code](https://code.visualstudio.com/)
- Open a terminal window (Powershell is the recommend terminal application for this project)
- Install dependencies and start the development environment:

```
npm install
npm run dev
```

- Visit <http://localhost:3000> in a web browser. Client TypeScript and HTML
  changes reload the page, while LESS changes are injected without a reload.
  Server TypeScript changes restart the server automatically.
- In Visual Studio Code, the `Develop Improved Initiative` launch configuration
  starts the same workflow with the debugger attached to child processes.
- Open5e preloading is skipped by default for a faster startup. Run the server
  separately when developing Open5e behavior.
- To override development server settings, copy `.env.example` to `.env` and
  edit it. The file is optional and ignored by Git. Environment variables set
  in the shell take precedence over `.env`, which takes precedence over the
  development defaults.

Development of Nimble RPG App is supported through [Patreon](https://www.patreon.com/NimbleRPGApp).

To learn more about how to contribute code to Nimble RPG App, refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

### Linting

Nimble RPG App uses Eslint with prettier to lint the code files.

Linting happens automatically on commit, but you can also run it manually via: `npm run lint`.

### App Settings

You can configure your instance of Nimble RPG App with these settings. All are optional, basic functionality should work if you don't specify any.

- `PORT` - Defaults to 80
- `NODE_ENV` - Set to "production" to satisfy react, set to "development" to disable html view caching.
- `BASE_URL` - Used in absolute URLs on client side. Falls back to relative urls if unavailable. This is the canonical URL for Patreon callback and browser localStorage.
- `SESSION_SECRET` - Used to keep session continuity through app restarts or something. Handed to express-session.
- `DEFAULT_ACCOUNT_LEVEL` - Set to "accountsync", "epicinitiative", or "mythic" to grant rewards to all users without a real Patreon account - also skips the marketing landing page, redirecting straight to the tracker, since this mode implies a single local DM rather than anonymous public visitors. Useful if you have no DB, or are self-hosting for your own table.
- `DEFAULT_PATREON_ID` - Set the dummy Patreon user id when running with `DEFAULT_ACCOUNT_LEVEL` set.
- `DB_CONNECTION_STRING` - Provide a DB connection string for session and user account storage. A local MongoDB instance will be used otherwise, persisted to disk under `LOCAL_DB_PATH` (not cleared on restart) so self-hosted data survives across app restarts.
- `LOCAL_DB_PATH` - Where the local MongoDB instance (used when `DB_CONNECTION_STRING` isn't set) stores its data. Defaults to `./data/db`.
- `ALLOW_SERVER_SHUTDOWN` - Set to "true" to add a "Shut Down Server" button (Settings > About) that gracefully stops the process, flushing the local database first. Only intended for a local, single-user instance - never enable on a shared/public deployment.
- `ALLOW_SERVER_REBUILD` - Set to "true" to add a "Rebuild Client" button (Settings > About) that runs `npm run build` on the server and reports success or failure in the tab. Same local-only caveat as `ALLOW_SERVER_SHUTDOWN` - never enable on a shared/public deployment. Only works against a production instance (`npm start`) - refused under `npm run dev`, since that workflow's nodemon watches the same server files the build recompiles and would restart mid-request.
- `MULTI_TENANT_DEPLOYMENT` - Set to "true" on a shared hosted instance to force `ALLOW_SERVER_SHUTDOWN`/`ALLOW_SERVER_REBUILD` off regardless of their own values, so a stray "true" left in that environment's config can't let one tenant shut down or rebuild the process for every other tenant sharing it.
- `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD` - If both are set, gates the entire app (pages, API routes, and the Socket.IO live-sync connection) behind a single shared HTTP Basic Auth login. Inactive unless both are set. Intended for a dev/staging deployment that would otherwise sit open at its default URL - not needed for the production instance real visitors use.
- `METRICS_DB_CONNECTION_STRING` - Provide a DB connection string to write metrics to.
- `PATREON_URL`, `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET` - Configuration for Patreon integration
- `PATREON_ACCOUNT_SYNC_TIER_IDS`, `PATREON_EPIC_TIER_IDS`, `PATREON_MYTHIC_TIER_IDS` - Comma-separated Patreon tier reward IDs that grant Account Sync/Epic/Mythic features after login. Default to the original Nimble RPG App campaign's tier IDs - set these if running your own Patreon campaign, since a different campaign's tiers get different IDs.
- `GOOGLE_ANALYTICS_ID` - GA4 measurement ID used by the browser tag and Measurement Protocol events.
- `GOOGLE_ANALYTICS_API_SECRET` - GA4 Measurement Protocol API secret used for server-side Patreon subscription events.

## Local Hosting

To self-host this app for your own table (rather than developing on it), use
the launcher scripts in `scripts/`:

- `Start-NimbleRPGApp-Console.ps1` - Right-click and "Run with
  PowerShell". Builds and starts a production instance in a visible window,
  and opens it in your browser once it's up. Stop it with Ctrl+C in that
  window, which shuts down cleanly and flushes the local database.
- `Start-NimbleRPGApp-Hidden.ps1` - Same, but with no visible console
  window (output is logged to `data\start.log`). Since there's no window for
  Ctrl+C, stop it from the app's Settings > About tab instead ("Shut Down
  Server" - requires `ALLOW_SERVER_SHUTDOWN=true`, which both scripts set by
  default). The same tab also has a "Rebuild Client" button (requires
  `ALLOW_SERVER_REBUILD=true`, also set by default) to pick up code changes
  without needing a console at all.

Both scripts load `.env` if present, so set `DEFAULT_ACCOUNT_LEVEL` there
(e.g. to "epicinitiative") to skip the marketing landing page and go straight
to the tracker - without it, the app behaves like the public hosted service.
Local data persists under `data\db` - copy that folder along with the
project to bring your data to another device. Data only survives cleanly if
the server is stopped through one of the two methods above, not by
force-closing the process.

## License

The Nimble RPG App app is made available under the [MIT](license) license.
