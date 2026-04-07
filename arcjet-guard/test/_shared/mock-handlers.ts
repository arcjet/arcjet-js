/**
 * Pure in-memory mock handlers for `@arcjet/guard` tests.
 *
 * These functions are runtime-agnostic — they only use `@bufbuild/protobuf`
 * and `@connectrpc/connect`, no Node-specific APIs. Safe to bundle into
 * Cloudflare Workers, Deno, Bun, etc.
 *
 * @packageDocumentation
 */

import { create } from "@bufbuild/protobuf";
import { createRouterTransport } from "@connectrpc/connect";
import type { Transport } from "@connectrpc/connect";

import {
  DecideService,
  GuardResponseSchema,
  GuardDecisionSchema,
  GuardRuleResultSchema,
  ResultTokenBucketSchema,
  ResultFixedWindowSchema,
  ResultSlidingWindowSchema,
  ResultPromptInjectionSchema,
  ResultLocalSensitiveInfoSchema,
  ResultLocalCustomSchema,
  ResultErrorSchema,
  GuardConclusion,
  GuardReason,
  GuardRuleType,
  type GuardRequest,
  type GuardResponse,
} from "../../src/proto/proto/decide/v2/decide_pb.js";

export {
  create,
  createRouterTransport,
  type Transport,
  DecideService,
  GuardResponseSchema,
  GuardDecisionSchema,
  GuardRuleResultSchema,
  ResultTokenBucketSchema,
  ResultFixedWindowSchema,
  ResultSlidingWindowSchema,
  ResultPromptInjectionSchema,
  ResultLocalSensitiveInfoSchema,
  ResultLocalCustomSchema,
  ResultErrorSchema,
  GuardConclusion,
  GuardReason,
  GuardRuleType,
  type GuardRequest,
  type GuardResponse,
};

/** Handler type for mock server. */
export type MockHandler = (req: GuardRequest, context: { requestHeader: Headers }) => GuardResponse;

/** Extract the first rule submission or throw (test helper). */
function firstSubmission(req: GuardRequest): GuardRequest["ruleSubmissions"][number] {
  const sub = req.ruleSubmissions[0];
  if (sub === undefined) throw new Error("Expected at least one rule submission");
  return sub;
}

/** Create an in-memory Connect transport with a custom handler. */
export function createMockTransport(handler: MockHandler): Transport {
  return createRouterTransport(({ service }) => {
    service(DecideService, { guard: handler });
  });
}

/** Build an ALLOW response for a token bucket rule. */
export function tokenBucketAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_tb",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_tb_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingTokens: 95,
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
}

/** Build a DENY response for a token bucket rule. */
export function tokenBucketDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_tb",
      conclusion: GuardConclusion.DENY,
      reason: GuardReason.RATE_LIMIT,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_tb_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.DENY,
              remainingTokens: 0,
              maxTokens: 100,
              resetAtUnixSeconds: 55,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for a fixed window rule. */
export function fixedWindowAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_fw",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_fw_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.FIXED_WINDOW,
          result: {
            case: "fixedWindow",
            value: create(ResultFixedWindowSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingRequests: 999,
              maxRequests: 1000,
              resetAtUnixSeconds: 3500,
              windowSeconds: 3600,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for a fixed window rule. */
export function fixedWindowDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_fw",
      conclusion: GuardConclusion.DENY,
      reason: GuardReason.RATE_LIMIT,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_fw_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.FIXED_WINDOW,
          result: {
            case: "fixedWindow",
            value: create(ResultFixedWindowSchema, {
              conclusion: GuardConclusion.DENY,
              remainingRequests: 0,
              maxRequests: 100,
              resetAtUnixSeconds: 1800,
              windowSeconds: 3600,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for a sliding window rule. */
export function slidingWindowAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_sw",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_sw_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.SLIDING_WINDOW,
          result: {
            case: "slidingWindow",
            value: create(ResultSlidingWindowSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingRequests: 50,
              maxRequests: 100,
              resetAtUnixSeconds: 3600,
              intervalSeconds: 3600,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for prompt injection detection. */
export function promptInjectionDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_pi",
      conclusion: GuardConclusion.DENY,
      reason: GuardReason.PROMPT_INJECTION,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_pi_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.PROMPT_INJECTION,
          result: {
            case: "promptInjection",
            value: create(ResultPromptInjectionSchema, {
              conclusion: GuardConclusion.DENY,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for sensitive info detection. */
export function sensitiveInfoDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_si",
      conclusion: GuardConclusion.DENY,
      reason: GuardReason.SENSITIVE_INFO,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_si_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.LOCAL_SENSITIVE_INFO,
          result: {
            case: "localSensitiveInfo",
            value: create(ResultLocalSensitiveInfoSchema, {
              conclusion: GuardConclusion.DENY,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for sensitive info detection. */
export function sensitiveInfoAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_si",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_si_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.LOCAL_SENSITIVE_INFO,
          result: {
            case: "localSensitiveInfo",
            value: create(ResultLocalSensitiveInfoSchema, {
              conclusion: GuardConclusion.ALLOW,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build an ALLOW response for a custom rule. */
export function customRuleAllow(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_custom",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_custom_allow",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.LOCAL_CUSTOM,
          result: {
            case: "localCustom",
            value: create(ResultLocalCustomSchema, {
              conclusion: GuardConclusion.ALLOW,
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a DENY response for a custom rule. */
export function customRuleDeny(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_custom",
      conclusion: GuardConclusion.DENY,
      reason: GuardReason.CUSTOM,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_custom_deny",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.LOCAL_CUSTOM,
          result: {
            case: "localCustom",
            value: create(ResultLocalCustomSchema, {
              conclusion: GuardConclusion.DENY,
              data: { reason: "denied by server" },
            }),
          },
        }),
      ],
    }),
  });
}

/** Build a multi-rule ALLOW response (all rules pass). */
export function multiRuleAllow(req: GuardRequest): GuardResponse {
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_multi",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: req.ruleSubmissions.map((sub, i) =>
        create(GuardRuleResultSchema, {
          resultId: `gres_multi_${i}`,
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingTokens: 90,
              maxTokens: 100,
              resetAtUnixSeconds: 60,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        }),
      ),
    }),
  });
}

/** Build an error result (fail-open). */
export function errorResult(req: GuardRequest): GuardResponse {
  const sub = firstSubmission(req);
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_err",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: [
        create(GuardRuleResultSchema, {
          resultId: "gres_error",
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "error",
            value: create(ResultErrorSchema, {
              message: "something went wrong",
            }),
          },
        }),
      ],
    }),
  });
}

/**
 * Build a mixed-rule ALLOW response.
 * Custom rules get a custom ALLOW result; all other rule types get a
 * token bucket ALLOW result.
 */
export function mixedRuleAllow(req: GuardRequest): GuardResponse {
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_mixed",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: req.ruleSubmissions.map((sub, i) => {
        const ruleCase = sub.rule?.rule.case;
        if (ruleCase === "localCustom") {
          return create(GuardRuleResultSchema, {
            resultId: `gres_mixed_${i}`,
            configId: sub.configId,
            inputId: sub.inputId,
            type: GuardRuleType.LOCAL_CUSTOM,
            result: {
              case: "localCustom",
              value: create(ResultLocalCustomSchema, {
                conclusion: GuardConclusion.ALLOW,
                data: { index: String(i) },
              }),
            },
          });
        }
        return create(GuardRuleResultSchema, {
          resultId: `gres_mixed_${i}`,
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingTokens: 90,
              maxTokens: 100,
              resetAtUnixSeconds: 60,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        });
      }),
    }),
  });
}

/**
 * Build a mixed-rule response where the custom rule DENYs.
 * Rate limit rules ALLOW, custom rule DENYs.
 */
export function mixedRuleCustomDeny(req: GuardRequest): GuardResponse {
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_deny_mixed",
      conclusion: GuardConclusion.DENY,
      reason: GuardReason.CUSTOM,
      ruleResults: req.ruleSubmissions.map((sub, i) => {
        const ruleCase = sub.rule?.rule.case;
        if (ruleCase === "localCustom") {
          return create(GuardRuleResultSchema, {
            resultId: `gres_mixed_${i}`,
            configId: sub.configId,
            inputId: sub.inputId,
            type: GuardRuleType.LOCAL_CUSTOM,
            result: {
              case: "localCustom",
              value: create(ResultLocalCustomSchema, {
                conclusion: GuardConclusion.DENY,
                data: { reason: "flagged" },
              }),
            },
          });
        }
        return create(GuardRuleResultSchema, {
          resultId: `gres_mixed_${i}`,
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.TOKEN_BUCKET,
          result: {
            case: "tokenBucket",
            value: create(ResultTokenBucketSchema, {
              conclusion: GuardConclusion.ALLOW,
              remainingTokens: 90,
              maxTokens: 100,
              resetAtUnixSeconds: 60,
              refillRate: 10,
              refillIntervalSeconds: 60,
            }),
          },
        });
      }),
    }),
  });
}

/** Build a response for two custom rules — both ALLOW with distinct data. */
export function multiCustomAllow(req: GuardRequest): GuardResponse {
  return create(GuardResponseSchema, {
    decision: create(GuardDecisionSchema, {
      id: "gdec_allow_multi_custom",
      conclusion: GuardConclusion.ALLOW,
      ruleResults: req.ruleSubmissions.map((sub, i) =>
        create(GuardRuleResultSchema, {
          resultId: `gres_multi_custom_${i}`,
          configId: sub.configId,
          inputId: sub.inputId,
          type: GuardRuleType.LOCAL_CUSTOM,
          result: {
            case: "localCustom",
            value: create(ResultLocalCustomSchema, {
              conclusion: GuardConclusion.ALLOW,
              data: { index: String(i), checked: "true" },
            }),
          },
        }),
      ),
    }),
  });
}
