import axios from "axios";
import { env } from "../Environment";

export async function RebuildServer(): Promise<void> {
  await axios.post(
    "/rebuild",
    { token: env.RebuildToken },
    { headers: { "content-type": "application/json" } }
  );
}
