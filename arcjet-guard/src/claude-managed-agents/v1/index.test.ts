import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { extractImportSpecifiers } from "../../../test/_shared/source-scan.ts";
import * as v0Namespace from "../v0/index.ts";
import * as v1Namespace from "./index.ts";
import type {
  AgentCustomToolUseEvent,
  ClaudeManagedAgentsContext,
  GuardCustomToolPolicy,
  GuardEventsPolicy,
  UserCustomToolResultEventParams,
} from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardCustomToolPolicy | undefined = undefined;
  const eventsPolicy: GuardEventsPolicy | undefined = undefined;
  const agentContext: ClaudeManagedAgentsContext | undefined = undefined;
  const toolUse: AgentCustomToolUseEvent | undefined = undefined;
  const toolResult: UserCustomToolResultEventParams | undefined = undefined;
  void [toolPolicy, eventsPolicy, agentContext, toolUse, toolResult];
}

verifyTypeExports();

test("/v1 exports exactly the /v0 keys", () => {
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const v1Keys = Object.keys(v1Namespace).sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const v0Keys = Object.keys(v0Namespace).sort();
  assert.deepEqual(v1Keys, v0Keys);
});

test("/v1 exports have the same identity as /v0", () => {
  for (const key of Object.keys(v0Namespace)) {
    assert.strictEqual(
      (v1Namespace as Record<string, unknown>)[key],
      (v0Namespace as Record<string, unknown>)[key],
      `${key} must be the same object from @arcjet/guard/claude-managed-agents/v0 and /v1`,
    );
  }
});

// While the Managed Agents event types are unchanged across SDK majors, /v1
// stays a pure re-export. Giving it its own code is a deliberate fork, and this
// test is the place that decision gets recorded.
test("/v1 source only re-exports /v0", () => {
  const content = readFileSync(resolve(import.meta.dirname, "index.ts"), "utf-8");
  assert.deepEqual(extractImportSpecifiers(content), ["../v0/index.ts"]);
});

test("package.json maps ./claude-managed-agents/v1 to its own dist entry", () => {
  const packageJson: unknown = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf-8"),
  );
  assert.ok(typeof packageJson === "object" && packageJson !== null && "exports" in packageJson);
  const exportsMap = packageJson.exports;
  assert.ok(typeof exportsMap === "object" && exportsMap !== null);
  assert.deepEqual((exportsMap as Record<string, unknown>)["./claude-managed-agents/v1"], {
    types: "./dist/claude-managed-agents/v1/index.d.ts",
    import: "./dist/claude-managed-agents/v1/index.js",
  });
});
