import assert from "node:assert/strict";
import test from "node:test";

import type { Options } from "../dist/index.js";
import { defaults } from "../dist/index.js";

// This file is type-checked against the built `dist/index.d.ts` (see the
// `typecheck` script), so it is a regression test for the *published* type of
// `defaults`, not just its runtime shape. Extending the defaults is the
// documented consumer pattern; it stops compiling if `defaults` widens to
// `Options` (where `contentSecurityPolicy` may be `boolean | undefined`), as
// happened when `isolatedDeclarations` first required an annotation here.
test("@nosecone/next defaults", async function (t) {
  await t.test("should keep concrete CSP directives consumers can extend", function () {
    const directives = {
      ...defaults.contentSecurityPolicy.directives,
      scriptSrc: [...defaults.contentSecurityPolicy.directives.scriptSrc],
      connectSrc: [
        ...defaults.contentSecurityPolicy.directives.connectSrc,
        "https://decide.arcjet.com" as const,
      ],
    };
    const config: Options = {
      ...defaults,
      contentSecurityPolicy: { directives },
    };

    assert.ok(config.contentSecurityPolicy);
    assert.deepEqual(directives.connectSrc, ["'self'", "https://decide.arcjet.com"]);
  });

  await t.test("should keep the directive values usable at runtime", function () {
    assert.ok(Array.isArray(defaults.contentSecurityPolicy.directives.scriptSrc));
    assert.ok(defaults.contentSecurityPolicy.directives.scriptSrc.length > 0);
    assert.ok(Array.isArray(defaults.contentSecurityPolicy.directives.styleSrc));
  });
});
