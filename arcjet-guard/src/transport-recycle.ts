/**
 * Dead-connection recovery for the guard HTTP/2 transport.
 *
 * A long-lived HTTP/2 session can die silently: an intermediary (NAT gateway,
 * L4 load balancer, connection-tracking table) can drop the connection state
 * during an idle period without sending a FIN or RST to either end. The client
 * then holds a session that looks open but black-holes every write, so every
 * RPC times out — and keeps timing out until TCP retransmission gives up many
 * minutes later, because nothing else tears the session down.
 *
 * The PING keep-alive configured in `transport-http2.ts` detects most of this,
 * but as a backstop this wrapper watches RPC outcomes: after a run of
 * consecutive deadline failures with no success in between, it aborts the
 * managed session so the next call dials a fresh connection.
 *
 * @packageDocumentation
 */

import { Code, ConnectError } from "@connectrpc/connect";
import type { Transport } from "@connectrpc/connect";

/**
 * Consecutive deadline failures after which the connection is recycled.
 *
 * High enough that a couple of genuinely slow responses don't kill a healthy
 * connection (aborting also kills any concurrent in-flight streams), low
 * enough that a dead session costs only a few failed-open calls.
 */
export const RECYCLE_AFTER_CONSECUTIVE_DEADLINES = 3;

/**
 * The subset of `Http2SessionManager` the wrapper needs.
 *
 * Narrowed so tests can inject a fake.
 */
export interface RecyclableSession {
  abort(reason?: Error): void;
  connect(): Promise<unknown>;
}

/**
 * Wrap a transport so consecutive deadline failures recycle the connection.
 *
 * Only `Code.DeadlineExceeded` failures count: a dead-but-open session
 * manifests as every call timing out. Caller-initiated aborts surface as
 * `Code.Canceled`, and connection-level failures (refused, reset) already put
 * the session manager into its error state, from which it re-dials on its own.
 * Other errors neither count nor reset the run — only a success proves the
 * connection is alive.
 *
 * @param transport Transport whose unary calls should be watched.
 * @param session Session manager to abort when the threshold is reached.
 * @returns A transport with the same behavior plus connection recycling.
 */
export function withConnectionRecycling(
  transport: Transport,
  session: RecyclableSession,
): Transport {
  let consecutiveDeadlines = 0;

  return {
    async unary(method, signal, timeoutMs, header, input, contextValues) {
      try {
        const response = await transport.unary(
          method,
          signal,
          timeoutMs,
          header,
          input,
          contextValues,
        );
        consecutiveDeadlines = 0;
        return response;
      } catch (error: unknown) {
        if (ConnectError.from(error).code === Code.DeadlineExceeded) {
          consecutiveDeadlines += 1;
          if (consecutiveDeadlines >= RECYCLE_AFTER_CONSECUTIVE_DEADLINES) {
            consecutiveDeadlines = 0;
            recycle(session);
          }
        }
        throw error;
      }
    },
    // Guard is unary-only; pass streaming calls through untouched.
    stream(method, signal, timeoutMs, header, input, contextValues) {
      return transport.stream(method, signal, timeoutMs, header, input, contextValues);
    },
  };
}

/**
 * Abort the session and optimistically re-dial in the background.
 *
 * @param session Session manager holding the suspect connection.
 */
function recycle(session: RecyclableSession): void {
  // Mirror the edge-safe, `ARCJET_LOG_LEVEL`-gated logging pattern of
  // `detect-proxy.ts`: this event is the SDK healing a broken network path,
  // which is worth surfacing during an incident, but stays quiet by default.
  const level = globalThis.process?.env?.["ARCJET_LOG_LEVEL"];
  if (level === "debug" || level === "info" || level === "warn") {
    console.warn(
      "Arcjet: consecutive timeouts talking to the Arcjet API; recycling the connection",
    );
  }

  session.abort(
    new ConnectError("connection recycled after consecutive deadline failures", Code.Unavailable),
  );
  // Optimistic background re-dial so the next call doesn't pay the full
  // connection setup cost. Failures are ignored; the next RPC retries anyway.
  void session.connect().catch(() => {});
}
