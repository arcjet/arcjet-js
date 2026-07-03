/**
 * Cloudflare Worker that exercises the core `arcjet` SDK `protect()` call.
 *
 * It wires the SDK the same way a Cloudflare adapter would:
 *
 * - `@arcjet/protocol/client.js` `createClient`
 * - `@arcjet/transport` `createTransport`, which resolves to the `workerd`
 *   export condition on Cloudflare
 *
 * then runs a remote rule (token bucket) through `protect()` against the mock
 * `DecideService` server passed in via the `ARCJET_BASE_URL` binding.
 */
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";

import arcjet, { tokenBucket } from "../../../dist/index.js";

interface Env {
  ARCJET_BASE_URL: string;
}

// Minimal no-op logger matching the SDK's logger interface.
const log = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    try {
      const client = createClient({
        baseUrl: env.ARCJET_BASE_URL,
        timeout: 5000,
        sdkStack: "NODEJS",
        sdkVersion: "test",
        transport: createTransport(env.ARCJET_BASE_URL),
      });

      const aj = arcjet({
        key: "ajkey_dummy",
        rules: [tokenBucket({ refillRate: 10, interval: 60, capacity: 100 })],
        client,
        log,
      });

      const decision = await aj.protect(
        { getBody: async () => "" },
        {
          ip: "1.2.3.4",
          method: "GET",
          protocol: "http",
          host: "localhost",
          path: "/",
          headers: { "user-agent": "test" },
          cookies: "",
          query: "",
          requested: 1,
        },
      );

      return Response.json({
        conclusion: decision.conclusion,
        isErrored: decision.isErrored(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      return Response.json({ error: message, stack }, { status: 500 });
    }
  },
};
