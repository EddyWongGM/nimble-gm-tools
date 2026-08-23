import { closeLocalDb } from "./getDbConnectionString";

export async function shutdownServer() {
  await closeLocalDb();
  process.exit(0);
}
