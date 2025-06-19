import assert from "node:assert/strict";
import { describe, mock, test } from "node:test";
import {
  ArcjetModeToProtocol,
  ArcjetEmailTypeToProtocol,
  ArcjetEmailTypeFromProtocol,
  ArcjetStackToProtocol,
  ArcjetRuleStateToProtocol,
  ArcjetRuleStateFromProtocol,
  ArcjetConclusionToProtocol,
  ArcjetConclusionFromProtocol,
  ArcjetReasonFromProtocol,
  ArcjetReasonToProtocol,
  ArcjetRuleResultToProtocol,
  ArcjetRuleResultFromProtocol,
  ArcjetDecisionToProtocol,
  ArcjetDecisionFromProtocol,
  ArcjetRuleToProtocol,
} from "../convert.js";
import {
  Conclusion,
  Decision,
  EmailType,
  Mode,
  RateLimitAlgorithm,
  Reason,
  Rule,
  RuleResult,
  RuleState,
  SDKStack,
} from "../proto/decide/v1alpha1/decide_pb.js";
import type {
  ArcjetBotRule,
  ArcjetEmailRule,
  ArcjetTokenBucketRateLimitRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetSlidingWindowRateLimitRule,
  ArcjetShieldRule,
  ArcjetRule,
  ArcjetSensitiveInfoRule,
} from "../index.js";
import {
  ArcjetAllowDecision,
  ArcjetBotReason,
  ArcjetChallengeDecision,
  ArcjetDenyDecision,
  ArcjetEdgeRuleReason,
  ArcjetEmailReason,
  ArcjetErrorDecision,
  ArcjetErrorReason,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetShieldReason,
  ArcjetIpDetails,
  ArcjetSensitiveInfoReason,
} from "../index.js";
import { Timestamp } from "@bufbuild/protobuf";

describe("convert", () => {
  test("ArcjetModeToProtocol", () => {
    assert.equal(ArcjetModeToProtocol("LIVE"), Mode.LIVE);
    assert.equal(ArcjetModeToProtocol("DRY_RUN"), Mode.DRY_RUN);
    assert.equal(
      ArcjetModeToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
      Mode.UNSPECIFIED,
    );
  });

  test("ArcjetEmailTypeToProtocol", () => {
    assert.equal(ArcjetEmailTypeToProtocol("DISPOSABLE"), EmailType.DISPOSABLE);
    assert.equal(ArcjetEmailTypeToProtocol("FREE"), EmailType.FREE);
    assert.equal(ArcjetEmailTypeToProtocol("INVALID"), EmailType.INVALID);
    assert.equal(
      ArcjetEmailTypeToProtocol("NO_GRAVATAR"),
      EmailType.NO_GRAVATAR,
    );
    assert.equal(
      ArcjetEmailTypeToProtocol("NO_MX_RECORDS"),
      EmailType.NO_MX_RECORDS,
    );
    assert.equal(
      ArcjetEmailTypeToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
      EmailType.UNSPECIFIED,
    );
  });

  test("ArcjetEmailTypeFromProtocol", () => {
    assert.equal(
      ArcjetEmailTypeFromProtocol(EmailType.DISPOSABLE),
      "DISPOSABLE",
    );
    assert.equal(ArcjetEmailTypeFromProtocol(EmailType.FREE), "FREE");
    assert.equal(ArcjetEmailTypeFromProtocol(EmailType.INVALID), "INVALID");
    assert.equal(
      ArcjetEmailTypeFromProtocol(EmailType.NO_GRAVATAR),
      "NO_GRAVATAR",
    );
    assert.equal(
      ArcjetEmailTypeFromProtocol(EmailType.NO_MX_RECORDS),
      "NO_MX_RECORDS",
    );
    assert.throws(() => {
      ArcjetEmailTypeFromProtocol(EmailType.UNSPECIFIED);
    }, /Invalid EmailType/);
    assert.throws(() => {
      ArcjetEmailTypeFromProtocol(
        // @ts-expect-error
        99,
      );
    }, /Invalid EmailType/);
  });

  test("ArcjetStackToProtocol", () => {
    assert.equal(ArcjetStackToProtocol("NODEJS"), SDKStack.SDK_STACK_NODEJS);
    assert.equal(ArcjetStackToProtocol("NEXTJS"), SDKStack.SDK_STACK_NEXTJS);
    assert.equal(ArcjetStackToProtocol("BUN"), SDKStack.SDK_STACK_BUN);
    assert.equal(
      ArcjetStackToProtocol("SVELTEKIT"),
      SDKStack.SDK_STACK_SVELTEKIT,
    );
    assert.equal(ArcjetStackToProtocol("DENO"), SDKStack.SDK_STACK_DENO);
    assert.equal(ArcjetStackToProtocol("NESTJS"), SDKStack.SDK_STACK_NESTJS);
    assert.equal(ArcjetStackToProtocol("REMIX"), SDKStack.SDK_STACK_REMIX);
    assert.equal(ArcjetStackToProtocol("ASTRO"), SDKStack.SDK_STACK_ASTRO);
    assert.equal(
      ArcjetStackToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
      SDKStack.SDK_STACK_UNSPECIFIED,
    );
  });

  test("ArcjetRuleStateToProtocol", () => {
    assert.equal(ArcjetRuleStateToProtocol("CACHED"), RuleState.CACHED);
    assert.equal(ArcjetRuleStateToProtocol("DRY_RUN"), RuleState.DRY_RUN);
    assert.equal(ArcjetRuleStateToProtocol("NOT_RUN"), RuleState.NOT_RUN);
    assert.equal(ArcjetRuleStateToProtocol("RUN"), RuleState.RUN);
    assert.equal(
      ArcjetRuleStateToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
      RuleState.UNSPECIFIED,
    );
  });

  test("ArcjetRuleStateFromProtocol", () => {
    assert.equal(ArcjetRuleStateFromProtocol(RuleState.CACHED), "CACHED");
    assert.equal(ArcjetRuleStateFromProtocol(RuleState.DRY_RUN), "DRY_RUN");
    assert.equal(ArcjetRuleStateFromProtocol(RuleState.NOT_RUN), "NOT_RUN");
    assert.equal(ArcjetRuleStateFromProtocol(RuleState.RUN), "RUN");
    assert.throws(() => {
      ArcjetRuleStateFromProtocol(RuleState.UNSPECIFIED);
    }, /Invalid RuleState/);
    assert.throws(() => {
      ArcjetRuleStateFromProtocol(
        // @ts-expect-error
        99,
      );
    }, /Invalid RuleState/);
  });

  test("ArcjetConclusionToProtocol", () => {
    assert.equal(ArcjetConclusionToProtocol("ALLOW"), Conclusion.ALLOW);
    assert.equal(ArcjetConclusionToProtocol("CHALLENGE"), Conclusion.CHALLENGE);
    assert.equal(ArcjetConclusionToProtocol("DENY"), Conclusion.DENY);
    assert.equal(ArcjetConclusionToProtocol("ERROR"), Conclusion.ERROR);
    assert.equal(
      ArcjetConclusionToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
      Conclusion.UNSPECIFIED,
    );
  });

  test("ArcjetConclusionFromProtocol", () => {
    assert.equal(ArcjetConclusionFromProtocol(Conclusion.ALLOW), "ALLOW");
    assert.equal(
      ArcjetConclusionFromProtocol(Conclusion.CHALLENGE),
      "CHALLENGE",
    );
    assert.equal(ArcjetConclusionFromProtocol(Conclusion.DENY), "DENY");
    assert.equal(ArcjetConclusionFromProtocol(Conclusion.ERROR), "ERROR");
    assert.throws(() => {
      ArcjetConclusionFromProtocol(Conclusion.UNSPECIFIED);
    }, /Invalid Conclusion/);
    assert.throws(() => {
      ArcjetConclusionFromProtocol(
        // @ts-expect-error
        99,
      );
    }, /Invalid Conclusion/);
  });

  test("ArcjetReasonFromProtocol", () => {
    assert.ok(ArcjetReasonFromProtocol() instanceof ArcjetReason);
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "botV2",
            value: {
              allowed: [],
              denied: [],
            },
          },
        }),
      ) instanceof ArcjetBotReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "edgeRule",
            value: {},
          },
        }),
      ) instanceof ArcjetEdgeRuleReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "email",
            value: {
              emailTypes: [EmailType.DISPOSABLE],
            },
          },
        }),
      ) instanceof ArcjetEmailReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "error",
            value: {
              message: "Test error",
            },
          },
        }),
      ) instanceof ArcjetErrorReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "rateLimit",
            value: {
              max: 1,
              count: 2,
              remaining: -1,
              resetInSeconds: 1000,
              windowInSeconds: 1000,
              resetTime: undefined,
            },
          },
        }),
      ) instanceof ArcjetRateLimitReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "rateLimit",
            value: {
              max: 1,
              count: 2,
              remaining: -1,
              resetInSeconds: 1000,
              windowInSeconds: 1000,
              resetTime: Timestamp.now(),
            },
          },
        }),
      ) instanceof ArcjetRateLimitReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "sensitiveInfo",
            value: {
              denied: [
                {
                  start: 0,
                  end: 16,
                  identifiedType: "credit-card-number",
                },
              ],
            },
          },
        }),
      ) instanceof ArcjetSensitiveInfoReason,
    );
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "shield",
            value: {
              shieldTriggered: true,
            },
          },
        }),
      ) instanceof ArcjetShieldReason,
    );
    assert.ok(ArcjetReasonFromProtocol(new Reason()) instanceof ArcjetReason);
    assert.ok(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            // @ts-expect-error
            case: "NOT_VALID",
          },
        }),
      ) instanceof ArcjetReason,
    );
    assert.throws(() => {
      ArcjetReasonFromProtocol(
        // @ts-expect-error
        "NOT_VALID",
      );
    }, /Invalid Reason/);
    assert.throws(() => {
      ArcjetReasonFromProtocol({
        // @ts-expect-error
        reason: "NOT_VALID",
      });
    }, /Invalid Reason/);
  });

  test("ArcjetReasonToProtocol", () => {
    assert.ok(ArcjetReasonToProtocol(new ArcjetReason()) instanceof Reason);
    assert.deepEqual(
      ArcjetReasonToProtocol(
        new ArcjetRateLimitReason({
          max: 1,
          remaining: -1,
          reset: 100,
          window: 100,
        }),
      ),
      new Reason({
        reason: {
          case: "rateLimit",
          value: {
            max: 1,
            remaining: -1,
            resetInSeconds: 100,
            windowInSeconds: 100,
          },
        },
      }),
    );

    const resetTime = new Date();
    assert.deepEqual(
      ArcjetReasonToProtocol(
        new ArcjetRateLimitReason({
          max: 1,
          remaining: -1,
          reset: 100,
          window: 100,
          resetTime,
        }),
      ),
      new Reason({
        reason: {
          case: "rateLimit",
          value: {
            max: 1,
            remaining: -1,
            resetInSeconds: 100,
            windowInSeconds: 100,
            resetTime: Timestamp.fromDate(resetTime),
          },
        },
      }),
    );

    assert.deepEqual(
      ArcjetReasonToProtocol(
        new ArcjetBotReason({
          allowed: ["GOOGLE_CRAWLER"],
          denied: [],
          verified: true,
          spoofed: false,
        }),
      ),
      new Reason({
        reason: {
          case: "botV2",
          value: {
            allowed: ["GOOGLE_CRAWLER"],
            denied: [],
            verified: true,
            spoofed: false,
          },
        },
      }),
    );

    assert.deepEqual(
      ArcjetReasonToProtocol(
        new ArcjetSensitiveInfoReason({
          denied: [
            {
              start: 0,
              end: 16,
              identifiedType: "credit-card-number",
            },
          ],
          allowed: [],
        }),
      ),
      new Reason({
        reason: {
          case: "sensitiveInfo",
          value: {
            denied: [
              {
                start: 0,
                end: 16,
                identifiedType: "credit-card-number",
              },
            ],
          },
        },
      }),
    );

    assert.deepEqual(
      ArcjetReasonToProtocol(new ArcjetEdgeRuleReason()),
      new Reason({
        reason: {
          case: "edgeRule",
          value: {},
        },
      }),
    );

    assert.deepEqual(
      ArcjetReasonToProtocol(new ArcjetShieldReason({ shieldTriggered: true })),
      new Reason({
        reason: {
          case: "shield",
          value: {
            shieldTriggered: true,
          },
        },
      }),
    );

    assert.deepEqual(
      ArcjetReasonToProtocol(
        new ArcjetEmailReason({
          emailTypes: ["DISPOSABLE"],
        }),
      ),
      new Reason({
        reason: {
          case: "email",
          value: {
            emailTypes: [EmailType.DISPOSABLE],
          },
        },
      }),
    );

    assert.deepEqual(
      ArcjetReasonToProtocol(new ArcjetErrorReason("Test error")),
      new Reason({
        reason: {
          case: "error",
          value: {
            message: "Test error",
          },
        },
      }),
    );
  });

  test("ArcjetRuleResultToProtocol", () => {
    assert.deepEqual(
      ArcjetRuleResultToProtocol(
        new ArcjetRuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          ttl: 0,
          state: "RUN",
          conclusion: "ALLOW",
          reason: new ArcjetReason(),
        }),
      ),
      new RuleResult({
        ruleId: "test-rule-id",
        fingerprint: "test-fingerprint",
        state: RuleState.RUN,
        conclusion: Conclusion.ALLOW,
        reason: new Reason(),
      }),
    );
  });

  test("ArcjetRuleResultFromProtocol", () => {
    assert.deepEqual(
      ArcjetRuleResultFromProtocol(
        new RuleResult({
          ruleId: "test-rule-id",
          fingerprint: "test-fingerprint",
          state: RuleState.RUN,
          conclusion: Conclusion.ALLOW,
          reason: new Reason(),
        }),
      ),
      new ArcjetRuleResult({
        ruleId: "test-rule-id",
        fingerprint: "test-fingerprint",
        ttl: 0,
        state: "RUN",
        conclusion: "ALLOW",
        reason: new ArcjetReason(),
      }),
    );
  });

  test("ArcjetDecisionToProtocol", () => {
    assert.deepEqual(
      ArcjetDecisionToProtocol(
        new ArcjetAllowDecision({
          id: "abc123",
          ttl: 0,
          results: [],
          reason: new ArcjetReason(),
          ip: new ArcjetIpDetails(),
        }),
      ),
      new Decision({
        id: "abc123",
        conclusion: Conclusion.ALLOW,
        ruleResults: [],
        reason: new Reason(),
      }),
    );
  });

  test("ArcjetDecisionFromProtocol", () => {
    assert.ok(ArcjetDecisionFromProtocol() instanceof ArcjetErrorDecision);
    assert.ok(
      ArcjetDecisionFromProtocol(new Decision()) instanceof ArcjetErrorDecision,
    );

    assert.ok(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.ALLOW,
        }),
      ) instanceof ArcjetAllowDecision,
    );

    assert.ok(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.DENY,
        }),
      ) instanceof ArcjetDenyDecision,
    );

    assert.ok(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.CHALLENGE,
        }),
      ) instanceof ArcjetChallengeDecision,
    );

    assert.ok(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.ERROR,
        }),
      ) instanceof ArcjetErrorDecision,
    );

    assert.ok(
      ArcjetDecisionFromProtocol({
        // @ts-expect-error
        conclusion: "NOT_VALID",
      }) instanceof ArcjetErrorDecision,
    );

    assert.ok(
      ArcjetDecisionFromProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ) instanceof ArcjetErrorDecision,
    );
  });

  test("ArcjetRuleToProtocol", () => {
    const unknownRule: ArcjetRule = {
      version: 0,
      type: "UNKNOWN",
      mode: "DRY_RUN",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };

    assert.deepEqual(ArcjetRuleToProtocol(unknownRule), new Rule({}));

    const tokenBucketRule: ArcjetTokenBucketRateLimitRule<{}> = {
      version: 0,
      type: "RATE_LIMIT",
      mode: "DRY_RUN",
      priority: 1,
      algorithm: "TOKEN_BUCKET",
      refillRate: 1,
      interval: 1,
      capacity: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };

    assert.deepEqual(
      ArcjetRuleToProtocol(tokenBucketRule),
      new Rule({
        rule: {
          case: "rateLimit",
          value: {
            mode: Mode.DRY_RUN,
            algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
            refillRate: 1,
            interval: 1,
            capacity: 1,
          },
        },
      }),
    );

    const fixedWindowRule: ArcjetFixedWindowRateLimitRule<{}> = {
      version: 0,
      type: "RATE_LIMIT",
      mode: "DRY_RUN",
      priority: 1,
      algorithm: "FIXED_WINDOW",
      max: 1,
      window: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };

    assert.deepEqual(
      ArcjetRuleToProtocol(fixedWindowRule),
      new Rule({
        rule: {
          case: "rateLimit",
          value: {
            mode: Mode.DRY_RUN,
            algorithm: RateLimitAlgorithm.FIXED_WINDOW,
            max: 1,
            windowInSeconds: 1,
          },
        },
      }),
    );

    const slidingWindowRule: ArcjetSlidingWindowRateLimitRule<{}> = {
      version: 0,
      type: "RATE_LIMIT",
      mode: "DRY_RUN",
      priority: 1,
      algorithm: "SLIDING_WINDOW",
      max: 1,
      interval: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };

    assert.deepEqual(
      ArcjetRuleToProtocol(slidingWindowRule),
      new Rule({
        rule: {
          case: "rateLimit",
          value: {
            mode: Mode.DRY_RUN,
            algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
            max: 1,
            interval: 1,
          },
        },
      }),
    );

    const emailRule: ArcjetEmailRule<{ email: string }> = {
      version: 0,
      type: "EMAIL",
      mode: "DRY_RUN",
      priority: 1,
      allow: [],
      deny: ["INVALID"],
      requireTopLevelDomain: false,
      allowDomainLiteral: false,
      validate() {
        throw new Error("should not be called");
      },
      protect() {
        throw new Error("should not be called");
      },
    };

    assert.deepEqual(
      ArcjetRuleToProtocol(emailRule),
      new Rule({
        rule: {
          case: "email",
          value: {
            mode: Mode.DRY_RUN,
            allow: [],
            deny: [EmailType.INVALID],
          },
        },
      }),
    );

    const botRule: ArcjetBotRule<{}> = {
      version: 0,
      type: "BOT",
      mode: "DRY_RUN",
      priority: 1,
      allow: [],
      deny: [],
      validate() {
        throw new Error("should not be called");
      },
      protect() {
        throw new Error("should not be called");
      },
    };
    assert.deepEqual(
      ArcjetRuleToProtocol(botRule),
      new Rule({
        rule: {
          case: "botV2",
          value: {
            mode: Mode.DRY_RUN,
            allow: [],
            deny: [],
          },
        },
      }),
    );

    const shieldRule: ArcjetShieldRule<{}> = {
      version: 0,
      type: "SHIELD",
      mode: "DRY_RUN",
      priority: 1,
      validate: mock.fn(),
      protect: mock.fn(),
    };
    assert.deepEqual(
      ArcjetRuleToProtocol(shieldRule),
      new Rule({
        rule: {
          case: "shield",
          value: {
            mode: Mode.DRY_RUN,
            autoAdded: false,
          },
        },
      }),
    );

    const sensitiveInfoRule: ArcjetSensitiveInfoRule<{}> = {
      version: 0,
      type: "SENSITIVE_INFO",
      mode: "DRY_RUN",
      priority: 1,
      allow: [],
      deny: [],
      validate() {
        throw new Error("should not be called");
      },
      protect() {
        throw new Error("should not be called");
      },
    };

    assert.deepEqual(
      ArcjetRuleToProtocol(sensitiveInfoRule),
      new Rule({
        rule: {
          case: "sensitiveInfo",
          value: {
            mode: Mode.DRY_RUN,
            allow: [],
            deny: [],
          },
        },
      }),
    );
  });
});
