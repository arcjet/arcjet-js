import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { extractImportSpecifiers } from "../../../test/_shared/source-scan.ts";
import * as agentsBarrel from "../../agents/index.ts";
import * as v1Namespace from "./index.ts";
import type {
  ArcjetDenialResult,
  ArcjetHookFamily,
  ArcjetHooksOptions,
  GuardApprovalPolicy,
  GuardApprovalResponsePolicy,
  GuardInboundOptions,
  GuardToolPolicy,
  InboundVerdict,
} from "./index.ts";

/**
 * `Object.keys` on a namespace import never lists type-only exports, so assert
 * them at type level instead: this stops compiling if the barrel drops one.
 */
function verifyTypeExports(): void {
  const approvalPolicy: GuardApprovalPolicy | undefined = undefined;
  const approvalResponsePolicy: GuardApprovalResponsePolicy | undefined = undefined;
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const inboundOptions: GuardInboundOptions | undefined = undefined;
  const inboundVerdict: InboundVerdict | undefined = undefined;
  const hookFamily: ArcjetHookFamily | undefined = undefined;
  const hooksOptions: ArcjetHooksOptions | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  void [
    approvalPolicy,
    approvalResponsePolicy,
    toolPolicy,
    inboundOptions,
    inboundVerdict,
    hookFamily,
    hooksOptions,
    denialResult,
  ];
}

verifyTypeExports();

// `/v0`'s barrel types against Eve 0.x hooks, which this project type-checks
// against Eve 1.x. A non-literal specifier loads it at runtime without the type
// checker following it.
const v0Specifier: string = "../v0/index.ts";
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- module namespace object
const v0 = (await import(v0Specifier)) as Record<string, unknown>;
const v1 = v1Namespace as Record<string, unknown>;

test("/v1 exports exactly the /v0 keys", () => {
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  assert.deepEqual(Object.keys(v1).sort(), Object.keys(v0).sort());
});

// Only `arcjetHooks` depends on the session event model Eve 1.0 replaced. The
// tool, approval, inbound, and session-context helpers read contracts Eve 1.x
// kept, so both paths share one implementation and return the same objects.
test("/v1 shares every export with /v0 except arcjetHooks", () => {
  for (const key of Object.keys(v0)) {
    if (key === "arcjetHooks") {
      assert.notStrictEqual(v1[key], v0[key], "arcjetHooks must be the Eve 1.x implementation");
      continue;
    }
    assert.strictEqual(
      v1[key],
      v0[key],
      `${key} must be the same object from @arcjet/guard/vercel-eve/v0 and /v1`,
    );
  }
});

test("/v1 re-exports the agents barrel with the same identities", () => {
  const agents = agentsBarrel as Record<string, unknown>;
  for (const key of Object.keys(agentsBarrel)) {
    assert.strictEqual(v1[key], agents[key], `${key} must be the agents barrel object`);
  }
});

test("/v1 imports from /v0 only the modules that do not depend on Eve's major", () => {
  const content = readFileSync(resolve(import.meta.dirname, "index.ts"), "utf-8");
  assert.deepEqual(
    extractImportSpecifiers(content).filter((specifier) => specifier.startsWith("../v0/")),
    [
      "../v0/context.ts",
      "../v0/guard-approval.ts",
      "../v0/guard-approval.ts",
      "../v0/guard-tool.ts",
      "../v0/guard-tool.ts",
      "../v0/guard-inbound.ts",
      "../v0/guard-inbound.ts",
    ],
  );
});

test("package.json maps ./vercel-eve/v1 to its own dist entry", () => {
  const packageJson: unknown = JSON.parse(
    readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf-8"),
  );
  assert.ok(typeof packageJson === "object" && packageJson !== null && "exports" in packageJson);
  const exportsMap = packageJson.exports;
  assert.ok(typeof exportsMap === "object" && exportsMap !== null);
  assert.deepEqual(new Map(Object.entries(exportsMap)).get("./vercel-eve/v1"), {
    types: "./dist/vercel-eve/v1/index.d.ts",
    import: "./dist/vercel-eve/v1/index.js",
  });
});
