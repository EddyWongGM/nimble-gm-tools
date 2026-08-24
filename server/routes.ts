import * as express from "express";

import * as moment from "moment";

import mustacheExpress = require("mustache-express");
import { URL } from "url";

import { ClientEnvironment } from "../common/ClientEnvironment";
import { probablyUniqueString, ParseJSONOrDefault } from "../common/Toolbox";
import { configureBasicRulesContent } from "./configureBasicRulesContent";
import { getAccount, upsertUser } from "./dbconnection";
import { configureMetricsRoutes } from "./metrics";
import {
  configureLoginRedirect,
  configureLogout,
  configurePatreonWebhookReceiver,
  startNewsUpdates,
  updateSessionAccountFeatures
} from "./patreon";
import { PlayerViewManager } from "./playerviewmanager";
import { isRebuildInProgress, rebuildClient } from "./rebuild";
import { shutdownServer } from "./shutdown";
import configureStorageRoutes from "./storageroutes";
import { AccountStatus } from "./user";
import { configureOpen5eContent } from "./configureOpen5eContent";
import { configureAffiliateRoutes } from "./configureAffiliateRoutes";
import { configureImportRoutes } from "./configureImportRoutes";

const baseUrl = process.env.BASE_URL || "";
const patreonClientId = process.env.PATREON_CLIENT_ID || "PATREON_CLIENT_ID";
const defaultAccountLevel = process.env.DEFAULT_ACCOUNT_LEVEL || "none";
const googleAnalyticsId = process.env.GOOGLE_ANALYTICS_ID || "";
// Opt-in only: this codebase also runs as the public hosted service, so a
// route that stops the process must never exist unless explicitly enabled
// for a local, single-user instance.
const allowServerShutdown = process.env.ALLOW_SERVER_SHUTDOWN === "true";
// A per-process secret required by /shutdown, generated fresh on each server
// start. Only the DM-facing tracker page is handed this token (see
// getClientOptions) - the Player View page, which other devices on the LAN
// can reach, never receives it, so those devices can't call /shutdown even
// though they share an origin with it.
const shutdownToken = probablyUniqueString();
// Same opt-in-only reasoning as allowServerShutdown: this route runs `npm
// run build` as a child process, which must never be reachable unless
// explicitly enabled for a local, single-user instance.
const allowServerRebuild = process.env.ALLOW_SERVER_REBUILD === "true";
const rebuildToken = probablyUniqueString();

export type Req = Express.Request & express.Request;
export type Res = Express.Response & express.Response;

// Shared guard for local-instance-only action routes (/shutdown, /rebuild).
function requireLocalActionToken(token: string) {
  return (req: Req, res: Res, next: express.NextFunction) => {
    // Requiring a JSON content-type means a plain HTML form (as used by
    // cross-site request forgery) cannot trigger this - the browser will
    // not send this content-type without a same-origin script doing so,
    // and this server does not send CORS headers permitting cross-origin
    // access to this content-type from another origin.
    if (req.headers["content-type"] !== "application/json") {
      return res.sendStatus(400);
    }
    // The content-type check above only rules out classic form-based CSRF.
    // This local instance can also be reached by other devices on the LAN
    // (e.g. a player's tablet showing the Player View), which share this
    // origin and so aren't stopped by that check alone - requiring this
    // per-process token, only ever sent to the DM-facing tracker page,
    // keeps them from triggering the action themselves.
    if (req.body?.token !== token) {
      return res.sendStatus(403);
    }
    next();
  };
}

const appVersion = require("../package.json").version;

const getClientOptions = (
  session: Express.Session,
  options?: {
    includeShutdownCapability?: boolean;
    includeRebuildCapability?: boolean;
  }
) => {
  const includeShutdownCapability =
    allowServerShutdown && (options?.includeShutdownCapability ?? false);
  const includeRebuildCapability =
    allowServerRebuild && (options?.includeRebuildCapability ?? false);
  const encounterId = session.encounterId || probablyUniqueString();
  const patreonLoginUrl =
    "http://www.patreon.com/oauth2/authorize" +
    `?response_type=code&client_id=${patreonClientId}` +
    `&redirect_uri=${baseUrl}/r/patreon` +
    `&scope=` +
    encodeURIComponent(`identity identity.memberships identity[email]`) +
    `&state=${encounterId}`;

  const environment: ClientEnvironment = {
    EncounterId: encounterId,
    BaseUrl: baseUrl,
    PatreonLoginUrl: patreonLoginUrl,
    IsLoggedIn: session.isLoggedIn || false,
    HasStorage: session.hasStorage || false,
    HasEpicInitiative: session.hasEpicInitiative || false,
    HasMythic: session.hasMythic || false,
    SendMetrics: process.env.METRICS_DB_CONNECTION_STRING != undefined,
    GoogleAnalyticsId: googleAnalyticsId,
    PostedEncounter: null,
    SentryDSN: process.env.SENTRY_DSN || null,
    CanShutdownServer: includeShutdownCapability,
    ShutdownToken: includeShutdownCapability ? shutdownToken : null,
    CanRebuildServer: includeRebuildCapability,
    RebuildToken: includeRebuildCapability ? rebuildToken : null
  };

  if (session.postedEncounter) {
    environment.PostedEncounter = session.postedEncounter;
    delete session.postedEncounter;
  }

  return {
    environmentJSON: JSON.stringify(environment),
    baseUrl,
    appVersion,
    googleAnalyticsId
  };
};

export default async function (
  app: express.Application,
  playerViews: PlayerViewManager
): Promise<void> {
  const mustacheEngine = mustacheExpress();

  let cacheMaxAge = moment.duration(7, "days").asMilliseconds();
  if (process.env.NODE_ENV === "development") {
    mustacheEngine.cache._max = 0;
    cacheMaxAge = 0;
  }

  if (!process.env.BASE_URL?.length) {
    console.error(
      "BASE_URL environment variable is not set. Cannot start server."
    );
    process.exit(1);
  }

  app.engine("html", mustacheEngine);
  app.set("view engine", "html");
  app.set("views", __dirname + "/../html");

  app.use(
    express.static(__dirname + "/../public", {
      maxAge: cacheMaxAge,
      setHeaders: (res, filePath) => {
        // The JS/CSS bundle filenames only change when package.json's
        // version bumps, not on every build - a routine rebuild (e.g. via
        // Settings > About's Rebuild Client button) overwrites the same
        // filename. The long maxAge above would then have browsers keep
        // serving the stale bundle for up to 7 days with no revalidation
        // at all. Force these two to always revalidate instead - still
        // cheap (a 304 with no body) when nothing changed, but picks up a
        // rebuild on a normal refresh rather than requiring a hard refresh.
        if (filePath.endsWith(".js") || filePath.endsWith(".css")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      }
    })
  );

  app.use(
    express.json({
      verify: function (req, res, buf, encoding) {
        req["rawBody"] = buf.toString();
      }
    })
  );
  app.use(express.urlencoded({ extended: false }));

  configureMetricsRoutes(app);

  app.get("/", async (req: Req, res: Res) => {
    const session = req.session;
    if (session === undefined) {
      throw "Session is not available";
    }

    // A locally-hosted instance always has the same default DM - the
    // marketing landing page (aimed at anonymous first-time visitors to the
    // hosted service) doesn't apply, and sending them through it risks
    // "Build an Encounter" discarding their in-progress autosaved encounter.
    if (defaultAccountLevel !== "none") {
      return res.redirect("/e/");
    }

    session.encounterId = await playerViews.InitializeNew();

    const renderOptions = getClientOptions(session);
    return res.render("landing", renderOptions);
  });

  configureAffiliateRoutes(app);

  app.get("/e/:id", (req: Req, res: Res) => {
    const session = req.session;
    if (session === undefined) {
      throw "Session is not available";
    }
    session.encounterId = req.params.id;
    const urlObject = new URL(req.url, baseUrl);
    const queryString = urlObject.search;

    res.redirect("/e/" + queryString);
  });

  app.get("/e/", async (req: Req, res: Res) => {
    const session = req.session;
    if (session === undefined) {
      throw "Session is not available";
    }

    if (defaultAccountLevel !== "none") {
      await setupLocalDefaultUser(session);
    }

    updateSession(session);

    const options = getClientOptions(session, {
      includeShutdownCapability: true,
      includeRebuildCapability: true
    });
    return res.render("tracker", options);
  });

  app.get("/p/:id", (req: Req, res: Res) => {
    const session = req.session;
    if (session == null) {
      throw "Session is not available";
    }

    session.encounterId = req.params.id;
    res.render("playerview", getClientOptions(session));
  });

  app.get("/playerviews/:id", async (req: Req, res: Res) => {
    const playerView = await playerViews.Get(req.params.id);
    res.json(playerView);
  });

  configureBasicRulesContent(app);
  const configureOpen5eContentPromise = configureOpen5eContent(app);

  configureImportRoutes(app, playerViews);
  app.get("/transferlocalstorage/", (req: Req, res: Res) => {
    res.render("transferlocalstorage", { baseUrl });
  });

  configureLoginRedirect(app);
  configureLogout(app);
  configurePatreonWebhookReceiver(app);
  configureStorageRoutes(app);
  startNewsUpdates(app);

  if (allowServerShutdown) {
    app.post(
      "/shutdown",
      requireLocalActionToken(shutdownToken),
      (req: Req, res: Res) => {
        res.sendStatus(200);
        res.on("finish", () => {
          shutdownServer();
        });
      }
    );
  }

  if (allowServerRebuild) {
    app.post(
      "/rebuild",
      requireLocalActionToken(rebuildToken),
      async (req: Req, res: Res) => {
        // The `npm run dev` workflow (nodemon) watches server/ and common/
        // for .js changes and restarts on them - the ts:server step of `npm
        // run build` writes exactly those files, so running a rebuild here
        // would kill the very process handling this request mid-response
        // instead of reporting back cleanly. Only a production instance (no
        // file watcher) can complete this request.
        if (process.env.NODE_ENV === "development") {
          return res.status(400).json({
            output:
              "Rebuild isn't available in the npm run dev workflow - it " +
              "already rebuilds automatically on file changes. Use a " +
              "production instance (npm start, or the " +
              "Start-NimbleGMTools scripts) instead."
          });
        }
        if (isRebuildInProgress()) {
          return res.sendStatus(409);
        }

        const result = await rebuildClient();
        if (result.success) {
          return res.sendStatus(200);
        }
        // Trim to keep the response small - only the tail is useful for
        // diagnosing a failed build.
        return res.status(500).json({ output: result.output.slice(-4000) });
      }
    );
  }

  return configureOpen5eContentPromise;
}

async function setupLocalDefaultUser(session: Express.Session) {
  let accountStatus = AccountStatus.None;
  if (defaultAccountLevel === "accountsync") {
    session.hasStorage = true;
    accountStatus = AccountStatus.Pledge;
  }

  if (defaultAccountLevel === "epicinitiative") {
    session.hasStorage = true;
    session.hasEpicInitiative = true;
    accountStatus = AccountStatus.Epic;
  }

  if (defaultAccountLevel === "mythic") {
    session.hasStorage = true;
    session.hasEpicInitiative = true;
    session.hasMythic = true;
    accountStatus = AccountStatus.Mythic;
  }

  session.isLoggedIn = true;

  const user = await upsertUser(
    process.env.DEFAULT_PATREON_ID || "defaultPatreonId",
    accountStatus,
    ""
  );

  if (user) {
    session.userId = user._id;
  }

  return;
}

async function updateSession(session: Express.Session) {
  if (session.userId) {
    const account = await getAccount(session.userId);
    if (account) {
      updateSessionAccountFeatures(session, account.accountStatus);
    }
  }
}
