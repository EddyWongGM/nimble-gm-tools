import * as crypto from "crypto";
import * as express from "express";
import * as SocketIO from "socket.io";

// Gates requests behind a single shared username/password. Opt-in only -
// inactive unless both env vars are set, so this has no effect on
// production or local dev. Intended for a dev/staging Heroku instance that
// would otherwise sit wide open at its default *.herokuapp.com URL.
function buildMiddleware(): express.RequestHandler | null {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return null;
  }

  const expectedHeader =
    "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  return (req: express.Request, res: express.Response, next) => {
    const providedHeader = req.headers.authorization;

    if (providedHeader && safeEqual(providedHeader, expectedHeader)) {
      return next();
    }

    // Shared with configureSocketBasicAuth below, where `res` is a raw
    // Node http.ServerResponse (Engine.IO's own middleware pipeline, not
    // Express) - only setHeader/statusCode/end are guaranteed to exist
    // there, unlike Express's res.set/res.status/res.send.
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted"');
    res.statusCode = 401;
    res.end("Authentication required.");
  };
}

// Applied to the Express app, checked on every regular HTTP request before
// anything else runs (session, routes, static files).
export function configureBasicAuth(app: express.Application): void {
  const middleware = buildMiddleware();
  if (middleware) {
    app.use(middleware);
  }
}

// Socket.IO's Engine.IO transport (the WebSocket/polling handshake used for
// live combat/player-view sync) runs its own separate middleware pipeline
// that never passes through the Express app above - the same reason
// sockets.ts separately does `io.engine.use(session)` to share the session
// middleware with socket connections. Without this, the app.use() gate
// alone would leave live sync reachable with no auth at all.
export function configureSocketBasicAuth(io: SocketIO.Server): void {
  const middleware = buildMiddleware();
  if (middleware) {
    io.engine.use(middleware);
  }
}

// Buffer.compare/=== short-circuit on the first differing byte, which leaks
// how many characters of the guess were correct via response timing -
// crypto.timingSafeEqual avoids that, but only accepts equal-length buffers,
// so a length mismatch has to be handled (and rejected) before calling it.
// Exported since patreon.ts's webhook signature check needs the same
// constant-time comparison.
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}
