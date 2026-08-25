// These module-level env vars are read by routes.ts (and configureOpen5eContent.ts)
// at import time, so they must be set before routes.ts is first required below.
process.env.BASE_URL = "http://127.0.0.1";
process.env.MULTI_TENANT_DEPLOYMENT = "true";
process.env.ALLOW_SERVER_SHUTDOWN = "true";
process.env.ALLOW_SERVER_REBUILD = "true";
process.env.SKIP_OPEN5E_API = "1";
delete process.env.DEFAULT_ACCOUNT_LEVEL; // avoid touching the DB for this test
delete process.env.PATREON_URL;
delete process.env.AFFILIATE_ROUTES;
delete process.env.METRICS_DB_CONNECTION_STRING;
delete process.env.REDIS_URL;
delete process.env.DB_CONNECTION_STRING;

jest.mock("./shutdown");
jest.mock("./rebuild");

import * as express from "express";
import expressSession = require("express-session");
import * as http from "http";
import { AddressInfo } from "net";

import { shutdownServer } from "./shutdown";
import { rebuildClient } from "./rebuild";
import { PlayerViewManager } from "./playerviewmanager";
// routes.ts's module-level constants (isMultiTenant, allowServerShutdown,
// allowServerRebuild, etc.) are computed once, so it must be required after
// the env vars above are set - a static `import` would be hoisted ahead of
// them.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ConfigureRoutes = require("./routes").default;

describe("MULTI_TENANT_DEPLOYMENT overrides ALLOW_SERVER_SHUTDOWN/ALLOW_SERVER_REBUILD", () => {
  let httpServer: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    const sessionMiddleware = expressSession({
      secret: "routes-multitenant-test-secret",
      resave: false,
      saveUninitialized: false
    });
    app.use(sessionMiddleware);

    const playerViews: jest.Mocked<PlayerViewManager> = {
      Destroy: jest.fn(),
      Get: jest.fn(),
      IdAvailable: jest.fn().mockResolvedValue(true),
      InitializeNew: jest.fn().mockResolvedValue("initEncounterId"),
      UpdateEncounter: jest.fn(),
      UpdateSettings: jest.fn()
    };

    await ConfigureRoutes(app, playerViews);

    httpServer = http.createServer(app);
    await new Promise<void>(resolve => httpServer.listen(0, resolve));
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  function getEnvironmentJSON(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      http
        .get(`${baseUrl}${path}`, response => {
          let body = "";
          response.on("data", chunk => (body += chunk));
          response.on("end", () => {
            const match = body.match(/environmentJSON="([^"]*)"/);
            if (!match) {
              reject(new Error(`No environmentJSON attribute in: ${body}`));
              return;
            }
            resolve(JSON.parse(unescapeHtmlAttribute(match[1])));
          });
        })
        .on("error", reject);
    });
  }

  function unescapeHtmlAttribute(value: string): string {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#x2F;/g, "/")
      .replace(/&#x3D;/g, "=")
      .replace(/&#x60;/g, "`")
      .replace(/&amp;/g, "&");
  }

  function postJson(path: string, body: unknown): Promise<number> {
    return new Promise((resolve, reject) => {
      const json = JSON.stringify(body);
      const request = http.request(
        `${baseUrl}${path}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(json)
          }
        },
        response => {
          response.resume();
          response.on("end", () => resolve(response.statusCode));
        }
      );
      request.on("error", reject);
      request.write(json);
      request.end();
    });
  }

  test("The tracker page receives no shutdown or rebuild capability, even though both ALLOW_* flags are true", async () => {
    const environment = await getEnvironmentJSON("/e/");
    expect(environment.CanShutdownServer).toBe(false);
    expect(environment.ShutdownToken).toBeNull();
    expect(environment.CanRebuildServer).toBe(false);
    expect(environment.RebuildToken).toBeNull();
  });

  test("POST /shutdown 404s - the route itself doesn't exist", async () => {
    const status = await postJson("/shutdown", { token: "anything" });
    expect(status).toBe(404);
    expect(shutdownServer).not.toHaveBeenCalled();
  });

  test("POST /rebuild 404s - the route itself doesn't exist", async () => {
    const status = await postJson("/rebuild", { token: "anything" });
    expect(status).toBe(404);
    expect(rebuildClient).not.toHaveBeenCalled();
  });
});
