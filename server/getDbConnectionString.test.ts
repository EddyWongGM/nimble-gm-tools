import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("mongodb-memory-server");
jest.mock("mongodb");

import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { closeLocalDb, getDbConnectionString } from "./getDbConnectionString";

describe("closeLocalDb", () => {
  const previousDbConnectionString = process.env.DB_CONNECTION_STRING;
  const previousLocalDbPath = process.env.LOCAL_DB_PATH;
  let tempDbPath: string;

  afterEach(() => {
    jest.resetAllMocks();
    if (previousDbConnectionString === undefined) {
      delete process.env.DB_CONNECTION_STRING;
    } else {
      process.env.DB_CONNECTION_STRING = previousDbConnectionString;
    }
    if (previousLocalDbPath === undefined) {
      delete process.env.LOCAL_DB_PATH;
    } else {
      process.env.LOCAL_DB_PATH = previousLocalDbPath;
    }
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      fs.rmdirSync(tempDbPath, { recursive: true });
    }
  });

  // Must run before any test that calls getDbConnectionString() - the module
  // only tracks its mongod instance as private state set the first time
  // getDbConnectionString() runs, so this is the only point at which that
  // state is still unset.
  test("Should do nothing if the local DB was never started", async () => {
    await expect(closeLocalDb()).resolves.toBeUndefined();
  });

  test("Should not throw when mongod.stop() rejects", async () => {
    const stop = jest.fn().mockRejectedValue(new Error("already exited"));
    (MongoMemoryServer.create as jest.Mock).mockResolvedValue({
      getUri: jest.fn().mockResolvedValue("mongodb://127.0.0.1:1/unreachable"),
      stop
    });
    // The real network/mongod behavior behind the admin shutdown command
    // isn't what's under test here, and letting it run for real risks a
    // slow/flaky test (the driver's default server selection timeout is 30s)
    // - a fast, controllable mock keeps this deterministic.
    (MongoClient as unknown as jest.Mock).mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue({
        command: jest.fn().mockResolvedValue({ ok: 1 })
      }),
      close: jest.fn().mockResolvedValue(undefined)
    }));

    delete process.env.DB_CONNECTION_STRING;
    tempDbPath = fs.mkdtempSync(path.join(os.tmpdir(), "ii-db-test-"));
    process.env.LOCAL_DB_PATH = tempDbPath;

    await getDbConnectionString();

    // If mongod.stop()'s rejection isn't caught, this call itself rejects
    // and process.exit(0) in shutdownServer() (which awaits closeLocalDb())
    // never runs - this is a regression test for that.
    await expect(closeLocalDb()).resolves.toBeUndefined();
    expect(stop).toHaveBeenCalledWith({ doCleanup: false, force: false });
  });
});
