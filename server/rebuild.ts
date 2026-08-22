import { spawn } from "child_process";
import * as path from "path";

export interface RebuildResult {
  success: boolean;
  output: string;
}

let activeBuild: Promise<RebuildResult> | null = null;

export function isRebuildInProgress(): boolean {
  return activeBuild !== null;
}

export function rebuildClient(): Promise<RebuildResult> {
  if (activeBuild) {
    return activeBuild;
  }

  const build = new Promise<RebuildResult>(resolve => {
    try {
      // shell: true is required on Windows, where npm resolves to npm.cmd -
      // a .cmd file can only be launched through a shell, so spawning it
      // directly throws a synchronous EINVAL. That throw happens inside this
      // executor, which turns `build` into a rejected promise; without the
      // try/catch here, awaiting it in the route handler crashes the whole
      // server process (an unhandled rejection is fatal by default on
      // modern Node) instead of just failing this one request.
      // The whole command is passed as a single string (rather than a
      // command + args array) because Node warns that args aren't escaped
      // when shell: true is combined with an args array - moot here since
      // there's no user input in the command, but this avoids the warning.
      const child = spawn("npm run build", {
        cwd: path.join(__dirname, ".."),
        shell: true
      });

      let output = "";
      child.stdout?.on("data", chunk => (output += chunk));
      child.stderr?.on("data", chunk => (output += chunk));

      child.on("error", err => {
        resolve({ success: false, output: output + "\n" + err.message });
      });

      child.on("close", code => {
        resolve({ success: code === 0, output });
      });
    } catch (err) {
      resolve({ success: false, output: err.message });
    }
  });

  activeBuild = build.finally(() => {
    activeBuild = null;
  });

  return activeBuild;
}
