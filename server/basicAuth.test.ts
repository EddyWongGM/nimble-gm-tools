import * as express from "express";
import * as http from "http";
import { AddressInfo } from "net";

import { configureBasicAuth } from "./basicAuth";

function buildApp(): express.Application {
  const app = express();
  configureBasicAuth(app);
  app.get("/", (req, res) => res.sendStatus(200));
  return app;
}

function request(
  baseUrl: string,
  authorization?: string
): Promise<{ status: number; wwwAuthenticate?: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(
        baseUrl,
        authorization ? { headers: { authorization } } : {},
        response => {
          response.resume();
          response.on("end", () =>
            resolve({
              status: response.statusCode as number,
              wwwAuthenticate: response.headers["www-authenticate"] as string
            })
          );
        }
      )
      .on("error", reject);
  });
}

async function startServer(app: express.Application) {
  const httpServer = http.createServer(app);
  await new Promise<void>(resolve => httpServer.listen(0, resolve));
  const address = httpServer.address() as AddressInfo;
  return { httpServer, baseUrl: `http://127.0.0.1:${address.port}` };
}

describe("Basic Auth gate", () => {
  const previousUsername = process.env.BASIC_AUTH_USERNAME;
  const previousPassword = process.env.BASIC_AUTH_PASSWORD;

  afterEach(() => {
    process.env.BASIC_AUTH_USERNAME = previousUsername;
    process.env.BASIC_AUTH_PASSWORD = previousPassword;
  });

  test("passes every request through when unconfigured", async () => {
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;

    const { httpServer, baseUrl } = await startServer(buildApp());
    try {
      const response = await request(baseUrl);
      expect(response.status).toBe(200);
    } finally {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  test("rejects a request with no credentials when configured", async () => {
    process.env.BASIC_AUTH_USERNAME = "dm";
    process.env.BASIC_AUTH_PASSWORD = "correct-horse";

    const { httpServer, baseUrl } = await startServer(buildApp());
    try {
      const response = await request(baseUrl);
      expect(response.status).toBe(401);
      expect(response.wwwAuthenticate).toMatch(/^Basic /);
    } finally {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  test("rejects wrong credentials", async () => {
    process.env.BASIC_AUTH_USERNAME = "dm";
    process.env.BASIC_AUTH_PASSWORD = "correct-horse";

    const { httpServer, baseUrl } = await startServer(buildApp());
    try {
      const wrongHeader =
        "Basic " + Buffer.from("dm:wrong-password").toString("base64");
      const response = await request(baseUrl, wrongHeader);
      expect(response.status).toBe(401);
    } finally {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });

  test("accepts the correct credentials", async () => {
    process.env.BASIC_AUTH_USERNAME = "dm";
    process.env.BASIC_AUTH_PASSWORD = "correct-horse";

    const { httpServer, baseUrl } = await startServer(buildApp());
    try {
      const correctHeader =
        "Basic " + Buffer.from("dm:correct-horse").toString("base64");
      const response = await request(baseUrl, correctHeader);
      expect(response.status).toBe(200);
    } finally {
      await new Promise<void>(resolve => httpServer.close(() => resolve()));
    }
  });
});
