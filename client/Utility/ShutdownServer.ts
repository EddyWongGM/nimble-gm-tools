import axios from "axios";
import { env } from "../Environment";

export async function ConfirmAndShutdownServer(): Promise<void> {
  if (
    confirm(
      "Shut down the Improved Initiative server running on this machine? This will disconnect any Player Views until it is started again."
    )
  ) {
    try {
      await axios.post(
        "/shutdown",
        { token: env.ShutdownToken },
        { headers: { "content-type": "application/json" } }
      );
    } catch (err) {
      // The server tearing down mid-response (connection reset, etc.) looks
      // like a request failure here even when the shutdown itself succeeded,
      // so this isn't treated as an error - just logged and otherwise
      // ignored, and we still confirm below as if it succeeded.
      console.warn("Shutdown request did not complete cleanly", err);
    }

    // Browsers only allow scripts to close tabs/windows they opened themselves
    // (e.g. a popped-out Player View), so this is a best-effort attempt - it
    // silently does nothing for a tab you navigated to normally, and the
    // alert below is the fallback for that case.
    window.close();
    alert("The server has been shut down. You can close this window now.");
  }
}
