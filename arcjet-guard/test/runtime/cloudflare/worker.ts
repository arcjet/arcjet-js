/**
 * Cloudflare Worker smoke test — calls a real mock server via the
 * fetch transport and returns the decision as JSON.
 *
 * The server URL is passed as the `ARCJET_BASE_URL` binding.
 */

import { launchArcjet, tokenBucket } from "../../../src/fetch.ts";

interface Env {
  ARCJET_BASE_URL: string;
}

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    try {
      const arcjet = launchArcjet({
        key: "ajkey_dummy",
        baseUrl: env.ARCJET_BASE_URL,
      });

      const limit = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
      const input = limit({ key: "user_1" });

      const decision = await arcjet.guard({
        label: "test.cloudflare",
        rules: [input],
      });

      const result = input.result(decision);

      return Response.json({
        conclusion: decision.conclusion,
        hasError: decision.hasError(),
        remainingTokens: result?.remainingTokens ?? null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: message }, { status: 500 });
    }
  },
};
