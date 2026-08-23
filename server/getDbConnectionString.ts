import * as fs from "fs";
import { MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as path from "path";

let mongod: MongoMemoryServer | undefined;

export async function getDbConnectionString() {
  if (process.env.DB_CONNECTION_STRING) {
    return process.env.DB_CONNECTION_STRING;
  }

  const dbPath =
    process.env.LOCAL_DB_PATH || path.join(__dirname, "..", "data", "db");
  fs.mkdirSync(dbPath, { recursive: true });

  console.log(`No connection string found, using local database at ${dbPath}`);
  mongod = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: "wiredTiger" }
  });
  return await mongod.getUri();
}

// mongodb-memory-server only performs a graceful mongod shutdown (which
// flushes WiredTiger to disk) for replica sets - for our standalone local
// instance it hard-kills the process, which can lose recent writes. Issuing
// the shutdown command ourselves over the wire protocol sidesteps that.
export async function closeLocalDb() {
  if (!mongod) {
    return;
  }
  const uri = await mongod.getUri();
  const client = new MongoClient(uri);
  try {
    await client.connect();
    await client.db("admin").command({ shutdown: 1, force: true });
  } catch {
    // The connection closing as mongod shuts down is expected here.
  } finally {
    await client.close().catch(() => {});
  }
  // mongod has already been sent the shutdown command above by the time we
  // get here, so a failure from stop() (e.g. it's already exited) shouldn't
  // stop the caller's own process.exit() from running.
  await mongod
    .stop({ doCleanup: false, force: false })
    .catch(err => console.warn("mongod.stop() did not complete cleanly", err));
}
