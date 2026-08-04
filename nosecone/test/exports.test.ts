import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`nosecone`: should expose the documented export paths", async function () {
  const manifest: unknown = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
  const exportMap = manifest.exports;
  assert.ok(exportMap !== null && typeof exportMap === "object");

  assert.deepEqual(new Set(Object.keys(exportMap)), new Set([".", "./package.json"]));
});

test('`nosecone`: should expose the value exports of "."', async function () {
  const module = await import("nosecone");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set([
      "CONTENT_SECURITY_POLICY_DIRECTIVES",
      "CROSS_ORIGIN_EMBEDDER_POLICIES",
      "CROSS_ORIGIN_OPENER_POLICIES",
      "CROSS_ORIGIN_RESOURCE_POLICIES",
      "NoseconeValidationError",
      "PERMITTED_CROSS_DOMAIN_POLICIES",
      "QUOTED",
      "REFERRER_POLICIES",
      "SANDBOX_DIRECTIVES",
      "createContentSecurityPolicy",
      "createContentTypeOptions",
      "createCrossOriginEmbedderPolicy",
      "createCrossOriginOpenerPolicy",
      "createCrossOriginResourcePolicy",
      "createDnsPrefetchControl",
      "createDownloadOptions",
      "createFrameOptions",
      "createOriginAgentCluster",
      "createPermittedCrossDomainPolicies",
      "createReferrerPolicy",
      "createStrictTransportSecurity",
      "createXssProtection",
      "default",
      "defaults",
      "nosecone",
      "withVercelToolbar",
    ]),
  );
});
