/**
 * Direct HTTP/2 transport factory shared by the `@arcjet/guard` Node and Bun
 * entry points.
 *
 * Re-exports the shared factory from `@arcjet/transport/http2` so Guard and the
 * main SDK stay on the same PING keep-alive and deadline-based recycling
 * behavior. The unconditional `/http2` subpath is required on Bun: the
 * `@arcjet/transport` package `"bun"` condition resolves to fetch/HTTP/1.1,
 * while Guard's Bun entry still wants Node HTTP/2 for the direct (no-proxy)
 * path — Bun implements `node:http2`, but its `fetch` does not support HTTP/2
 * ({@link https://github.com/oven-sh/bun/issues/7194}).
 *
 * @packageDocumentation
 */

export {
  createHttp2Transport,
  type Http2TransportHandle,
} from "@arcjet/transport/http2";
