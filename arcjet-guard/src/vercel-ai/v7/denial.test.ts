import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { denialResult, deniedReason, unavailableResult } from "../../agents/denial.ts";
import * as vercelAiDenial from "./denial.ts";

describe("vercel-ai/v7/denial", () => {
  test("re-exports the shared payload builders", () => {
    assert.strictEqual(vercelAiDenial.denialResult, denialResult);
    assert.strictEqual(vercelAiDenial.deniedReason, deniedReason);
    assert.strictEqual(vercelAiDenial.unavailableResult, unavailableResult);
  });
});
