import assert from "node:assert/strict";
import { test } from "node:test";

import { aiToolsContext } from "./tools-context.ts";
import { createAgentContext } from "../../agents/context.ts";

test("aiToolsContext: includes only branded tools", () => {
  const ctx = createAgentContext({ correlationId: "test_123" });
  const brandSymbol = Symbol.for("arcjet:ai:protected-tool");

  // One protected tool, one unprotected
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-assignment -- Test fixture with both branded and unbranded tools
  const tools = {
    protected_tool: {
      [brandSymbol]: true,
      description: "protected",
    },
    unprotected_tool: {
      description: "unprotected",
    },
  } as any;

  const result = aiToolsContext(ctx, tools);

  // Result should have context only for the protected tool
  assert.equal(Object.keys(result).length, 1);
  assert.ok("protected_tool" in result);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- Accessing untyped result object from aiToolsContext
  assert.equal((result as any).protected_tool, ctx, "should be same reference");
  assert.ok(!("unprotected_tool" in result));
});
