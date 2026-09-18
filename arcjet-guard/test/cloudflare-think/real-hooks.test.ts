// oxlint-disable typescript/no-unsafe-type-assertion -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@cloudflare/think` `beforeToolCall` /
 * `ToolCallDecision` contract, rather than the structural fakes in
 * `src/cloudflare-think/v0/*.test.ts`.
 *
 * These assertions live outside `src/cloudflare-think/` — that directory
 * is globbed by the cloudflare-think-absent CI job and scanned for
 * type-only imports.
 *
 * Floor is `@cloudflare/think@0.3.0`: that release made
 * `beforeToolCall` return a functional `ToolCallDecision`
 * (`allow` / `block` / `substitute`) and wraps every server-side
 * tool's `execute` so the hook runs first. 0.19.0 still publishes
 * that same union. The package cannot be value-imported in Node
 * (`cloudflare:` URL scheme), so this suite type-imports the SDK
 * and reads the installed `.d.ts`.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import type { ToolCallContext, ToolCallDecision } from "@cloudflare/think";

import type { ArcjetDenialResult } from "../../src/agents/denial.ts";
import { guardHooks } from "../../src/cloudflare-think/v0/hooks.ts";
import { asDenial } from "../_shared/source-scan.ts";
import { decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

function thinkPackageRoot(): string {
  const candidates = [
    resolve(import.meta.dirname, "../../node_modules/@cloudflare/think"),
    resolve(import.meta.dirname, "../../../node_modules/@cloudflare/think"),
  ];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, "package.json"))) {
      return candidate;
    }
  }
  throw new Error("could not find the installed @cloudflare/think package");
}

function toolCtx(name: string, input: unknown = {}): ToolCallContext {
  return {
    type: "tool-call",
    toolName: name,
    toolCallId: "call-1",
    input,
    messages: [],
    abortSignal: undefined,
    stepNumber: 0,
  } as ToolCallContext;
}

function readInstalledThinkTypes(): string {
  const pkgRoot = thinkPackageRoot();
  const pkg = JSON.parse(readFileSync(resolve(pkgRoot, "package.json"), "utf-8")) as {
    version?: string;
  };
  assert.equal(pkg.version, "0.19.0");
  const thinkDts = readFileSync(resolve(pkgRoot, "dist/think.d.ts"), "utf-8");
  const chunk = /from "\.\/([^"]+)"/.exec(thinkDts);
  assert.ok(chunk?.[1], "think.d.ts must re-export the bundled types");
  const chunkFile = chunk[1].replace(/\.js$/, ".d.ts");
  return `${thinkDts}\n${readFileSync(resolve(pkgRoot, "dist", chunkFile), "utf-8")}`;
}

test("installed Think types keep the 0.3.0 beforeToolCall ToolCallDecision", () => {
  const types = readInstalledThinkTypes();
  assert.match(types, /ToolCallDecision/);
  assert.match(types, /action: "allow"/);
  assert.match(types, /action: "block"/);
  assert.match(types, /action: "substitute"/);
  assert.match(types, /beforeToolCall\s*\(/);
  assert.match(types, /ToolCallDecision \| void \| Promise<ToolCallDecision \| void>/);
});

test("default DENY is a 0.3.0 substitute decision the model can read", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result: ToolCallDecision | void = await hooks.beforeToolCall(toolCtx("lookup"));
  assert.ok(result && result.action === "substitute");
  const denial = asDenial<ArcjetDenialResult>(result.output);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("onDeny block is a 0.3.0 block decision", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result: ToolCallDecision | void = await hooks.beforeToolCall(toolCtx("lookup"));
  assert.ok(result && result.action === "block");
  assert.match(String(result.reason), /PROMPT_INJECTION/);
});
