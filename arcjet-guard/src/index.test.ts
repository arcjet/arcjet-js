import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";

import {
  launchArcjetWithTransport,
  _launchWithTransportFactory,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
} from "./index.ts";
import {
  DecideService,
  GuardResponseSchema,
  GuardDecisionSchema,
  GuardRuleResultSchema,
  ResultTokenBucketSchema,
  GuardConclusion,
  GuardRuleType,
} from "./proto/proto/decide/v2/decide_pb.js";

describe("re-exports", () => {
  test("rule factories are exported", () => {
    assert.equal(typeof tokenBucket, "function");
    assert.equal(typeof fixedWindow, "function");
    assert.equal(typeof slidingWindow, "function");
    assert.equal(typeof detectPromptInjection, "function");
    assert.equal(typeof localDetectSensitiveInfo, "function");
    assert.equal(typeof localCustom, "function");
  });

  test("launchArcjetWithTransport is exported", () => {
    assert.equal(typeof launchArcjetWithTransport, "function");
  });

  test("_launchWithTransportFactory is exported", () => {
    assert.equal(typeof _launchWithTransportFactory, "function");
  });
});

describe("launchArcjetWithTransport", () => {
  test("creates a guard client with a .guard() method", () => {
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
