/**
 * Cloudflare Worker test — runs all shared test cases inside the Worker
 * using in-memory transport, plus a smoke test against a real mock server.
 *
 * The server URL is passed as the `ARCJET_BASE_URL` binding for the
 * real-network smoke test.
 */

import {
  launchArcjet,
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
} from "../../../src/fetch.ts";
import { cases } from "../../_shared/cases.ts";
import type { GuardSurface } from "../../_shared/cases.ts";

interface Env {
  ARCJET_BASE_URL: string;
}

const surface: GuardSurface = {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // /cases — run all shared test cases via in-memory transport
    if (url.pathname === "/cases") {
      const results: TestResult[] = [];

      for (const tc of cases) {
        try {
          await tc.run(surface);
          results.push({ name: tc.name, passed: true });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ name: tc.name, passed: false, error: message });
        }
      }

      const allPassed = results.every((r) => r.passed);
      return Response.json(
        { allPassed, total: results.length, results },
        { status: allPassed ? 200 : 500 },
      );
    }

    // / — original smoke test against real server
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
