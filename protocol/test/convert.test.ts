import assert from "node:assert/strict";
import test from "node:test";
import {
  timestampDate,
  timestampFromDate,
  timestampNow,
} from "@bufbuild/protobuf/wkt";
import { create } from "@bufbuild/protobuf";
import {
  Conclusion,
  DecisionSchema,
  EmailType,
  IpDetailsSchema,
  Mode,
  RateLimitAlgorithm,
  ReasonSchema,
  RuleResultSchema,
  RuleSchema,
  RuleState,
  SDKStack,
} from "../proto/decide/v1alpha1/decide_pb.js";
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
  type ArcjetBotRule,
  type ArcjetEmailRule,
  type ArcjetFilterRule,
  type ArcjetFixedWindowRateLimitRule,
  type ArcjetSensitiveInfoRule,
  type ArcjetSlidingWindowRateLimitRule,
  type ArcjetShieldRule,
  type ArcjetTokenBucketRateLimitRule,
  ArcjetAllowDecision,
  ArcjetBotReason,
  ArcjetChallengeDecision,
  ArcjetDenyDecision,
  ArcjetEdgeRuleReason,
  ArcjetEmailReason,
  ArcjetErrorDecision,
  ArcjetErrorReason,
  ArcjetFilterReason,
  ArcjetIpDetails,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetSensitiveInfoReason,
  ArcjetShieldReason,
} from "../index.js";

test("convert", async (t) => {
  await t.test("ArcjetModeToProtocol", async (t) => {
    await t.test("should turn `DRY_RUN` into a mode", () => {
      assert.equal(ArcjetModeToProtocol("DRY_RUN"), Mode.DRY_RUN);
    });

    await t.test("should turn `LIVE` into a mode", () => {
      assert.equal(ArcjetModeToProtocol("LIVE"), Mode.LIVE);
    });

    await t.test(
      "should turn unknown values into the `UNSPECIFIED` mode",
      () => {
        assert.equal(
          ArcjetModeToProtocol(
            // @ts-expect-error: test runtime behavior.
            "NOT_VALID",
          ),
          Mode.UNSPECIFIED,
        );
      },
    );
  });

  await t.test("ArcjetEmailTypeToProtocol", async (t) => {
    await t.test("should turn `DISPOSABLE` into an email type", () => {
      assert.equal(
        ArcjetEmailTypeToProtocol("DISPOSABLE"),
        EmailType.DISPOSABLE,
      );
    });

    await t.test("should turn `FREE` into an email type", () => {
      assert.equal(ArcjetEmailTypeToProtocol("FREE"), EmailType.FREE);
    });

    await t.test("should turn `INVALID` into an email type", () => {
      assert.equal(ArcjetEmailTypeToProtocol("INVALID"), EmailType.INVALID);
    });

    await t.test("should turn `NO_GRAVATAR` into an email type", () => {
      assert.equal(
        ArcjetEmailTypeToProtocol("NO_GRAVATAR"),
        EmailType.NO_GRAVATAR,
      );
    });

    await t.test("should turn `NO_MX_RECORDS` into an email type", () => {
      assert.equal(
        ArcjetEmailTypeToProtocol("NO_MX_RECORDS"),
        EmailType.NO_MX_RECORDS,
      );
    });

    await t.test(
      "should turn unknown values into the `UNSPECIFIED` email type",
      () => {
        assert.equal(
          ArcjetEmailTypeToProtocol(
            // @ts-expect-error
            "NOT_VALID",
          ),
          EmailType.UNSPECIFIED,
        );
      },
    );
  });

  await t.test("ArcjetEmailTypeFromProtocol", async (t) => {
    await t.test("should turn a `DISPOSABLE` email type into a string", () => {
      assert.equal(
        ArcjetEmailTypeFromProtocol(EmailType.DISPOSABLE),
        "DISPOSABLE",
      );
    });

    await t.test("should turn a `FREE` email type into a string", () => {
      assert.equal(ArcjetEmailTypeFromProtocol(EmailType.FREE), "FREE");
    });

    await t.test("should turn an `INVALID` email type into a string", () => {
      assert.equal(ArcjetEmailTypeFromProtocol(EmailType.INVALID), "INVALID");
    });

    await t.test("should turn a `NO_GRAVATAR` email type into a string", () => {
      assert.equal(
        ArcjetEmailTypeFromProtocol(EmailType.NO_GRAVATAR),
        "NO_GRAVATAR",
      );
    });

    await t.test(
      "should turn a `NO_MX_RECORDS` email type into a string",
      () => {
        assert.equal(
          ArcjetEmailTypeFromProtocol(EmailType.NO_MX_RECORDS),
          "NO_MX_RECORDS",
        );
      },
    );

    await t.test("should fail on an `UNSPECIFIED` email type", () => {
      assert.throws(() => {
        ArcjetEmailTypeFromProtocol(EmailType.UNSPECIFIED);
      }, /Invalid EmailType/);
    });

    await t.test("should fail on an unknown email type", () => {
      assert.throws(() => {
        ArcjetEmailTypeFromProtocol(
          // @ts-expect-error
          99,
        );
      }, /Invalid EmailType/);
    });
  });

  await t.test("ArcjetStackToProtocol", async (t) => {
    await t.test("should turn a `ASTRO` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("ASTRO"), SDKStack.SDK_STACK_ASTRO);
    });

    await t.test("should turn a `BUN` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("BUN"), SDKStack.SDK_STACK_BUN);
    });

    await t.test("should turn a `DENO` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("DENO"), SDKStack.SDK_STACK_DENO);
    });

    await t.test("should turn a `FASTIFY` stack into an SDK stack", () => {
      assert.equal(
        ArcjetStackToProtocol("FASTIFY"),
        SDKStack.SDK_STACK_FASTIFY,
      );
    });

    await t.test("should turn a `NESTJS` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("NESTJS"), SDKStack.SDK_STACK_NESTJS);
    });

    await t.test("should turn a `NEXTJS` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("NEXTJS"), SDKStack.SDK_STACK_NEXTJS);
    });

    await t.test("should turn a `NODEJS` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("NODEJS"), SDKStack.SDK_STACK_NODEJS);
    });

    await t.test("should turn a `REACT_ROUTER` stack into an SDK stack", () => {
      assert.equal(
        ArcjetStackToProtocol("REACT_ROUTER"),
        SDKStack.SDK_STACK_REACT_ROUTER,
      );
    });

    await t.test("should turn a `REMIX` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("REMIX"), SDKStack.SDK_STACK_REMIX);
    });

    await t.test("should turn a `SVELTEKIT` stack into an SDK stack", () => {
      assert.equal(
        ArcjetStackToProtocol("SVELTEKIT"),
        SDKStack.SDK_STACK_SVELTEKIT,
      );
    });

    await t.test("should turn a `NUXT` stack into an SDK stack", () => {
      assert.equal(ArcjetStackToProtocol("NUXT"), SDKStack.SDK_STACK_NUXT);
    });

    await t.test("should fail on an unknown stack", () => {
      assert.equal(
        ArcjetStackToProtocol(
          // @ts-expect-error
          "NOT_VALID",
        ),
        SDKStack.SDK_STACK_UNSPECIFIED,
      );
    });
  });

  await t.test("ArcjetRuleStateToProtocol", async (t) => {
    await t.test("should turn a `CACHED` value into a rule state", () => {
      assert.equal(ArcjetRuleStateToProtocol("CACHED"), RuleState.CACHED);
    });

    await t.test("should turn a `DRY_RUN` value into a rule state", () => {
      assert.equal(ArcjetRuleStateToProtocol("DRY_RUN"), RuleState.DRY_RUN);
    });

    await t.test("should turn a `NOT_RUN` value into a rule state", () => {
      assert.equal(ArcjetRuleStateToProtocol("NOT_RUN"), RuleState.NOT_RUN);
    });

    await t.test("should turn a `RUN` value into a rule state", () => {
      assert.equal(ArcjetRuleStateToProtocol("RUN"), RuleState.RUN);
    });

    await t.test("should fail on an unknown rule state", () => {
      assert.equal(
        ArcjetRuleStateToProtocol(
          // @ts-expect-error
          "NOT_VALID",
        ),
        RuleState.UNSPECIFIED,
      );
    });
  });

  await t.test("ArcjetRuleStateFromProtocol", async (t) => {
    await t.test("should turn a `CACHED` state into a string", () => {
      assert.equal(ArcjetRuleStateFromProtocol(RuleState.CACHED), "CACHED");
    });

    await t.test("should turn a `DRY_RUN` state into a string", () => {
      assert.equal(ArcjetRuleStateFromProtocol(RuleState.DRY_RUN), "DRY_RUN");
    });

    await t.test("should turn a `NOT_RUN` state into a string", () => {
      assert.equal(ArcjetRuleStateFromProtocol(RuleState.NOT_RUN), "NOT_RUN");
    });

    await t.test("should turn a `RUN` state into a string", () => {
      assert.equal(ArcjetRuleStateFromProtocol(RuleState.RUN), "RUN");
    });

    await t.test("should fail on an `UNSPECIFIED` state", () => {
      assert.throws(() => {
        ArcjetRuleStateFromProtocol(RuleState.UNSPECIFIED);
      }, /Invalid RuleState/);
    });

    await t.test("should fail on an unknown state", () => {
      assert.throws(() => {
        ArcjetRuleStateFromProtocol(
          // @ts-expect-error
          99,
        );
      }, /Invalid RuleState/);
    });
  });

  await t.test("ArcjetConclusionToProtocol", async (t) => {
    await t.test("should turn an `ALLOW` value into a conclusion", () => {
      assert.equal(ArcjetConclusionToProtocol("ALLOW"), Conclusion.ALLOW);
    });

    await t.test("should turn a `CHALLENGE` value into a conclusion", () => {
      assert.equal(
        ArcjetConclusionToProtocol("CHALLENGE"),
        Conclusion.CHALLENGE,
      );
    });

    await t.test("should turn a `DENY` value into a conclusion", () => {
      assert.equal(ArcjetConclusionToProtocol("DENY"), Conclusion.DENY);
    });

    await t.test("should turn an `ERROR` value into a conclusion", () => {
      assert.equal(ArcjetConclusionToProtocol("ERROR"), Conclusion.ERROR);
    });

    await t.test("should fail on a `NOT_VALID` value", () => {
      assert.equal(
        ArcjetConclusionToProtocol(
          // @ts-expect-error
          "NOT_VALID",
        ),
        Conclusion.UNSPECIFIED,
      );
    });
  });

  await t.test("ArcjetConclusionFromProtocol", async (t) => {
    await t.test("should turn an `ALLOW` conclusion into a string", () => {
      assert.equal(ArcjetConclusionFromProtocol(Conclusion.ALLOW), "ALLOW");
    });

    await t.test("should turn a `CHALLENGE` conclusion into a string", () => {
      assert.equal(
        ArcjetConclusionFromProtocol(Conclusion.CHALLENGE),
        "CHALLENGE",
      );
    });

    await t.test("should turn a `DENY` conclusion into a string", () => {
      assert.equal(ArcjetConclusionFromProtocol(Conclusion.DENY), "DENY");
    });

    await t.test("should turn an `ERROR` conclusion into a string", () => {
      assert.equal(ArcjetConclusionFromProtocol(Conclusion.ERROR), "ERROR");
    });

    await t.test("should fail on an `UNSPECIFIED` conclusion", () => {
      assert.throws(() => {
        ArcjetConclusionFromProtocol(Conclusion.UNSPECIFIED);
      }, /Invalid Conclusion/);
    });

    await t.test("should fail on an unknown conclusion", () => {
      assert.throws(() => {
        ArcjetConclusionFromProtocol(
          // @ts-expect-error
          99,
        );
      }, /Invalid Conclusion/);
    });
  });

  await t.test("ArcjetReasonFromProtocol", async (t) => {
    await t.test("should create an anonymous reason w/o proto", () => {
      const reason = ArcjetReasonFromProtocol();

      assert.ok(reason instanceof ArcjetReason);
      assert.equal(reason.type, undefined);
    });

    await t.test("should create an anonymous reason w/ an empty proto", () => {
      const reason = ArcjetReasonFromProtocol(create(ReasonSchema));

      assert.ok(reason instanceof ArcjetReason);
      assert.equal(reason.type, undefined);
    });

    await t.test("should create a bot reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: { case: "botV2", value: { allowed: [], denied: [] } },
        }),
      );

      assert.ok(reason instanceof ArcjetBotReason);
      assert.equal(reason.type, "BOT");
      assert.equal(reason.isVerified(), false);
      assert.equal(reason.isSpoofed(), false);
      assert.deepEqual(reason.allowed, []);
      assert.deepEqual(reason.denied, []);
      assert.equal(reason.spoofed, false);
      assert.equal(reason.verified, false);
    });

    await t.test("should create a bot reason (spoofed, verified)", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "botV2",
            value: { allowed: [], denied: [], spoofed: true, verified: true },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetBotReason);
      assert.equal(reason.type, "BOT");
      assert.equal(reason.isVerified(), true);
      assert.equal(reason.isSpoofed(), true);
      assert.deepEqual(reason.allowed, []);
      assert.deepEqual(reason.denied, []);
      assert.equal(reason.spoofed, true);
      assert.equal(reason.verified, true);
    });

    await t.test("should create an edge rule reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, { reason: { case: "edgeRule", value: {} } }),
      );

      assert.ok(reason instanceof ArcjetEdgeRuleReason);
      assert.equal(reason.type, "EDGE_RULE");
    });

    await t.test("should create an email reason (empty)", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: { case: "email", value: {} },
        }),
      );

      assert.ok(reason instanceof ArcjetEmailReason);
      assert.equal(reason.type, "EMAIL");
      assert.deepEqual(reason.emailTypes, []);
    });

    await t.test("should create an email reason (type)", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "email",
            value: { emailTypes: [EmailType.DISPOSABLE] },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetEmailReason);
      assert.equal(reason.type, "EMAIL");
      assert.deepEqual(reason.emailTypes, ["DISPOSABLE"]);
    });

    await t.test("should create an error reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "error",
            value: { message: "Test error" },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetErrorReason);
      assert.equal(reason.type, "ERROR");
      assert.equal(reason.message, "Test error");
    });

    await t.test("should create a rate limit reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "rateLimit",
            value: {
              count: 2,
              max: 1,
              remaining: -1,
              resetInSeconds: 1000,
              windowInSeconds: 1000,
            },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetRateLimitReason);
      assert.equal(reason.type, "RATE_LIMIT");
      assert.equal(reason.max, 1);
      assert.equal(reason.remaining, -1);
      assert.equal(reason.resetTime, undefined);
      assert.equal(reason.reset, 1000);
      assert.equal(reason.window, 1000);
    });

    await t.test("should create a rate limit reason w/ `resetTime`", () => {
      const now = timestampNow();
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "rateLimit",
            value: {
              count: 2,
              max: 1,
              remaining: -1,
              resetInSeconds: 1000,
              resetTime: now,
              windowInSeconds: 1000,
            },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetRateLimitReason);
      assert.equal(reason.type, "RATE_LIMIT");
      assert.equal(reason.max, 1);
      assert.equal(reason.remaining, -1);
      assert.deepEqual(reason.resetTime, timestampDate(now));
      assert.equal(reason.reset, 1000);
      assert.equal(reason.window, 1000);
    });

    await t.test("should create a filter reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "filter",
            value: {
              matchedExpressions: ["ip.src == 1.2.3.4"],
              undeterminedExpressions: [],
            },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetFilterReason);
      assert.equal(reason.type, "FILTER");
      assert.deepEqual(reason.matchedExpressions, ["ip.src == 1.2.3.4"]);
      assert.deepEqual(reason.undeterminedExpressions, []);
    });

    await t.test("should create a sensitive info reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: {
            case: "sensitiveInfo",
            value: {
              denied: [
                { end: 16, identifiedType: "credit-card-number", start: 0 },
              ],
            },
          },
        }),
      );

      assert.ok(reason instanceof ArcjetSensitiveInfoReason);
      assert.equal(reason.type, "SENSITIVE_INFO");
      assert.deepEqual(reason.allowed, []);
      // Pass through `JSON` to drop info on the internal class `IdentifiedEntity`.
      assert.deepEqual(JSON.parse(JSON.stringify(reason.denied)), [
        {
          $typeName: "proto.decide.v1alpha1.IdentifiedEntity",
          end: 16,
          identifiedType: "credit-card-number",
          start: 0,
        },
      ]);
    });

    await t.test("should create an error reason on a bot reason", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: { case: "bot", value: {} },
        }),
      );

      assert.ok(reason instanceof ArcjetErrorReason);
      assert.equal(reason.type, "ERROR");
      assert.equal(reason.message, "bot detection v1 is deprecated");
    });

    await t.test("should create a shield reason (triggered)", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: { case: "shield", value: { shieldTriggered: true } },
        }),
      );

      assert.ok(reason instanceof ArcjetShieldReason);
      assert.equal(reason.type, "SHIELD");
      assert.equal(reason.shieldTriggered, true);
    });

    await t.test("should create a shield reason (not triggered)", () => {
      const reason = ArcjetReasonFromProtocol(
        create(ReasonSchema, {
          reason: { case: "shield", value: {} },
        }),
      );

      assert.ok(reason instanceof ArcjetShieldReason);
      assert.equal(reason.type, "SHIELD");
      assert.equal(reason.shieldTriggered, false);
    });

    await t.test(
      "should create an anonymous reason w/ an unknown `case` proto",
      () => {
        const reason = ArcjetReasonFromProtocol(
          create(ReasonSchema, {
            reason: {
              // @ts-expect-error: test runtime behavior.
              case: "NOT_VALID",
            },
          }),
        );

        assert.ok(reason instanceof ArcjetReason);
        assert.equal(reason.type, undefined);
      },
    );

    await t.test("should fail on an invalid reason (string)", () => {
      assert.throws(() => {
        ArcjetReasonFromProtocol(
          // @ts-expect-error: test runtime behavior.
          "NOT_VALID",
        );
      }, /Invalid Reason/);
    });

    await t.test("should fail on an invalid reason (object)", () => {
      assert.throws(() => {
        ArcjetReasonFromProtocol({
          // @ts-expect-error: test runtime behavior.
          reason: "NOT_VALID",
        });
      }, /Invalid Reason/);
    });
  });

  await t.test("ArcjetReasonToProtocol", async (t) => {
    await t.test("should create an anonymous reason w/ an empty proto", () => {
      const reason = ArcjetReasonToProtocol(new ArcjetReason());

      assert.equal(reason.$typeName, "proto.decide.v1alpha1.Reason");
      assert.equal(reason.reason.case, undefined);
    });

    await t.test(
      "should create a protocol reason from an arcjet rate limit reason",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(
            new ArcjetRateLimitReason({
              max: 1,
              remaining: -1,
              reset: 100,
              window: 100,
            }),
          ),
          create(ReasonSchema, {
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
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet rate limit reason w/ `resetTime`",
      () => {
        const resetTime = new Date();

        assert.deepEqual(
          ArcjetReasonToProtocol(
            new ArcjetRateLimitReason({
              max: 1,
              remaining: -1,
              resetTime,
              reset: 100,
              window: 100,
            }),
          ),
          create(ReasonSchema, {
            reason: {
              case: "rateLimit",
              value: {
                max: 1,
                remaining: -1,
                resetInSeconds: 100,
                resetTime: timestampFromDate(resetTime),
                windowInSeconds: 100,
              },
            },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet bot reason",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(
            new ArcjetBotReason({
              allowed: ["GOOGLE_CRAWLER"],
              denied: [],
              spoofed: false,
              verified: true,
            }),
          ),
          create(ReasonSchema, {
            reason: {
              case: "botV2",
              value: {
                allowed: ["GOOGLE_CRAWLER"],
                denied: [],
                spoofed: false,
                verified: true,
              },
            },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet filter reason",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(
            new ArcjetFilterReason({
              matchedExpressions: ["ip.src == 1.2.3.4"],
              undeterminedExpressions: [],
            }),
          ),
          create(ReasonSchema, {
            reason: {
              case: "filter",
              value: {
                matchedExpressions: ["ip.src == 1.2.3.4"],
                undeterminedExpressions: [],
              },
            },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet sensitive info reason",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(
            new ArcjetSensitiveInfoReason({
              allowed: [],
              denied: [
                { end: 16, identifiedType: "credit-card-number", start: 0 },
              ],
            }),
          ),
          create(ReasonSchema, {
            reason: {
              case: "sensitiveInfo",
              value: {
                denied: [
                  { end: 16, identifiedType: "credit-card-number", start: 0 },
                ],
              },
            },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet edge rule reason",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(new ArcjetEdgeRuleReason()),
          create(ReasonSchema, { reason: { case: "edgeRule", value: {} } }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet shield reason",
      (t) => {
        assert.deepEqual(
          ArcjetReasonToProtocol(
            new ArcjetShieldReason({ shieldTriggered: true }),
          ),
          create(ReasonSchema, {
            reason: { case: "shield", value: { shieldTriggered: true } },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet email reason",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(new ArcjetEmailReason({})),
          create(ReasonSchema, {
            reason: { case: "email", value: { emailTypes: [] } },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet error reason (string)",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(new ArcjetErrorReason("Test error")),
          create(ReasonSchema, {
            reason: { case: "error", value: { message: "Test error" } },
          }),
        );
      },
    );

    await t.test(
      "should create a protocol reason from an arcjet error reason (error)",
      () => {
        assert.deepEqual(
          ArcjetReasonToProtocol(new ArcjetErrorReason(new Error("hi"))),
          create(ReasonSchema, {
            reason: { case: "error", value: { message: "hi" } },
          }),
        );
      },
    );
  });

  await t.test("ArcjetRuleResultToProtocol", async (t) => {
    await t.test(
      "should create a protocol rule result from an arcjet rule result",
      () => {
        assert.deepEqual(
          ArcjetRuleResultToProtocol(
            new ArcjetRuleResult({
              conclusion: "ALLOW",
              fingerprint: "fingerprint",
              reason: new ArcjetReason(),
              ruleId: "rule-id",
              state: "RUN",
              ttl: 0,
            }),
          ),
          create(RuleResultSchema, {
            conclusion: Conclusion.ALLOW,
            fingerprint: "fingerprint",
            reason: create(ReasonSchema),
            ruleId: "rule-id",
            state: RuleState.RUN,
          }),
        );
      },
    );
  });

  await t.test("ArcjetRuleResultFromProtocol", async (t) => {
    await t.test(
      "should create an arcjet rule result from a protocol rule result",
      () => {
        assert.deepEqual(
          ArcjetRuleResultFromProtocol(
            create(RuleResultSchema, {
              conclusion: Conclusion.ALLOW,
              fingerprint: "fingerprint",
              reason: create(ReasonSchema),
              ruleId: "rule-id",
              state: RuleState.RUN,
            }),
          ),
          new ArcjetRuleResult({
            conclusion: "ALLOW",
            fingerprint: "fingerprint",
            reason: new ArcjetReason(),
            ruleId: "rule-id",
            state: "RUN",
            ttl: 0,
          }),
        );
      },
    );
  });

  await t.test("ArcjetDecisionToProtocol", async (t) => {
    await t.test(
      "should create a protocol decision from an arcjet decision",
      () => {
        assert.deepEqual(
          ArcjetDecisionToProtocol(
            new ArcjetAllowDecision({
              id: "abc123",
              ip: new ArcjetIpDetails(),
              reason: new ArcjetReason(),
              results: [],
              ttl: 0,
            }),
          ),
          create(DecisionSchema, {
            conclusion: Conclusion.ALLOW,
            id: "abc123",
            reason: create(ReasonSchema),
            ruleResults: [],
          }),
        );
      },
    );
  });

  await t.test("ArcjetDecisionFromProtocol", async (t) => {
    await t.test("should create an arcjet error decision w/o proto", () => {
      const decision = ArcjetDecisionFromProtocol();

      assert.ok(decision instanceof ArcjetErrorDecision);
      assert.equal(decision.conclusion, "ERROR");
    });

    await t.test(
      "should create an arcjet error decision w/ empty proto",
      () => {
        const decision = ArcjetDecisionFromProtocol(create(DecisionSchema));

        assert.ok(decision instanceof ArcjetErrorDecision);
        assert.equal(decision.conclusion, "ERROR");
      },
    );

    await t.test(
      "should create an arcjet allow decision w/ an allow conclusion proto",
      () => {
        const decision = ArcjetDecisionFromProtocol(
          create(DecisionSchema, { conclusion: Conclusion.ALLOW }),
        );

        assert.ok(decision instanceof ArcjetAllowDecision);
        assert.equal(decision.conclusion, "ALLOW");
      },
    );

    await t.test(
      "should create an arcjet deny decision w/ a deny conclusion proto",
      () => {
        const decision = ArcjetDecisionFromProtocol(
          create(DecisionSchema, { conclusion: Conclusion.DENY }),
        );

        assert.ok(decision instanceof ArcjetDenyDecision);
        assert.equal(decision.conclusion, "DENY");
      },
    );

    await t.test(
      "should create an arcjet challenge decision w/ a challenge conclusion proto",
      () => {
        const decision = ArcjetDecisionFromProtocol(
          create(DecisionSchema, { conclusion: Conclusion.CHALLENGE }),
        );

        assert.ok(decision instanceof ArcjetChallengeDecision);
        assert.equal(decision.conclusion, "CHALLENGE");
      },
    );

    await t.test(
      "should create an arcjet error decision w/ an error conclusion proto",
      () => {
        const decision = ArcjetDecisionFromProtocol(
          create(DecisionSchema, { conclusion: Conclusion.ERROR }),
        );

        assert.ok(decision instanceof ArcjetErrorDecision);
        assert.equal(decision.conclusion, "ERROR");
      },
    );

    await t.test(
      "should create an arcjet error decision w/ an invalid conclusion proto",
      () => {
        const decision = ArcjetDecisionFromProtocol({
          // @ts-expect-error: test runtime behavior.
          conclusion: "NOT_VALID",
        });

        assert.ok(decision instanceof ArcjetErrorDecision);
        assert.equal(decision.conclusion, "ERROR");
      },
    );

    await t.test(
      "should create an arcjet error decision w/ an invalid proto",
      () => {
        const decision = ArcjetDecisionFromProtocol(
          // @ts-expect-error: test runtime behavior.
          "NOT_VALID",
        );

        assert.ok(decision instanceof ArcjetErrorDecision);
        assert.equal(decision.conclusion, "ERROR");
      },
    );

    await t.test(
      "should create an arcjet decision w/ an IP detail proto (full)",
      () => {
        const latitude = 40.7127;
        const longitude = 74.0059;
        const decision = ArcjetDecisionFromProtocol(
          create(DecisionSchema, {
            ipDetails: create(IpDetailsSchema, {
              asnCountry: "a",
              asnDomain: "b",
              asnName: "c",
              asnType: "d",
              asn: "e",
              city: "f",
              continentName: "g",
              continent: "h",
              countryName: "i",
              country: "j",
              latitude,
              longitude,
              postalCode: "k",
              region: "l",
              service: "m",
              timezone: "America/New_York",
            }),
          }),
        );

        assert.deepEqual(JSON.parse(JSON.stringify(decision.ip)), {
          accuracyRadius: 0,
          asnCountry: "a",
          asnDomain: "b",
          asnName: "c",
          asnType: "d",
          asn: "e",
          city: "f",
          continentName: "g",
          continent: "h",
          countryName: "i",
          country: "j",
          latitude,
          longitude,
          postalCode: "k",
          region: "l",
          service: "m",
          timezone: "America/New_York",
        });
      },
    );

    await t.test(
      "should create an arcjet decision w/ an IP detail proto (empty)",
      () => {
        const decision = ArcjetDecisionFromProtocol(
          create(DecisionSchema, { ipDetails: create(IpDetailsSchema) }),
        );

        assert.deepEqual(JSON.parse(JSON.stringify(decision.ip)), {});
      },
    );
  });

  await t.test("ArcjetRuleToProtocol", async (t) => {
    await t.test("should create an anonymous protocol rule", () => {
      const rule = ArcjetRuleToProtocol({
        mode: "DRY_RUN",
        priority: 1,
        protect() {
          assert.fail("should not call `protect`");
        },
        type: "UNKNOWN",
        validate() {
          assert.fail("should not call `validate`");
        },
        version: 0,
      });

      assert.deepEqual(rule, create(RuleSchema));
      assert.equal(rule.rule.case, undefined);
    });

    await t.test(
      "should create a rate limit protocol rule (token bucket)",
      () => {
        const rule = ArcjetRuleToProtocol({
          algorithm: "TOKEN_BUCKET",
          capacity: 1,
          interval: 1,
          mode: "DRY_RUN",
          priority: 1,
          protect() {
            assert.fail("should not call `protect`");
          },
          refillRate: 1,
          type: "RATE_LIMIT",
          validate() {
            assert.fail("should not call `validate`");
          },
          version: 0,
          // TODO: `{}` is confusing in TypeScript, and likely points to a bug.
        } as ArcjetTokenBucketRateLimitRule<{}>);

        assert.deepEqual(
          rule,
          create(RuleSchema, {
            rule: {
              case: "rateLimit",
              value: {
                algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
                capacity: 1,
                interval: 1,
                mode: Mode.DRY_RUN,
                refillRate: 1,
              },
            },
          }),
        );
        assert.equal(rule.rule.case, "rateLimit");
      },
    );

    await t.test(
      "should create a rate limit protocol rule (fixed window)",
      () => {
        const rule = ArcjetRuleToProtocol({
          algorithm: "FIXED_WINDOW",
          max: 1,
          mode: "DRY_RUN",
          type: "RATE_LIMIT",
          validate() {
            assert.fail("should not call `validate`");
          },
          version: 0,
          priority: 1,
          protect() {
            assert.fail("should not call `protect`");
          },
          window: 1,
          // TODO: `{}` is confusing in TypeScript, and likely points to a bug.
        } as ArcjetFixedWindowRateLimitRule<{}>);

        assert.deepEqual(
          rule,
          create(RuleSchema, {
            rule: {
              case: "rateLimit",
              value: {
                algorithm: RateLimitAlgorithm.FIXED_WINDOW,
                max: 1,
                mode: Mode.DRY_RUN,
                windowInSeconds: 1,
              },
            },
          }),
        );
        assert.equal(rule.rule.case, "rateLimit");
      },
    );

    await t.test(
      "should create a rate limit protocol rule (sliding window)",
      () => {
        const rule = ArcjetRuleToProtocol({
          algorithm: "SLIDING_WINDOW",
          interval: 1,
          max: 1,
          mode: "DRY_RUN",
          priority: 1,
          protect() {
            assert.fail("should not call `protect`");
          },
          type: "RATE_LIMIT",
          validate() {
            assert.fail("should not call `validate`");
          },
          version: 0,
          // TODO: `{}` is confusing in TypeScript, and likely points to a bug.
        } as ArcjetSlidingWindowRateLimitRule<{}>);

        assert.deepEqual(
          rule,
          create(RuleSchema, {
            rule: {
              case: "rateLimit",
              value: {
                algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
                interval: 1,
                max: 1,
                mode: Mode.DRY_RUN,
              },
            },
          }),
        );
        assert.equal(rule.rule.case, "rateLimit");
      },
    );

    await t.test("should create an email protocol rule", () => {
      const rule = ArcjetRuleToProtocol({
        allowDomainLiteral: false,
        allow: [],
        deny: ["INVALID"],
        mode: "DRY_RUN",
        priority: 1,
        protect() {
          assert.fail("should not call `protect`");
        },
        requireTopLevelDomain: false,
        type: "EMAIL",
        validate() {
          assert.fail("should not call `validate`");
        },
        version: 0,
      } as ArcjetEmailRule<{ email: string }>);

      assert.deepEqual(
        rule,
        create(RuleSchema, {
          rule: {
            case: "email",
            value: { allow: [], deny: [EmailType.INVALID], mode: Mode.DRY_RUN },
          },
        }),
      );
      assert.equal(rule.rule.case, "email");
    });

    await t.test("should create a bot protocol rule", () => {
      const rule = ArcjetRuleToProtocol({
        allow: [],
        deny: [],
        mode: "DRY_RUN",
        type: "BOT",
        priority: 1,
        protect() {
          assert.fail("should not call `protect`");
        },
        validate() {
          assert.fail("should not call `validate`");
        },
        version: 0,
        // TODO: `{}` is confusing in TypeScript, and likely points to a bug.
      } as ArcjetBotRule<{}>);

      assert.deepEqual(
        rule,
        create(RuleSchema, {
          rule: {
            case: "botV2",
            value: { allow: [], mode: Mode.DRY_RUN, deny: [] },
          },
        }),
      );
      assert.equal(rule.rule.case, "botV2");
    });

    await t.test("should create a shield protocol rule", () => {
      const rule = ArcjetRuleToProtocol({
        mode: "DRY_RUN",
        priority: 1,
        protect() {
          assert.fail("should not call `protect`");
        },
        type: "SHIELD",
        validate() {
          assert.fail("should not call `validate`");
        },
        version: 0,
        // TODO: `{}` is confusing in TypeScript, and likely points to a bug.
      } as ArcjetShieldRule<{}>);

      assert.deepEqual(
        rule,
        create(RuleSchema, {
          rule: {
            case: "shield",
            value: { autoAdded: false, mode: Mode.DRY_RUN },
          },
        }),
      );
      assert.equal(rule.rule.case, "shield");
    });

    await t.test("should create a filter protocol rule", () => {
      const rule = ArcjetRuleToProtocol({
        allow: [],
        deny: [],
        mode: "DRY_RUN",
        priority: 1,
        protect() {
          assert.fail("should not call `protect`");
        },
        type: "FILTER",
        validate() {
          assert.fail("should not call `validate`");
        },
        version: 0,
      } as ArcjetFilterRule);

      assert.deepEqual(
        rule,
        create(RuleSchema, {
          rule: {
            case: "filter",
            value: { mode: Mode.DRY_RUN },
          },
        }),
      );
      assert.equal(rule.rule.case, "filter");
    });

    await t.test("should create a sensitive info protocol rule", () => {
      const rule = ArcjetRuleToProtocol({
        allow: [],
        deny: [],
        mode: "DRY_RUN",
        priority: 1,
        protect() {
          assert.fail("should not call `protect`");
        },
        type: "SENSITIVE_INFO",
        validate() {
          assert.fail("should not call `validate`");
        },
        version: 0,
        // TODO: `{}` is confusing in TypeScript, and likely points to a bug.
      } as ArcjetSensitiveInfoRule<{}>);

      assert.deepEqual(
        rule,
        create(RuleSchema, {
          rule: {
            case: "sensitiveInfo",
            value: { allow: [], deny: [], mode: Mode.DRY_RUN },
          },
        }),
      );
      assert.equal(rule.rule.case, "sensitiveInfo");
    });
  });
});
