import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";

import * as bunEntrypoint from "./bun.ts";
import * as fetchEntrypoint from "./fetch.ts";
import {
  launchArcjetWithTransport,
  _launchWithTransportFactory,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  moderateContent,
  experimental_moderateContent,
  localDetectSensitiveInfo,
  defineCustomRule,
} from "./index.ts";
import type { DiagnosticLogger } from "./index.ts";
import * as nodeEntrypoint from "./node.ts";
import {
  DecideService,
  GuardResponseSchema,
  GuardDecisionSchema,
  GuardRuleResultSchema,
  ResultTokenBucketSchema,
  GuardConclusion,
  GuardRuleType,
} from "./proto/proto/decide/v2/decide_pb.js";

/**
 * The three runtime entrypoints, spread so their exports can be probed by name.
 *
 * Imported statically rather than with `await import(specifier)`, which returns
 * `any` and would make every lookup below an unchecked assignment.
 */
const entrypoints: readonly (readonly [string, Record<string, unknown>])[] = [
  ["./node.ts", { ...nodeEntrypoint }],
  ["./bun.ts", { ...bunEntrypoint }],
  ["./fetch.ts", { ...fetchEntrypoint }],
];

describe("re-exports", () => {
  test("DiagnosticLogger is nameable by consumers", () => {
    // A compile-time assertion, not a runtime one: `DiagnosticLogger` is the
    // type of `LaunchOptions.logger`, so a consumer must be able to name what
    // they have to implement. It was previously used in the public option but
    // never exported. If the export is dropped, this file stops typechecking —
    // which the package's own lint pass runs.
    const logger: DiagnosticLogger = {
      warn(fields, message): void {
        void fields;
        void message;
      },
    };

    assert.equal(typeof logger.warn, "function");
  });

  test("rule factories are exported", () => {
    assert.equal(typeof tokenBucket, "function");
    assert.equal(typeof fixedWindow, "function");
    assert.equal(typeof slidingWindow, "function");
    assert.equal(typeof detectPromptInjection, "function");
    assert.equal(typeof moderateContent, "function");
    // oxlint-disable-next-line typescript/no-deprecated -- back-compat coverage of the deprecated alias
    assert.equal(typeof experimental_moderateContent, "function");
    // oxlint-disable-next-line typescript/no-deprecated -- back-compat coverage of the deprecated alias
    assert.equal(experimental_moderateContent, moderateContent);
    assert.equal(typeof localDetectSensitiveInfo, "function");
    assert.equal(typeof defineCustomRule, "function");
  });

  test("rule factories are exported from every entrypoint", () => {
    // Single source of truth for runtime entrypoints (node/bun/fetch).
    // The index barrel is covered by "rule factories are exported" above.
    for (const [specifier, entrypoint] of entrypoints) {
      for (const name of [
        "tokenBucket",
        "fixedWindow",
        "slidingWindow",
        "detectPromptInjection",
        "moderateContent",
        "experimental_moderateContent",
        "localDetectSensitiveInfo",
        "defineCustomRule",
      ]) {
        assert.equal(typeof entrypoint[name], "function", `${specifier} must export ${name}`);
      }
      assert.equal(
        entrypoint["experimental_moderateContent"],
        entrypoint.moderateContent,
        `${specifier} experimental_moderateContent must alias moderateContent`,
      );
    }
  });

  test("launchArcjetWithTransport is exported", () => {
    assert.equal(typeof launchArcjetWithTransport, "function");
  });

  test("registration and the free calls are exported from every entrypoint", () => {
    // The `exports` map resolves "." to one of these three by runtime
    // condition, so a symbol missing from any one of them is missing from the
    // package on that runtime.
    for (const [specifier, entrypoint] of entrypoints) {
      for (const name of ["registerArcjet", "unregisterArcjet", "guard", "capture", "flush"]) {
        assert.equal(typeof entrypoint[name], "function", `${specifier} must export ${name}`);
      }
    }
  });

  test("the registry's internals stay off the public entrypoints", () => {
    // These exist so `registry.ts` and `testing.ts` can share code with
    // `client.ts`; they are `@internal` and no `exports` entry resolves to the
    // modules that declare them. Re-exporting one here would publish it by
    // accident, which no other check would catch.
    const internals = [
      "registerArcjetForTesting",
      "registeredClient",
      "createFailOpenDecision",
      "normalizeCaptureEvent",
      "symbolArcjetDiagnostics",
      "symbolArcjetClient",
    ];

    for (const [specifier, entrypoint] of entrypoints) {
      for (const name of internals) {
        assert.equal(name in entrypoint, false, `${specifier} must not export ${name}`);
      }
    }
  });

  test("_launchWithTransportFactory is exported", () => {
    assert.equal(typeof _launchWithTransportFactory, "function");
  });
});

describe("launchArcjetWithTransport", () => {
  test("creates a guard client with guard, capture, and flush methods", () => {
    const transport = createRouterTransport(({ service }) => {
      service(DecideService, {
        guard: () => create(GuardResponseSchema, {}),
      });
    });

    const arcjet = launchArcjetWithTransport({
      key: "ajkey_test",
      transport,
    });

    assert.equal(typeof arcjet.guard, "function");
    assert.equal(typeof arcjet.capture, "function");
    assert.equal(typeof arcjet.flush, "function");
  });

  test("guard() calls through to transport and returns a decision", async () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1" });

    const transport = createRouterTransport(({ service }) => {
      service(DecideService, {
        guard: (req) => {
          const sub = req.ruleSubmissions[0];
          return create(GuardResponseSchema, {
            decision: create(GuardDecisionSchema, {
              id: "gdec_idx",
              conclusion: GuardConclusion.ALLOW,
              ruleResults: [
                create(GuardRuleResultSchema, {
                  resultId: "gres_1",
                  configId: sub.configId,
                  inputId: sub.inputId,
                  type: GuardRuleType.TOKEN_BUCKET,
                  result: {
                    case: "tokenBucket",
                    value: create(ResultTokenBucketSchema, {
                      conclusion: GuardConclusion.ALLOW,
                      remainingTokens: 99,
                      maxTokens: 100,
                      resetAtUnixSeconds: 60,
                      refillRate: 10,
                      refillIntervalSeconds: 60,
                    }),
                  },
                }),
              ],
            }),
          });
        },
      });
    });

    const arcjet = launchArcjetWithTransport({
      key: "ajkey_test",
      transport,
    });

    const decision = await arcjet.guard({
      label: "test",
      rules: [input],
    });

    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(decision.id, "gdec_idx");
  });
});

describe("_launchWithTransportFactory", () => {
  test("creates transport from factory and returns guard client", async () => {
    const rule = tokenBucket({
      bucket: "test",
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = rule({ key: "user_1" });

    let receivedBaseUrl = "";

    const arcjet = _launchWithTransportFactory(
      (baseUrl: string) => {
        receivedBaseUrl = baseUrl;
        return createRouterTransport(({ service }) => {
          service(DecideService, {
            guard: (req) => {
              const sub = req.ruleSubmissions[0];
              return create(GuardResponseSchema, {
                decision: create(GuardDecisionSchema, {
                  id: "gdec_factory",
                  conclusion: GuardConclusion.ALLOW,
                  ruleResults: [
                    create(GuardRuleResultSchema, {
                      resultId: "gres_1",
                      configId: sub.configId,
                      inputId: sub.inputId,
                      type: GuardRuleType.TOKEN_BUCKET,
                      result: {
                        case: "tokenBucket",
                        value: create(ResultTokenBucketSchema, {
                          conclusion: GuardConclusion.ALLOW,
                          remainingTokens: 99,
                          maxTokens: 100,
                          resetAtUnixSeconds: 60,
                          refillRate: 10,
                          refillIntervalSeconds: 60,
                        }),
                      },
                    }),
                  ],
                }),
              });
            },
          });
        });
      },
      { key: "ajkey_factory" },
    );

    const decision = await arcjet.guard({
      label: "test",
      rules: [input],
    });

    assert.equal(decision.conclusion, "ALLOW");
    assert.equal(receivedBaseUrl, "https://decide.arcjet.com");
  });

  test("respects custom baseUrl", () => {
    let receivedBaseUrl = "";

    _launchWithTransportFactory(
      (baseUrl: string) => {
        receivedBaseUrl = baseUrl;
        return createRouterTransport(({ service }) => {
          service(DecideService, {
            guard: () => create(GuardResponseSchema, {}),
          });
        });
      },
      { key: "ajkey_test", baseUrl: "https://custom.example.com" },
    );

    assert.equal(receivedBaseUrl, "https://custom.example.com");
  });
});
