import assert from "node:assert/strict";
import { describe, test } from "node:test";

import * as fetchEntrypoint from "./fetch.ts";
import * as nodeEntrypoint from "./node.ts";

// Every entrypoint must expose the same public surface — assert it once,
// table-driven, so the two transports can't drift apart.
const entrypoints = [
  { name: "node", module: nodeEntrypoint },
  { name: "fetch", module: fetchEntrypoint },
];

const ruleFactories = [
  "tokenBucket",
  "fixedWindow",
  "slidingWindow",
  "detectPromptInjection",
  "experimental_moderateContent",
  "localDetectSensitiveInfo",
  "defineCustomRule",
] as const;

for (const { name, module } of entrypoints) {
  describe(`${name} entrypoint`, () => {
    test("launchArcjet is exported as a function", () => {
      assert.equal(typeof module.launchArcjet, "function");
    });

    test("createTransport is re-exported", () => {
      assert.equal(typeof module.createTransport, "function");
    });

    test("rule factories are re-exported", () => {
      for (const factory of ruleFactories) {
        assert.equal(typeof module[factory], "function", `${factory} should be a function`);
      }
    });

    test("launchArcjetWithTransport is re-exported", () => {
      assert.equal(typeof module.launchArcjetWithTransport, "function");
    });

    test("launchArcjet returns an object with .guard()", () => {
      const arcjet = module.launchArcjet({ key: "ajkey_test" });

      assert.equal(typeof arcjet.guard, "function");
    });
  });
}
