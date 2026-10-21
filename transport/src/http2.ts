/**
 * Direct HTTP/2 Connect transport factory shared by `@arcjet/transport` and
 * `@arcjet/guard`.
 *
 * Exported as `@arcjet/transport/http2` so callers that need Node's
 * `connect-node` HTTP/2 path unconditionally (notably `@arcjet/guard` on Bun,
 * where the package's `"bun"` condition resolves to fetch/HTTP/1.1) can import
 * it without hitting a runtime-conditioned entry point.
 *
 * Bun implements `node:http2` but its `fetch` does not support HTTP/2
 * ({@link https://github.com/oven-sh/bun/issues/7194}), which is why Guard
 * keeps a separate Bun entry for proxying while still using this factory for
 * the direct path.
 */

import type { ClientSessionOptions, Http2Session, SecureClientSessionOptions } from "node:http2";

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

import { withConnectionRecycling } from "./connection-recycle.js";

/**
 * Optional `http2.connect` session options forwarded to `Http2SessionManager`.
 *
 * Used by the Node proxy path to tunnel HTTP/2 through `CONNECT` via
 * `createConnection`.
 */
export type Http2ConnectOptions = ClientSessionOptions | SecureClientSessionOptions;

/**
 * A direct HTTP/2 transport plus the session manager that owns its connection.
 *
 * The session manager is exposed so callers (and tests) can tear the
 * connection down deterministically.
 */
export interface Http2TransportHandle {
  transport: Transport;
  sessionManager: Http2SessionManager;
}

/**
 * Create a direct HTTP/2 Connect transport, optimistically pre-connecting.
 *
 * The session is pre-connected so the first RPC doesn't pay the full TCP + TLS
 * setup cost (skipped under Deno's Node HTTP/2 compatibility layer, which can
 * surface background session failures as uncaught test errors). PING keep-alive
 * and deadline-based connection recycling detect a silently dropped connection
 * (an intermediary expiring an idle flow without notifying either end) and
 * replace it, instead of letting a dead session fail every call until the
 * process restarts — or, on serverless, leaving a GOAWAY from a peer-closed
 * idle connection as an uncaught exception on a frozen instance.
 *
 * @param baseUrl Base URL for the Arcjet API.
 * @param http2SessionOptions Optional options passed to `http2.connect`
 *   (for example a `createConnection` tunnel).
 * @returns The transport and its session manager.
 */
export function createHttp2Transport(
  baseUrl: string,
  http2SessionOptions?: Http2ConnectOptions,
): Http2TransportHandle {
  const sessionManager = new GuardedHttp2SessionManager(
    baseUrl,
    {
      // Detect and survive silently dropped connections:
      //
      // - `pingIntervalMs` sends PING frames on connections with in-flight
      //   streams and, crucially, verifies a connection with a PING before
      //   reusing it after `pingIntervalMs` of inactivity — transparently
      //   dialing a fresh connection when the old one is dead.
      // - `pingIdleConnection` extends the pings to idle connections, keeping
      //   NAT/conntrack entries on the path alive (AWS NAT gateways expire idle
      //   flows at 350s, Global Accelerator at 340s). Global Accelerator's idle
      //   timeout is not reset by dataless TCP keepalive packets, but HTTP/2
      //   PING frames are stream data, which does reset it. Ref:
      //   https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html#about-idle-timeout
      //   Idle connections and the ping timers are unref'd by connect-es, so
      //   this does not keep a quiescent process from exiting.
      // - `pingTimeoutMs` bounds how long a dead connection lingers once a PING
      //   goes unanswered; the default of 15s is slow next to typical Arcjet
      //   call timeouts of 1-2s.
      // - `idleConnectionTimeoutMs` still closes a connection nothing has used
      //   for a while; the pre-request verification above makes the subsequent
      //   re-dial transparent.
      pingIntervalMs: 55 * 1000,
      pingTimeoutMs: 5 * 1000,
      pingIdleConnection: true,
      idleConnectionTimeoutMs: 340 * 1000,
    },
    http2SessionOptions,
  );

  // Optimistic pre-connect. In Deno, the Node HTTP/2 compatibility layer can
  // surface background session failures as uncaught test errors, so we only
  // warm the connection outside Deno. Failures are ignored because the real
  // RPC call will retry the connection anyway.
  if (!("Deno" in globalThis)) {
    void sessionManager.connect().catch(() => {});
  }

  const transport = withConnectionRecycling(
    createConnectTransport({
      baseUrl,
      httpVersion: "2",
      sessionManager,
    }),
    sessionManager,
  );

  return { transport, sessionManager };
}

/**
 * Session manager whose sessions cannot raise an uncaught exception once they
 * are destroyed.
 *
 * `Http2SessionManager` destroys a session with an error when a PING times out
 * or a GOAWAY arrives on an idle connection, and Node emits that `error` event
 * on a later tick. If a request replaces the session before then, the manager
 * has already removed its `error` listener, so Node throws the error as an
 * uncaught exception. Its keep-alive timer can also call `ping()` on a session
 * that is already destroyed, which throws synchronously. Both happen when a
 * serverless runtime thaws a frozen instance and every overdue timer and
 * pending socket event runs in the same pass.
 *
 * Each session that serves a request is guarded by {@linkcode guardSession}.
 * A session opened by the optimistic pre-connect is guarded by the first
 * request that uses it.
 */
class GuardedHttp2SessionManager extends Http2SessionManager {
  override async request(
    ...parameters: Parameters<Http2SessionManager["request"]>
  ): ReturnType<Http2SessionManager["request"]> {
    const stream = await super.request(...parameters);
    if (stream.session !== undefined) {
      guardSession(stream.session);
    }
    return stream;
  }
}

const guardedSessions = new WeakSet<Http2Session>();

/**
 * Keep a no-op `error` listener on `session` for its whole life, and make
 * `ping()` on it a no-op once it is destroyed.
 *
 * The manager's own listener still receives every error while it is
 * attached; this one only stops Node from treating an error as unhandled
 * after the manager has let go of the session.
 *
 * @param session Session that served a request.
 */
function guardSession(session: Http2Session): void {
  if (guardedSessions.has(session)) {
    return;
  }
  guardedSessions.add(session);

  session.on("error", () => {});

  const ping = session.ping.bind(session);
  Object.defineProperty(session, "ping", {
    configurable: true,
    value(...parameters: Parameters<typeof ping>): boolean {
      if (session.destroyed) {
        return false;
      }
      return ping(...parameters);
    },
    writable: true,
  });
}
