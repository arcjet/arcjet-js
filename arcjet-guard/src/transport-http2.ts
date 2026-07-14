/**
 * Direct HTTP/2 transport factory shared by the `@arcjet/guard` Node and Bun
 * entry points.
 *
 * Both Node and Bun talk to the Arcjet API over HTTP/2 via
 * `@connectrpc/connect-node` (Bun implements `node:http2`, but its `fetch` does
 * not support HTTP/2 — {@link https://github.com/oven-sh/bun/issues/7194}). The
 * proxy strategy differs between the two runtimes, so each entry point handles
 * proxying itself and reuses this for the direct, no-proxy case.
 *
 * @packageDocumentation
 */

import type { Transport } from "@connectrpc/connect";
import { createConnectTransport, Http2SessionManager } from "@connectrpc/connect-node";

import { withConnectionRecycling } from "./transport-recycle.ts";

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
 * The session is pre-connected so the first `.guard()` call doesn't pay the
 * full TCP + TLS setup cost. PING keep-alive and deadline-based connection
 * recycling detect a silently dropped connection (an intermediary expiring an
 * idle flow without notifying either end) and replace it, instead of letting a
 * dead session fail every call until the process restarts.
 *
 * @param baseUrl Base URL for the Arcjet API.
 * @returns The transport and its session manager.
 */
export function createHttp2Transport(baseUrl: string): Http2TransportHandle {
  const sessionManager = new Http2SessionManager(baseUrl, {
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
    //   goes unanswered; the default of 15s is slow next to typical guard
    //   call timeouts of 1-2s.
    // - `idleConnectionTimeoutMs` still closes a connection nothing has used
    //   for a while; the pre-request verification above makes the subsequent
    //   re-dial transparent.
    pingIntervalMs: 55 * 1000,
    pingTimeoutMs: 5 * 1000,
    pingIdleConnection: true,
    idleConnectionTimeoutMs: 340 * 1000,
  });

  // Optimistic pre-connect — failures are silently ignored because the real RPC
  // call will retry the connection anyway.
  void sessionManager.connect().catch(() => {});

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
