import { Timestamp } from "@bufbuild/protobuf";
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
  ArcjetRuleResult,
  ArcjetShieldReason,
  ArcjetBotType,
  ArcjetConclusion,
  ArcjetDecision,
  ArcjetEmailType,
  ArcjetMode,
  ArcjetReason,
  ArcjetRuleState,
  ArcjetStack,
  ArcjetRule,
  ArcjetRateLimitRule,
  ArcjetBotRule,
  ArcjetEmailRule,
  ArcjetTokenBucketRateLimitRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetSlidingWindowRateLimitRule,
} from "./index";
import {
  BotReason,
  BotType,
  Conclusion,
  Decision,
  EdgeRuleReason,
  EmailReason,
  EmailType,
  ErrorReason,
  Mode,
  RateLimitAlgorithm,
  RateLimitReason,
  Reason,
  Rule,
  RuleResult,
  RuleState,
  SDKStack,
  ShieldReason,
} from "./gen/es/decide/v1alpha1/decide_pb.js";

export function ArcjetModeToProtocol(mode: ArcjetMode) {
  switch (mode) {
    case "LIVE":
      return Mode.LIVE;
    case "DRY_RUN":
      return Mode.DRY_RUN;
    default:
      const _exhaustive: never = mode;
      return Mode.UNSPECIFIED;
  }
}

export function ArcjetBotTypeToProtocol(botType: ArcjetBotType): BotType {
  switch (botType) {
    case "NOT_ANALYZED":
      return BotType.NOT_ANALYZED;
    case "AUTOMATED":
      return BotType.AUTOMATED;
    case "LIKELY_AUTOMATED":
      return BotType.LIKELY_AUTOMATED;
    case "LIKELY_NOT_A_BOT":
      return BotType.LIKELY_NOT_A_BOT;
    case "VERIFIED_BOT":
      return BotType.VERIFIED_BOT;
    default:
      const _exhaustive: never = botType;
      return BotType.UNSPECIFIED;
  }
}

export function ArcjetBotTypeFromProtocol(botType: BotType): ArcjetBotType {
  switch (botType) {
    case BotType.UNSPECIFIED:
      throw new Error("Invalid BotType");
    case BotType.NOT_ANALYZED:
      return "NOT_ANALYZED";
    case BotType.AUTOMATED:
      return "AUTOMATED";
    case BotType.LIKELY_AUTOMATED:
      return "LIKELY_AUTOMATED";
    case BotType.LIKELY_NOT_A_BOT:
      return "LIKELY_NOT_A_BOT";
    case BotType.VERIFIED_BOT:
      return "VERIFIED_BOT";
    default:
      const _exhaustive: never = botType;
      throw new Error("Invalid BotType");
  }
}

export function ArcjetEmailTypeToProtocol(
  emailType: ArcjetEmailType,
): EmailType {
  switch (emailType) {
    case "DISPOSABLE":
      return EmailType.DISPOSABLE;
    case "FREE":
      return EmailType.FREE;
    case "NO_MX_RECORDS":
      return EmailType.NO_MX_RECORDS;
    case "NO_GRAVATAR":
      return EmailType.NO_GRAVATAR;
    case "INVALID":
      return EmailType.INVALID;
    default:
      const _exhaustive: never = emailType;
      return EmailType.UNSPECIFIED;
  }
}

export function ArcjetEmailTypeFromProtocol(
  emailType: EmailType,
): ArcjetEmailType {
  switch (emailType) {
    case EmailType.UNSPECIFIED:
      throw new Error("Invalid EmailType");
    case EmailType.DISPOSABLE:
      return "DISPOSABLE";
    case EmailType.FREE:
      return "FREE";
    case EmailType.NO_MX_RECORDS:
      return "NO_MX_RECORDS";
    case EmailType.NO_GRAVATAR:
      return "NO_GRAVATAR";
    case EmailType.INVALID:
      return "INVALID";
    default:
      const _exhaustive: never = emailType;
      throw new Error("Invalid EmailType");
  }
}

export function ArcjetStackToProtocol(stack: ArcjetStack): SDKStack {
  switch (stack) {
    case "NODEJS":
      return SDKStack.SDK_STACK_NODEJS;
    case "NEXTJS":
      return SDKStack.SDK_STACK_NEXTJS;
    default:
      const _exhaustive: never = stack;
      return SDKStack.SDK_STACK_UNSPECIFIED;
  }
}

export function ArcjetRuleStateToProtocol(stack: ArcjetRuleState): RuleState {
  switch (stack) {
    case "RUN":
      return RuleState.RUN;
    case "NOT_RUN":
      return RuleState.NOT_RUN;
    case "CACHED":
      return RuleState.CACHED;
    case "DRY_RUN":
      return RuleState.DRY_RUN;
    default:
      const _exhaustive: never = stack;
      return RuleState.UNSPECIFIED;
  }
}

export function ArcjetRuleStateFromProtocol(
  ruleState: RuleState,
): ArcjetRuleState {
  switch (ruleState) {
    case RuleState.UNSPECIFIED:
      throw new Error("Invalid RuleState");
    case RuleState.RUN:
      return "RUN";
    case RuleState.NOT_RUN:
      return "NOT_RUN";
    case RuleState.DRY_RUN:
      return "DRY_RUN";
    case RuleState.CACHED:
      return "CACHED";
    default:
      const _exhaustive: never = ruleState;
      throw new Error("Invalid RuleState");
  }
}

export function ArcjetConclusionToProtocol(
  conclusion: ArcjetConclusion,
): Conclusion {
  switch (conclusion) {
    case "ALLOW":
      return Conclusion.ALLOW;
    case "DENY":
      return Conclusion.DENY;
    case "CHALLENGE":
      return Conclusion.CHALLENGE;
    case "ERROR":
      return Conclusion.ERROR;
    default:
      const _exhaustive: never = conclusion;
      return Conclusion.UNSPECIFIED;
  }
}

export function ArcjetConclusionFromProtocol(
  conclusion: Conclusion,
): ArcjetConclusion {
  switch (conclusion) {
    case Conclusion.UNSPECIFIED:
      throw new Error("Invalid Conclusion");
    case Conclusion.ALLOW:
      return "ALLOW";
    case Conclusion.DENY:
      return "DENY";
    case Conclusion.CHALLENGE:
      return "CHALLENGE";
    case Conclusion.ERROR:
      return "ERROR";
    default:
      const _exhaustive: never = conclusion;
      throw new Error("Invalid Conclusion");
  }
}

export function ArcjetReasonFromProtocol(proto?: Reason) {
  if (typeof proto === "undefined") {
    return new ArcjetReason();
  }

  if (typeof proto !== "object" || typeof proto.reason !== "object") {
    throw new Error("Invalid Reason");
  }

  switch (proto.reason.case) {
    case "rateLimit": {
      const reason = proto.reason.value;
      return new ArcjetRateLimitReason({
        max: reason.max,
        remaining: reason.remaining,
        reset: reason.resetInSeconds,
        window: reason.windowInSeconds,
        resetTime: reason.resetTime?.toDate(),
      });
    }
    case "bot": {
      const reason = proto.reason.value;
      return new ArcjetBotReason({
        botType: ArcjetBotTypeFromProtocol(reason.botType),
        botScore: reason.botScore,
        userAgentMatch: reason.userAgentMatch,
        ipHosting: reason.ipHosting,
        ipVpn: reason.ipVpn,
        ipProxy: reason.ipProxy,
        ipTor: reason.ipTor,
        ipRelay: reason.ipRelay,
      });
    }
    case "edgeRule": {
      return new ArcjetEdgeRuleReason();
    }
    case "shield": {
      const reason = proto.reason.value;
      return new ArcjetShieldReason({
        shieldTriggered: reason.shieldTriggered,
      });
    }
    case "email": {
      const reason = proto.reason.value;
      return new ArcjetEmailReason({
        emailTypes: reason.emailTypes.map(ArcjetEmailTypeFromProtocol),
      });
    }
    case "error": {
      const reason = proto.reason.value;
      return new ArcjetErrorReason(reason.message);
    }
    case undefined: {
      return new ArcjetReason();
    }
    default: {
      const _exhaustive: never = proto.reason;
      return new ArcjetReason();
    }
  }
}

export function ArcjetReasonToProtocol(reason: ArcjetReason): Reason {
  if (reason.isRateLimit()) {
    return new Reason({
      reason: {
        case: "rateLimit",
        value: new RateLimitReason({
          max: reason.max,
          remaining: reason.remaining,
          resetInSeconds: reason.reset,
          windowInSeconds: reason.window,
          resetTime: reason.resetTime
            ? Timestamp.fromDate(reason.resetTime)
            : undefined,
        }),
      },
    });
  }

  if (reason.isBot()) {
    return new Reason({
      reason: {
        case: "bot",
        value: new BotReason({
          botType: ArcjetBotTypeToProtocol(reason.botType),
          botScore: reason.botScore,
          userAgentMatch: reason.userAgentMatch,
          ipHosting: reason.ipHosting,
          ipVpn: reason.ipVpn,
          ipProxy: reason.ipProxy,
          ipTor: reason.ipTor,
          ipRelay: reason.ipRelay,
        }),
      },
    });
  }

  if (reason.isEdgeRule()) {
    return new Reason({
      reason: {
        case: "edgeRule",
        value: new EdgeRuleReason({}),
      },
    });
  }

  if (reason.isShield()) {
    return new Reason({
      reason: {
        case: "shield",
        value: new ShieldReason({
          shieldTriggered: reason.shieldTriggered,
        }),
      },
    });
  }

  if (reason.isEmail()) {
    return new Reason({
      reason: {
        case: "email",
        value: new EmailReason({
          emailTypes: reason.emailTypes.map(ArcjetEmailTypeToProtocol),
        }),
      },
    });
  }

  if (reason.isError()) {
    return new Reason({
      reason: {
        case: "error",
        value: new ErrorReason({
          message: reason.message,
        }),
      },
    });
  }

  return new Reason();
}

export function ArcjetRuleResultToProtocol(
  ruleResult: ArcjetRuleResult,
): RuleResult {
  return new RuleResult({
    ruleId: ruleResult.ruleId,
    ttl: ruleResult.ttl,
    state: ArcjetRuleStateToProtocol(ruleResult.state),
    conclusion: ArcjetConclusionToProtocol(ruleResult.conclusion),
    reason: ArcjetReasonToProtocol(ruleResult.reason),
  });
}

export function ArcjetRuleResultFromProtocol(
  proto: RuleResult,
): ArcjetRuleResult {
  return new ArcjetRuleResult({
    ttl: proto.ttl,
    state: ArcjetRuleStateFromProtocol(proto.state),
    conclusion: ArcjetConclusionFromProtocol(proto.conclusion),
    reason: ArcjetReasonFromProtocol(proto.reason),
  });
}

export function ArcjetDecisionToProtocol(decision: ArcjetDecision): Decision {
  return new Decision({
    id: decision.id,
    ttl: decision.ttl,
    conclusion: ArcjetConclusionToProtocol(decision.conclusion),
    reason: ArcjetReasonToProtocol(decision.reason),
    ruleResults: decision.results.map(ArcjetRuleResultToProtocol),
  });
}

export function ArcjetDecisionFromProtocol(
  decision?: Decision,
): ArcjetDecision {
  if (typeof decision === "undefined") {
    return new ArcjetErrorDecision({
      reason: new ArcjetErrorReason("Missing Decision"),
      ttl: 0,
      results: [],
    });
  }

  const results = Array.isArray(decision.ruleResults)
    ? decision.ruleResults.map(ArcjetRuleResultFromProtocol)
    : [];

  switch (decision.conclusion) {
    case Conclusion.ALLOW:
      return new ArcjetAllowDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: ArcjetReasonFromProtocol(decision.reason),
        results,
      });
    case Conclusion.DENY:
      return new ArcjetDenyDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: ArcjetReasonFromProtocol(decision.reason),
        results,
      });
    case Conclusion.CHALLENGE:
      return new ArcjetChallengeDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: ArcjetReasonFromProtocol(decision.reason),
        results,
      });
    case Conclusion.ERROR:
      return new ArcjetErrorDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: new ArcjetErrorReason(decision.reason),
        results,
      });
    case Conclusion.UNSPECIFIED:
      return new ArcjetErrorDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: new ArcjetErrorReason("Invalid Conclusion"),
        results,
      });
    default:
      const _exhaustive: never = decision.conclusion;
      return new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason("Missing Conclusion"),
        results: [],
      });
  }
}

function isRateLimitRule<Props extends {}>(
  rule: ArcjetRule<Props>,
): rule is ArcjetRateLimitRule<Props> {
  return rule.type === "RATE_LIMIT";
}

function isTokenBucketRule<Props extends {}>(
  rule: ArcjetRule<Props>,
): rule is ArcjetTokenBucketRateLimitRule<Props> {
  return isRateLimitRule(rule) && rule.algorithm === "TOKEN_BUCKET";
}
function isFixedWindowRule<Props extends {}>(
  rule: ArcjetRule<Props>,
): rule is ArcjetFixedWindowRateLimitRule<Props> {
  return isRateLimitRule(rule) && rule.algorithm === "FIXED_WINDOW";
}
function isSlidingWindowRule<Props extends {}>(
  rule: ArcjetRule<Props>,
): rule is ArcjetSlidingWindowRateLimitRule<Props> {
  return isRateLimitRule(rule) && rule.algorithm === "SLIDING_WINDOW";
}

function isBotRule<Props extends {}>(
  rule: ArcjetRule<Props>,
): rule is ArcjetBotRule<Props> {
  return rule.type === "BOT";
}

function isEmailRule<Props extends { email: string }>(
  rule: ArcjetRule<Props>,
): rule is ArcjetEmailRule<Props> {
  return rule.type === "EMAIL";
}

export function ArcjetRuleToProtocol<Props extends { [key: string]: unknown }>(
  rule: ArcjetRule<Props>,
): Rule {
  if (isTokenBucketRule(rule)) {
    return new Rule({
      rule: {
        case: "rateLimit",
        value: {
          mode: ArcjetModeToProtocol(rule.mode),
          match: rule.match,
          characteristics: rule.characteristics,
          algorithm: RateLimitAlgorithm.TOKEN_BUCKET,
          refillRate: rule.refillRate,
          interval: rule.interval,
          capacity: rule.capacity,
        },
      },
    });
  }

  if (isFixedWindowRule(rule)) {
    return new Rule({
      rule: {
        case: "rateLimit",
        value: {
          mode: ArcjetModeToProtocol(rule.mode),
          match: rule.match,
          characteristics: rule.characteristics,
          algorithm: RateLimitAlgorithm.FIXED_WINDOW,
          max: rule.max,
          windowInSeconds: rule.window,
        },
      },
    });
  }

  if (isSlidingWindowRule(rule)) {
    return new Rule({
      rule: {
        case: "rateLimit",
        value: {
          mode: ArcjetModeToProtocol(rule.mode),
          match: rule.match,
          characteristics: rule.characteristics,
          algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
          max: rule.max,
          interval: rule.interval,
        },
      },
    });
  }

  if (isEmailRule(rule)) {
    const block = Array.isArray(rule.block)
      ? rule.block.map(ArcjetEmailTypeToProtocol)
      : [];
    return new Rule({
      rule: {
        case: "email",
        value: {
          mode: ArcjetModeToProtocol(rule.mode),
          block,
          requireTopLevelDomain: rule.requireTopLevelDomain,
          allowDomainLiteral: rule.allowDomainLiteral,
        },
      },
    });
  }

  if (isBotRule(rule)) {
    const block = Array.isArray(rule.block)
      ? rule.block.map(ArcjetBotTypeToProtocol)
      : [];
    const add = Array.isArray(rule.add)
      ? rule.add.map(([key, botType]) => [
          key,
          ArcjetBotTypeToProtocol(botType),
        ])
      : [];
    return new Rule({
      rule: {
        case: "bots",
        value: {
          mode: ArcjetModeToProtocol(rule.mode),
          block,
          patterns: {
            add: Object.fromEntries(add),
            remove: rule.remove,
          },
        },
      },
    });
  }

  return new Rule();
}
