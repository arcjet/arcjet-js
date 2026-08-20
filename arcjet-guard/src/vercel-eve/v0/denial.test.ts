import { strict as assert } from "node:assert";
import { describe, test } from "node:test";

import { denialResult, deniedReason, unavailableResult } from "../../agents/denial.ts";
import * as eveDenial from "./denial.ts";

describe("vercel-eve/v0/denial", () => {
  test("re-exports the shared payload builders", () => {
    assert.strictEqual(eveDenial.denialResult, denialResult);
    assert.strictEqual(eveDenial.deniedReason, deniedReason);
    assert.strictEqual(eveDenial.unavailableResult, unavailableResult);
  });
});
