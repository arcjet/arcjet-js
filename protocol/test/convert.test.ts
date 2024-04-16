/**
 * @jest-environment node
 */
import { describe, expect, test } from "@jest/globals";
import {
  ArcjetModeToProtocol,
  ArcjetBotTypeToProtocol,
  ArcjetBotTypeFromProtocol,
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
  BotType,
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
} from "../gen/es/decide/v1alpha1/decide_pb.js";
import {
  ArcjetAllowDecision,
  ArcjetBotReason,
  ArcjetBotRule,
  ArcjetChallengeDecision,
  ArcjetDenyDecision,
  ArcjetEdgeRuleReason,
  ArcjetEmailReason,
  ArcjetEmailRule,
  ArcjetErrorDecision,
  ArcjetErrorReason,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetShieldReason,
  ArcjetTokenBucketRateLimitRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetSlidingWindowRateLimitRule,
  ArcjetIpDetails,
  ArcjetShieldRule,
} from "../index.js";
import { Timestamp } from "@bufbuild/protobuf";

describe("convert", () => {
  test("ArcjetModeToProtocol", () => {
    expect(ArcjetModeToProtocol("LIVE")).toEqual(Mode.LIVE);
    expect(ArcjetModeToProtocol("DRY_RUN")).toEqual(Mode.DRY_RUN);
    expect(
      ArcjetModeToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toEqual(Mode.UNSPECIFIED);
  });

  test("ArcjetBotTypeToProtocol", () => {
    expect(ArcjetBotTypeToProtocol("AUTOMATED")).toEqual(BotType.AUTOMATED);
    expect(ArcjetBotTypeToProtocol("LIKELY_AUTOMATED")).toEqual(
      BotType.LIKELY_AUTOMATED,
    );
    expect(ArcjetBotTypeToProtocol("LIKELY_NOT_A_BOT")).toEqual(
      BotType.LIKELY_NOT_A_BOT,
    );
    expect(ArcjetBotTypeToProtocol("NOT_ANALYZED")).toEqual(
      BotType.NOT_ANALYZED,
    );
    expect(ArcjetBotTypeToProtocol("VERIFIED_BOT")).toEqual(
      BotType.VERIFIED_BOT,
    );
    expect(
      ArcjetBotTypeToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toEqual(BotType.UNSPECIFIED);
  });

  test("ArcjetBotTypeFromProtocol", () => {
    expect(ArcjetBotTypeFromProtocol(BotType.AUTOMATED)).toEqual("AUTOMATED");
    expect(ArcjetBotTypeFromProtocol(BotType.LIKELY_AUTOMATED)).toEqual(
      "LIKELY_AUTOMATED",
    );
    expect(ArcjetBotTypeFromProtocol(BotType.LIKELY_NOT_A_BOT)).toEqual(
      "LIKELY_NOT_A_BOT",
    );
    expect(ArcjetBotTypeFromProtocol(BotType.NOT_ANALYZED)).toEqual(
      "NOT_ANALYZED",
    );
    expect(ArcjetBotTypeFromProtocol(BotType.VERIFIED_BOT)).toEqual(
      "VERIFIED_BOT",
    );
    expect(() => {
      ArcjetBotTypeFromProtocol(BotType.UNSPECIFIED);
    }).toThrow("Invalid BotType");
    expect(() => {
      ArcjetBotTypeFromProtocol(
        // @ts-expect-error
        99,
      );
    }).toThrow("Invalid BotType");
  });

  test("ArcjetEmailTypeToProtocol", () => {
    expect(ArcjetEmailTypeToProtocol("DISPOSABLE")).toEqual(
      EmailType.DISPOSABLE,
    );
    expect(ArcjetEmailTypeToProtocol("FREE")).toEqual(EmailType.FREE);
    expect(ArcjetEmailTypeToProtocol("INVALID")).toEqual(EmailType.INVALID);
    expect(ArcjetEmailTypeToProtocol("NO_GRAVATAR")).toEqual(
      EmailType.NO_GRAVATAR,
    );
    expect(ArcjetEmailTypeToProtocol("NO_MX_RECORDS")).toEqual(
      EmailType.NO_MX_RECORDS,
    );
    expect(
      ArcjetEmailTypeToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toEqual(EmailType.UNSPECIFIED);
  });

  test("ArcjetEmailTypeFromProtocol", () => {
    expect(ArcjetEmailTypeFromProtocol(EmailType.DISPOSABLE)).toEqual(
      "DISPOSABLE",
    );
    expect(ArcjetEmailTypeFromProtocol(EmailType.FREE)).toEqual("FREE");
    expect(ArcjetEmailTypeFromProtocol(EmailType.INVALID)).toEqual("INVALID");
    expect(ArcjetEmailTypeFromProtocol(EmailType.NO_GRAVATAR)).toEqual(
      "NO_GRAVATAR",
    );
    expect(ArcjetEmailTypeFromProtocol(EmailType.NO_MX_RECORDS)).toEqual(
      "NO_MX_RECORDS",
    );
    expect(() => {
      ArcjetEmailTypeFromProtocol(EmailType.UNSPECIFIED);
    }).toThrow("Invalid EmailType");
    expect(() => {
      ArcjetEmailTypeFromProtocol(
        // @ts-expect-error
        99,
      );
    }).toThrow("Invalid EmailType");
  });

  test("ArcjetStackToProtocol", () => {
    expect(ArcjetStackToProtocol("NODEJS")).toEqual(SDKStack.SDK_STACK_NODEJS);
    expect(ArcjetStackToProtocol("NEXTJS")).toEqual(SDKStack.SDK_STACK_NEXTJS);
    expect(
      ArcjetStackToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toEqual(SDKStack.SDK_STACK_UNSPECIFIED);
  });

  test("ArcjetRuleStateToProtocol", () => {
    expect(ArcjetRuleStateToProtocol("CACHED")).toEqual(RuleState.CACHED);
    expect(ArcjetRuleStateToProtocol("DRY_RUN")).toEqual(RuleState.DRY_RUN);
    expect(ArcjetRuleStateToProtocol("NOT_RUN")).toEqual(RuleState.NOT_RUN);
    expect(ArcjetRuleStateToProtocol("RUN")).toEqual(RuleState.RUN);
    expect(
      ArcjetRuleStateToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toEqual(RuleState.UNSPECIFIED);
  });

  test("ArcjetRuleStateFromProtocol", () => {
    expect(ArcjetRuleStateFromProtocol(RuleState.CACHED)).toEqual("CACHED");
    expect(ArcjetRuleStateFromProtocol(RuleState.DRY_RUN)).toEqual("DRY_RUN");
    expect(ArcjetRuleStateFromProtocol(RuleState.NOT_RUN)).toEqual("NOT_RUN");
    expect(ArcjetRuleStateFromProtocol(RuleState.RUN)).toEqual("RUN");
    expect(() => {
      ArcjetRuleStateFromProtocol(RuleState.UNSPECIFIED);
    }).toThrow("Invalid RuleState");
    expect(() => {
      ArcjetRuleStateFromProtocol(
        // @ts-expect-error
        99,
      );
    }).toThrow("Invalid RuleState");
  });

  test("ArcjetConclusionToProtocol", () => {
    expect(ArcjetConclusionToProtocol("ALLOW")).toEqual(Conclusion.ALLOW);
    expect(ArcjetConclusionToProtocol("CHALLENGE")).toEqual(
      Conclusion.CHALLENGE,
    );
    expect(ArcjetConclusionToProtocol("DENY")).toEqual(Conclusion.DENY);
    expect(ArcjetConclusionToProtocol("ERROR")).toEqual(Conclusion.ERROR);
    expect(
      ArcjetConclusionToProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toEqual(Conclusion.UNSPECIFIED);
  });

  test("ArcjetConclusionFromProtocol", () => {
    expect(ArcjetConclusionFromProtocol(Conclusion.ALLOW)).toEqual("ALLOW");
    expect(ArcjetConclusionFromProtocol(Conclusion.CHALLENGE)).toEqual(
      "CHALLENGE",
    );
    expect(ArcjetConclusionFromProtocol(Conclusion.DENY)).toEqual("DENY");
    expect(ArcjetConclusionFromProtocol(Conclusion.ERROR)).toEqual("ERROR");
    expect(() => {
      ArcjetConclusionFromProtocol(Conclusion.UNSPECIFIED);
    }).toThrow("Invalid Conclusion");
    expect(() => {
      ArcjetConclusionFromProtocol(
        // @ts-expect-error
        99,
      );
    }).toThrow("Invalid Conclusion");
  });

  test("ArcjetReasonFromProtocol", () => {
    expect(ArcjetReasonFromProtocol()).toBeInstanceOf(ArcjetReason);
    expect(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "bot",
            value: {
              botType: BotType.AUTOMATED,
              botScore: 1,
              userAgentMatch: true,
              ipHosting: false,
              ipVpn: false,
              ipProxy: false,
              ipTor: false,
              ipRelay: false,
            },
          },
        }),
      ),
    ).toBeInstanceOf(ArcjetBotReason);
    expect(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "edgeRule",
            value: {},
          },
        }),
      ),
    ).toBeInstanceOf(ArcjetEdgeRuleReason);
    expect(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "email",
            value: {
              emailTypes: [EmailType.DISPOSABLE],
            },
          },
        }),
      ),
    ).toBeInstanceOf(ArcjetEmailReason);
    expect(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "error",
            value: {
              message: "Test error",
            },
          },
        }),
      ),
    ).toBeInstanceOf(ArcjetErrorReason);
    expect(
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
      ),
    ).toBeInstanceOf(ArcjetRateLimitReason);
    expect(
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
      ),
    ).toBeInstanceOf(ArcjetRateLimitReason);
    expect(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            case: "shield",
            value: {
              shieldTriggered: true,
            },
          },
        }),
      ),
    ).toBeInstanceOf(ArcjetShieldReason);
    expect(ArcjetReasonFromProtocol(new Reason())).toBeInstanceOf(ArcjetReason);
    expect(
      ArcjetReasonFromProtocol(
        new Reason({
          reason: {
            // @ts-expect-error
            case: "NOT_VALID",
          },
        }),
      ),
    ).toBeInstanceOf(ArcjetReason);
    expect(() => {
      ArcjetReasonFromProtocol(
        // @ts-expect-error
        "NOT_VALID",
      );
    }).toThrow("Invalid Reason");
    expect(() => {
      ArcjetReasonFromProtocol({
        // @ts-expect-error
        reason: "NOT_VALID",
      });
    }).toThrow("Invalid Reason");
  });

  test("ArcjetReasonToProtocol", () => {
    expect(ArcjetReasonToProtocol(new ArcjetReason())).toBeInstanceOf(Reason);
    expect(
      ArcjetReasonToProtocol(
        new ArcjetRateLimitReason({
          max: 1,
          remaining: -1,
          reset: 100,
          window: 100,
        }),
      ),
    ).toEqual(
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
    expect(
      ArcjetReasonToProtocol(
        new ArcjetRateLimitReason({
          max: 1,
          remaining: -1,
          reset: 100,
          window: 100,
          resetTime,
        }),
      ),
    ).toEqual(
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
    expect(
      ArcjetReasonToProtocol(
        new ArcjetBotReason({
          botType: "AUTOMATED",
          botScore: 1,
          userAgentMatch: true,
          ipHosting: false,
          ipVpn: false,
          ipProxy: false,
          ipTor: false,
          ipRelay: false,
        }),
      ),
    ).toEqual(
      new Reason({
        reason: {
          case: "bot",
          value: {
            botType: BotType.AUTOMATED,
            botScore: 1,
            userAgentMatch: true,
            ipHosting: false,
            ipVpn: false,
            ipProxy: false,
            ipTor: false,
            ipRelay: false,
          },
        },
      }),
    );
    expect(ArcjetReasonToProtocol(new ArcjetEdgeRuleReason())).toEqual(
      new Reason({
        reason: {
          case: "edgeRule",
          value: {},
        },
      }),
    );
    expect(
      ArcjetReasonToProtocol(new ArcjetShieldReason({ shieldTriggered: true })),
    ).toEqual(
      new Reason({
        reason: {
          case: "shield",
          value: {
            shieldTriggered: true,
          },
        },
      }),
    );
    expect(
      ArcjetReasonToProtocol(
        new ArcjetEmailReason({
          emailTypes: ["DISPOSABLE"],
        }),
      ),
    ).toEqual(
      new Reason({
        reason: {
          case: "email",
          value: {
            emailTypes: [EmailType.DISPOSABLE],
          },
        },
      }),
    );
    expect(ArcjetReasonToProtocol(new ArcjetErrorReason("Test error"))).toEqual(
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
    expect(
      ArcjetRuleResultToProtocol(
        new ArcjetRuleResult({
          ttl: 0,
          state: "RUN",
          conclusion: "ALLOW",
          reason: new ArcjetReason(),
        }),
      ),
    ).toEqual(
      new RuleResult({
        ruleId: "",
        state: RuleState.RUN,
        conclusion: Conclusion.ALLOW,
        reason: new Reason(),
      }),
    );
  });

  test("ArcjetRuleResultFromProtocol", () => {
    expect(
      ArcjetRuleResultFromProtocol(
        new RuleResult({
          ruleId: "",
          state: RuleState.RUN,
          conclusion: Conclusion.ALLOW,
          reason: new Reason(),
        }),
      ),
    ).toEqual(
      new ArcjetRuleResult({
        ttl: 0,
        state: "RUN",
        conclusion: "ALLOW",
        reason: new ArcjetReason(),
      }),
    );
  });

  test("ArcjetDecisionToProtocol", () => {
    expect(
      ArcjetDecisionToProtocol(
        new ArcjetAllowDecision({
          id: "abc123",
          ttl: 0,
          results: [],
          reason: new ArcjetReason(),
          ip: new ArcjetIpDetails(),
        }),
      ),
    ).toEqual(
      new Decision({
        id: "abc123",
        conclusion: Conclusion.ALLOW,
        ruleResults: [],
        reason: new Reason(),
      }),
    );
  });

  test("ArcjetDecisionFromProtocol", () => {
    expect(ArcjetDecisionFromProtocol()).toBeInstanceOf(ArcjetErrorDecision);
    expect(ArcjetDecisionFromProtocol(new Decision())).toBeInstanceOf(
      ArcjetErrorDecision,
    );
    expect(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.ALLOW,
        }),
      ),
    ).toBeInstanceOf(ArcjetAllowDecision);
    expect(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.DENY,
        }),
      ),
    ).toBeInstanceOf(ArcjetDenyDecision);
    expect(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.CHALLENGE,
        }),
      ),
    ).toBeInstanceOf(ArcjetChallengeDecision);
    expect(
      ArcjetDecisionFromProtocol(
        new Decision({
          conclusion: Conclusion.ERROR,
        }),
      ),
    ).toBeInstanceOf(ArcjetErrorDecision);
    expect(
      ArcjetDecisionFromProtocol({
        // @ts-expect-error
        conclusion: "NOT_VALID",
      }),
    ).toBeInstanceOf(ArcjetErrorDecision);
    expect(
      ArcjetDecisionFromProtocol(
        // @ts-expect-error
        "NOT_VALID",
      ),
    ).toBeInstanceOf(ArcjetErrorDecision);
  });

  test("ArcjetRuleToProtocol", () => {
    expect(
      ArcjetRuleToProtocol({
        type: "UNKNOWN",
        mode: "DRY_RUN",
        priority: 1,
      }),
    ).toEqual(new Rule({}));
    expect(
      ArcjetRuleToProtocol(<ArcjetTokenBucketRateLimitRule<{}>>{
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        priority: 1,
        algorithm: "TOKEN_BUCKET",
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "rateLimit",
          value: {
            mode: Mode.DRY_RUN,
            algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol(<ArcjetFixedWindowRateLimitRule<{}>>{
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        priority: 1,
        algorithm: "FIXED_WINDOW",
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "rateLimit",
          value: {
            mode: Mode.DRY_RUN,
            algorithm: RateLimitAlgorithm.FIXED_WINDOW,
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol(<ArcjetSlidingWindowRateLimitRule<{}>>{
        type: "RATE_LIMIT",
        mode: "DRY_RUN",
        priority: 1,
        algorithm: "SLIDING_WINDOW",
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "rateLimit",
          value: {
            mode: Mode.DRY_RUN,
            algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol({
        type: "EMAIL",
        mode: "DRY_RUN",
        priority: 1,
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "email",
          value: {
            mode: Mode.DRY_RUN,
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol(<ArcjetEmailRule<{ email: string }>>{
        type: "EMAIL",
        mode: "DRY_RUN",
        priority: 1,
        block: ["INVALID"],
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "email",
          value: {
            mode: Mode.DRY_RUN,
            block: [EmailType.INVALID],
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol({
        type: "BOT",
        mode: "DRY_RUN",
        priority: 1,
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "bots",
          value: {
            mode: Mode.DRY_RUN,
            patterns: {
              add: {},
              remove: [],
            },
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol(<ArcjetBotRule<{}>>{
        type: "BOT",
        mode: "DRY_RUN",
        priority: 1,
        block: ["AUTOMATED"],
        add: [["chrome", "LIKELY_NOT_A_BOT"]],
      }),
    ).toEqual(
      new Rule({
        rule: {
          case: "bots",
          value: {
            mode: Mode.DRY_RUN,
            block: [BotType.AUTOMATED],
            patterns: {
              add: {
                chrome: BotType.LIKELY_NOT_A_BOT,
              },
              remove: [],
            },
          },
        },
      }),
    );
    expect(
      ArcjetRuleToProtocol(<ArcjetShieldRule<{}>>{
        type: "SHIELD",
        mode: "DRY_RUN",
        priority: 1,
      }),
    ).toEqual(
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
  });
});
