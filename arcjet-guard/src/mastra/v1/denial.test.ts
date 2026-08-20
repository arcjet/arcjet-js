import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { denialResult, deniedReason, unavailableResult } from "../../agents/denial.ts";
import * as mastraDenial from "./denial.ts";

describe("mastra/v1/denial", () => {
  test("re-exports the shared payload builders", () => {
    assert.strictEqual(mastraDenial.denialResult, denialResult);
    assert.strictEqual(mastraDenial.deniedReason, deniedReason);
    assert.strictEqual(mastraDenial.unavailableResult, unavailableResult);
  });
});
