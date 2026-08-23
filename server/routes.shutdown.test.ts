// These module-level env vars are read by routes.ts (and configureOpen5eContent.ts)
// at import time, so they must be set before routes.ts is first required below.
process.env.BASE_URL = "http://127.0.0.1";
process.env.ALLOW_SERVER_SHUTDOWN = "true";
process.env.SKIP_OPEN5E_API = "1";
delete process.env.DEFAULT_ACCOUNT_LEVEL; // avoid touching the DB for this test
delete process.env.PATREON_URL;
delete process.env.AFFILIATE_ROUTES;
delete process.env.METRICS_DB_CONNECTION_STRING;
delete process.env.REDIS_URL;
delete process.env.DB_CONNECTION_STRING;

jest.mock("./shutdown");

import * as express from "express";
import expressSession = require("express-session");
import * as http from "http";
import { AddressInfo } from "net";

import { shutdownServer } from "./shutdown";
import { PlayerViewManager } from "./playerviewmanager";
// routes.ts's module-level constants (allowServerShutdown, shutdownToken,
// etc.) are computed once, so it must be required after the env vars above
// are set - a static `import` would be hoisted ahead of them.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ConfigureRoutes = require("./routes").default;

describe("Shutdown route and per-page ShutdownToken scoping", () => {
  let httpServer: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    const sessionMiddleware = expressSession({
      secret: "routes-shutdown-test-secret",
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

  function postShutdown(token?: unknown): Promise<number> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(token === undefined ? {} : { token });
      const request = http.request(
        `${baseUrl}/shutdown`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body)
          }
        },
        response => {
          response.resume();
          response.on("end", () => resolve(response.statusCode));
        }
      );
      request.on("error", reject);
      request.write(body);
      request.end();
    });
  }

  test("The tracker page receives a shutdown capability and token", async () => {
    const environment = await getEnvironmentJSON("/e/");
    expect(environment.CanShutdownServer).toBe(true);
    expect(typeof environment.ShutdownToken).toBe("string");
    expect(environment.ShutdownToken.length).toBeGreaterThan(0);
  });

  test("The Player View page does not receive shutdown capability or a token", async () => {
    const environment = await getEnvironmentJSON("/p/some-encounter-id");
    expect(environment.CanShutdownServer).toBe(false);
    expect(environment.ShutdownToken).toBeNull();
  });

  test("POST /shutdown without the correct token is rejected and does not shut down", async () => {
    const status = await postShutdown("not-the-real-token");
    expect(status).toBe(403);
    expect(shutdownServer).not.toHaveBeenCalled();
  });

  test("POST /shutdown with no token at all is rejected", async () => {
    const status = await postShutdown(undefined);
    expect(status).toBe(403);
    expect(shutdownServer).not.toHaveBeenCalled();
  });

  test("POST /shutdown with the token handed to the tracker page succeeds", async () => {
    const environment = await getEnvironmentJSON("/e/");

    const status = await postShutdown(environment.ShutdownToken);

    expect(status).toBe(200);
    expect(shutdownServer).toHaveBeenCalledTimes(1);
  });
});
