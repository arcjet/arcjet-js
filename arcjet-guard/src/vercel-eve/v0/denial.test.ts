import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import {
  decisionDenyRateLimit,
  decisionDenyRateLimitNoReset,
  decisionDenyPromptInjection,
  decisionDenyPromptInjectionWithReset,
  decisionDenyError,
} from "../../../test/_shared/stub-client.ts";
import { deniedReason, unavailableReason } from "./denial.ts";

describe("vercel-eve/v0/denial", () => {
  describe("deniedReason", () => {
    test("RATE_LIMIT with retry-after hint", () => {
      const now = Date.now();
      const resetAtUnix = Math.floor(now / 1000) + 30; // 30 seconds from now
      const decision = decisionDenyRateLimit(resetAtUnix);

      const reason = deniedReason(decision);

      // Should include seconds hint
      assert.match(reason, /Arcjet denied this call \(RATE_LIMIT\)/);
      assert.match(reason, /It may be retried after \d+ seconds\./);
      assert.match(reason, /after 30 seconds/);
    });

    test("RATE_LIMIT without retry-after hint (no resetAtUnixSeconds)", () => {
      const decision = decisionDenyRateLimitNoReset();

      const reason = deniedReason(decision);

      // Should not include seconds, just "retried later"
      assert.match(reason, /Arcjet denied this call \(RATE_LIMIT\)/);
      assert.match(reason, /It may be retried later\./);
      assert.ok(!reason.includes("seconds"), "Should not mention seconds");
    });

    test("PROMPT_INJECTION (non-rate-limit denial)", () => {
      const decision = decisionDenyPromptInjection();

      const reason = deniedReason(decision);

      assert.match(reason, /Arcjet denied this call \(PROMPT_INJECTION\)/);
      assert.match(reason, /Do not retry/);
      assert.match(reason, /explain the denial to the user/);
    });

    test("ERROR reason (non-rate-limit)", () => {
      const decision = decisionDenyError();

      const reason = deniedReason(decision);

      assert.match(reason, /Arcjet denied this call \(ERROR\)/);
      assert.match(reason, /Do not retry/);
    });

    test("Non-rate-limit denial ignores co-occurring reset time", () => {
      const now = Date.now();
      const resetAtUnix = Math.floor(now / 1000) + 30;
      const decision = decisionDenyPromptInjectionWithReset(resetAtUnix);

      const reason = deniedReason(decision);

      // Should NOT include retry-after seconds because reason is not RATE_LIMIT
      assert.match(reason, /Arcjet denied this call \(PROMPT_INJECTION\)/);
      assert.match(reason, /Do not retry/);
      assert.ok(!reason.includes("seconds"), "Should not mention seconds for non-rate-limit");
      assert.ok(!reason.includes("retried after"), "Should not have 'retried after'");
    });
  });

  describe("unavailableReason", () => {
    test("Returns unavailable message", () => {
      const reason = unavailableReason();

      assert.equal(reason, "Arcjet security check could not be completed; please retry later.");
    });
  });
});
