/**
 * Proto ↔ SDK conversion functions for `@arcjet/guard`.
 *
 * This module converts between the generated protobuf types and the
 * public SDK types defined in `./types.ts`. Callers should never need
 * to import this module directly.
 *
 * @packageDocumentation
 */

import { detectSensitiveInfo, type SensitiveInfoEntity } from "@arcjet/analyze";
import { create } from "@bufbuild/protobuf";

import {
  type GuardRule,
  type GuardRuleResult as ProtoGuardRuleResult,
  type GuardRuleSubmission,
  type GuardResponse as ProtoGuardResponse,
  type RuleLocalSensitiveInfo,
  type RuleLocalCustom,
  GuardRuleSubmissionSchema,
  GuardRuleSchema,
  RuleTokenBucketSchema,
  RuleFixedWindowSchema,
  RuleSlidingWindowSchema,
  RuleDetectPromptInjectionSchema,
  RuleLocalSensitiveInfoSchema,
  RuleLocalCustomSchema,
  ResultLocalSensitiveInfoSchema,
  ResultLocalCustomSchema,
  ResultErrorSchema,
  EntityListSchema,
  GuardConclusion,
  GuardRuleMode,
} from "./proto/proto/decide/v2/decide_pb.js";
import { symbolArcjetInternal } from "./symbol.ts";
import type { SensitiveInfoEntityType } from "./types.ts";
import type {
  Conclusion,
  Decision,
  InternalDecision,
  InternalResult,
  Reason,
  RuleResult,
  RuleWithInput,
} from "./types.ts";

/** Hash a string with SHA-256 and return the hex digest. */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** No-op logger satisfying the `AnalyzeContext` contract. */
const noopLog = {
  debug(): void {},
  info(): void {},
  warn(): void {},
  error(): void {},
};

/** Minimal context for `@arcjet/analyze` — only `log` is used for sensitive info. */
const analyzeContext = { log: noopLog, characteristics: [] as string[] };

/** Convert an SDK entity type string to a WASM entity tag. */
function stringToEntity(s: SensitiveInfoEntityType): SensitiveInfoEntity {
  switch (s) {
    case "EMAIL":
      return { tag: "email" };
    case "PHONE_NUMBER":
      return { tag: "phone-number" };
    case "IP_ADDRESS":
      return { tag: "ip-address" };
    case "CREDIT_CARD_NUMBER":
      return { tag: "credit-card-number" };
  }
}

/** Convert a WASM entity tag back to an SDK entity type string. */
function entityToString(e: SensitiveInfoEntity): SensitiveInfoEntityType {
  switch (e.tag) {
    case "email":
      return "EMAIL";
    case "phone-number":
      return "PHONE_NUMBER";
    case "ip-address":
      return "IP_ADDRESS";
    case "credit-card-number":
      return "CREDIT_CARD_NUMBER";
    case "custom":
      throw new Error(
        `Assert \`@arcjet/guard\` does not support configuring custom sensitive info entities and will never return them in results.`,
      );
  }
}

/**
 * Map a proto `GuardConclusion` to the SDK `Conclusion` string.
 * Unrecognized values default to `"ALLOW"` (fail-open).
 *
 * @internal
 */
export function conclusionFromProto(c: GuardConclusion): Conclusion {
  switch (c) {
    case GuardConclusion.ALLOW:
    case GuardConclusion.UNSPECIFIED:
      return "ALLOW";
    case GuardConclusion.DENY:
      return "DENY";
  }
}

/**
 * Map a proto result's oneof `case` to a broad SDK `Reason`.
 *
 * @internal
 */
export function reasonFromCase(caseName: string | undefined): Reason {
  switch (caseName) {
    case "tokenBucket":
    case "fixedWindow":
    case "slidingWindow":
      return "RATE_LIMIT";
    case "promptInjection":
      return "PROMPT_INJECTION";
    case "localSensitiveInfo":
      return "SENSITIVE_INFO";
    case "localCustom":
      return "CUSTOM";
    case "error":
      return "ERROR";
    case "notRun":
      return "NOT_RUN";
    case undefined:
      return "UNKNOWN";
    default:
      return "UNKNOWN";
  }
}

/**
 * Convert a single proto `GuardRuleResult` to the SDK `RuleResult`.
 *
 * Each result variant carries its own conclusion and typed fields.
 * `ResultError` results are mapped to `RuleResultError` with
 * `conclusion: "ALLOW"` (fail-open). `ResultNotRun` results are mapped
 * to `RuleResultNotRun` with `conclusion: "ALLOW"`.
 *
 * @internal
 */
export function resultFromProto(pr: ProtoGuardRuleResult): RuleResult {
  switch (pr.result.case) {
    case undefined: {
      return {
        conclusion: "ALLOW" as const,
        reason: "UNKNOWN",
        type: "UNKNOWN",
      };
    }
    case "tokenBucket": {
      const v = pr.result.value;
      return {
        conclusion: conclusionFromProto(v.conclusion),
        reason: "RATE_LIMIT",
        type: "TOKEN_BUCKET",
        remainingTokens: v.remainingTokens,
        maxTokens: v.maxTokens,
        resetAtUnixSeconds: v.resetAtUnixSeconds,
        refillRate: v.refillRate,
        refillIntervalSeconds: v.refillIntervalSeconds,
      };
    }
    case "fixedWindow": {
      const v = pr.result.value;
      return {
        conclusion: conclusionFromProto(v.conclusion),
        reason: "RATE_LIMIT",
        type: "FIXED_WINDOW",
        remainingRequests: v.remainingRequests,
        maxRequests: v.maxRequests,
        resetAtUnixSeconds: v.resetAtUnixSeconds,
        windowSeconds: v.windowSeconds,
      };
    }
    case "slidingWindow": {
      const v = pr.result.value;
      return {
        conclusion: conclusionFromProto(v.conclusion),
        reason: "RATE_LIMIT",
        type: "SLIDING_WINDOW",
        remainingRequests: v.remainingRequests,
        maxRequests: v.maxRequests,
        resetAtUnixSeconds: v.resetAtUnixSeconds,
        intervalSeconds: v.intervalSeconds,
      };
    }
    case "promptInjection": {
      return {
        conclusion: conclusionFromProto(pr.result.value.conclusion),
        reason: "PROMPT_INJECTION",
        type: "PROMPT_INJECTION",
      };
    }
    case "localSensitiveInfo": {
      const v = pr.result.value;
      return {
        conclusion: conclusionFromProto(v.conclusion),
        reason: "SENSITIVE_INFO",
        type: "SENSITIVE_INFO",
        detectedEntityTypes: v.detectedEntityTypes,
      };
    }
    case "localCustom": {
      const v = pr.result.value;
      return {
        conclusion: conclusionFromProto(v.conclusion),
        reason: "CUSTOM",
        type: "CUSTOM",
        data: Object.fromEntries(Object.entries(v.data)),
      };
    }
    case "error": {
      const v = pr.result.value;
      return {
        conclusion: "ALLOW" as const,
        reason: "ERROR",
        type: "RULE_ERROR",
        message: v.message || "Unknown error",
        code: v.code || "UNKNOWN",
      };
    }
    case "notRun": {
      return {
        conclusion: "ALLOW" as const,
        reason: "NOT_RUN",
        type: "NOT_RUN",
      };
    }
    default: {
      return {
        conclusion: "ALLOW" as const,
        reason: "UNKNOWN",
        type: "UNKNOWN",
      };
    }
  }
}

/**
 * Convert a `RuleWithInput` to a proto `GuardRuleSubmission`.
 *
 * Switches on the `type` discriminant so TypeScript narrows config/input
 * automatically — no casts required.
 */
export async function ruleToProto(rule: RuleWithInput): Promise<GuardRuleSubmission> {
  const mode = rule.config.mode === "DRY_RUN" ? GuardRuleMode.DRY_RUN : GuardRuleMode.LIVE;

  const guardRule = await ruleBodyToProto(rule);

  const submission: Parameters<typeof create<typeof GuardRuleSubmissionSchema>>[1] = {
    configId: rule[symbolArcjetInternal].configId,
    inputId: rule[symbolArcjetInternal].inputId,
    metadata: ruleMetadataToProto(rule),
    rule: guardRule,
    mode,
  };
  if (rule.config.label !== undefined) {
    submission.label = rule.config.label;
  }
  return create(GuardRuleSubmissionSchema, submission);
}

/**
 * Merge config-level and input-level metadata for a rule submission.
 * Input-level values take priority on key conflict.
 * String inputs (prompt injection, sensitive info) don't carry metadata.
 *
 * @internal
 */
function ruleMetadataToProto(rule: RuleWithInput): Record<string, string> {
  return {
    ...rule.config.metadata,
    ...(typeof rule.input === "string" ? undefined : rule.input.metadata),
  };
}

/**
 * Map a `RuleWithInput` into a proto `GuardRule` using discriminant narrowing.
 *
 * @internal
 */
async function ruleBodyToProto(rule: RuleWithInput): Promise<GuardRule> {
  switch (rule.type) {
    case "TOKEN_BUCKET":
      return create(GuardRuleSchema, {
        rule: {
          case: "tokenBucket",
          value: create(RuleTokenBucketSchema, {
            configRefillRate: rule.config.refillRate,
            configIntervalSeconds: rule.config.intervalSeconds,
            configMaxTokens: rule.config.maxTokens,
            inputKey: await sha256Hex(rule.input.key),
            inputRequested: rule.input.requested ?? 1,
          }),
        },
      });
    case "FIXED_WINDOW":
      return create(GuardRuleSchema, {
        rule: {
          case: "fixedWindow",
          value: create(RuleFixedWindowSchema, {
            configMaxRequests: rule.config.maxRequests,
            configWindowSeconds: rule.config.windowSeconds,
            inputKey: await sha256Hex(rule.input.key),
            inputRequested: rule.input.requested ?? 1,
          }),
        },
      });
    case "SLIDING_WINDOW":
      return create(GuardRuleSchema, {
        rule: {
          case: "slidingWindow",
          value: create(RuleSlidingWindowSchema, {
            configMaxRequests: rule.config.maxRequests,
            configIntervalSeconds: rule.config.intervalSeconds,
            inputKey: await sha256Hex(rule.input.key),
            inputRequested: rule.input.requested ?? 1,
          }),
        },
      });
    case "PROMPT_INJECTION":
      return create(GuardRuleSchema, {
        rule: {
          case: "detectPromptInjection",
          value: create(RuleDetectPromptInjectionSchema, {
            inputText: rule.input,
          }),
        },
      });
    case "SENSITIVE_INFO": {
      const hash = await sha256Hex(rule.input);

      const entities = rule.config.deny
        ? { tag: "deny" as const, val: rule.config.deny.map((s) => stringToEntity(s)) }
        : { tag: "allow" as const, val: (rule.config.allow ?? []).map((s) => stringToEntity(s)) };

      let localResult: RuleLocalSensitiveInfo["localResult"];
      let resultDurationMs: bigint | undefined;

      const evalStart = performance.now();
      try {
        const result = await detectSensitiveInfo(analyzeContext, rule.input, entities, 1);
        resultDurationMs = BigInt(Math.round(performance.now() - evalStart));

        const deniedTypes = result.denied.map((d) => entityToString(d.identifiedType));
        localResult = {
          case: "resultComputed" as const,
          value: create(ResultLocalSensitiveInfoSchema, {
            conclusion: result.denied.length > 0 ? GuardConclusion.DENY : GuardConclusion.ALLOW,
            detected: result.denied.length > 0 || result.allowed.length > 0,
            detectedEntityTypes: deniedTypes,
          }),
        };
      } catch (err: unknown) {
        resultDurationMs = BigInt(Math.round(performance.now() - evalStart));
        localResult = {
          case: "resultError" as const,
          value: create(ResultErrorSchema, {
            message: err instanceof Error ? err.message : "WASM detection failed",
            code: "WASM_ERROR",
          }),
        };
      }

      return create(GuardRuleSchema, {
        rule: {
          case: "localSensitiveInfo",
          value: create(RuleLocalSensitiveInfoSchema, {
            configEntityFilter: rule.config.deny
              ? {
                  case: "configEntitiesDeny" as const,
                  value: create(EntityListSchema, { entities: rule.config.deny }),
                }
              : {
                  case: "configEntitiesAllow" as const,
                  value: create(EntityListSchema, { entities: rule.config.allow ?? [] }),
                },
            inputTextHash: hash,
            localResult,
            resultDurationMs,
          }),
        },
      });
    }
    case "CUSTOM": {
      let localResult: RuleLocalCustom["localResult"] | undefined;
      let resultDurationMs: bigint | undefined;

      if (rule.evaluate) {
        const evalStart = performance.now();
        try {
          const evalResult = await rule.evaluate(rule.config.data ?? {}, rule.input.data);
          resultDurationMs = BigInt(Math.round(performance.now() - evalStart));

          if (evalResult.conclusion !== "ALLOW" && evalResult.conclusion !== "DENY") {
            localResult = {
              case: "resultError" as const,
              value: create(ResultErrorSchema, {
                message: `localCustom evaluate() returned invalid conclusion "${String(evalResult.conclusion)}" — must be "ALLOW" or "DENY"`,
                code: "INVALID_CONCLUSION",
              }),
            };
          } else {
            localResult = {
              case: "resultComputed" as const,
              value: create(ResultLocalCustomSchema, {
                conclusion:
                  evalResult.conclusion === "DENY" ? GuardConclusion.DENY : GuardConclusion.ALLOW,
                data: evalResult.data ?? {},
              }),
            };
          }
        } catch (err: unknown) {
          resultDurationMs = BigInt(Math.round(performance.now() - evalStart));
          localResult = {
            case: "resultError" as const,
            value: create(ResultErrorSchema, {
              message: err instanceof Error ? err.message : "Custom rule evaluation failed",
              code: "CUSTOM_EVAL_ERROR",
            }),
          };
        }
      }

      const customValue: Parameters<typeof create<typeof RuleLocalCustomSchema>>[1] = {
        configData: rule.config.data ?? {},
        inputData: rule.input.data,
      };
      if (localResult !== undefined) {
        customValue.localResult = localResult;
      }
      if (resultDurationMs !== undefined) {
        customValue.resultDurationMs = resultDurationMs;
      }

      return create(GuardRuleSchema, {
        rule: {
          case: "localCustom",
          value: create(RuleLocalCustomSchema, customValue),
        },
      });
    }
  }
}

/**
 * Convert a proto `GuardResponse` to the SDK `Decision`.
 *
 * Correlates proto results back to SDK rule instances using
 * `config_id` and `input_id`.
 */
export function decisionFromProto(
  response: ProtoGuardResponse,
  _rules: readonly RuleWithInput[],
): Decision {
  const proto = response.decision;
  if (!proto) {
    // No decision in response — synthesize an ALLOW with error.
    const errorResult: InternalResult = {
      conclusion: "ALLOW",
      reason: "ERROR",
      type: "RULE_ERROR",
      message: "No decision in response",
      code: "NO_DECISION",
      [symbolArcjetInternal]: { configId: "", inputId: "" },
    };
    const d: InternalDecision = {
      conclusion: "ALLOW" as const,
      id: "",
      results: [errorResult],
      hasError: () => true,
      [symbolArcjetInternal]: { results: [errorResult] },
    };
    return d;
  }

  const internalResults: InternalResult[] = [];

  for (const protoResult of proto.ruleResults) {
    const result = resultFromProto(protoResult);
    internalResults.push({
      ...result,
      [symbolArcjetInternal]: {
        configId: protoResult.configId,
        inputId: protoResult.inputId,
      },
    });
  }

  const results: readonly RuleResult[] = internalResults;

  const hasError = (): boolean => results.some((r) => r.type === "RULE_ERROR");

  const conclusion = conclusionFromProto(proto.conclusion);
  const reason = reasonFromCase(
    proto.ruleResults.find((r) => {
      // Find the first live DENY result's case to derive the reason
      const sdkConclusion = conclusionFromProto(
        r.result.value && "conclusion" in r.result.value
          ? r.result.value.conclusion
          : GuardConclusion.UNSPECIFIED,
      );
      return sdkConclusion === "DENY";
    })?.result.case,
  );

  if (conclusion === "DENY") {
    const d: InternalDecision = {
      conclusion: "DENY" as const,
      reason,
      id: proto.id,
      results,
      hasError,
      [symbolArcjetInternal]: { results: internalResults },
    };
    return d;
  }

  const d: InternalDecision = {
    conclusion: "ALLOW" as const,
    id: proto.id,
    results,
    hasError,
    [symbolArcjetInternal]: { results: internalResults },
  };
  return d;
}
