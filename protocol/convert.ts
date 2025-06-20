import { Timestamp } from "@bufbuild/protobuf";
import type {
  ArcjetRule,
  ArcjetRateLimitRule,
  ArcjetBotRule,
  ArcjetConclusion,
  ArcjetEmailRule,
  ArcjetEmailType,
  ArcjetMode,
  ArcjetRuleState,
  ArcjetStack,
  ArcjetTokenBucketRateLimitRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetSlidingWindowRateLimitRule,
  ArcjetShieldRule,
  ArcjetSensitiveInfoRule,
} from "./index.js";
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
  ArcjetDecision,
  ArcjetReason,
  ArcjetIpDetails,
  ArcjetSensitiveInfoReason,
} from "./index.js";
import type { IpDetails } from "./proto/decide/v1alpha1/decide_pb.js";
import {
  BotV2Reason,
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
  SensitiveInfoReason,
  ShieldReason,
} from "./proto/decide/v1alpha1/decide_pb.js";

export function ArcjetModeToProtocol(mode: ArcjetMode) {
  switch (mode) {
    case "LIVE":
      return Mode.LIVE;
    case "DRY_RUN":
      return Mode.DRY_RUN;
    default: {
      const _exhaustive: never = mode;
      return Mode.UNSPECIFIED;
    }
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
    default: {
      const _exhaustive: never = emailType;
      return EmailType.UNSPECIFIED;
    }
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
    default: {
      const _exhaustive: never = emailType;
      throw new Error("Invalid EmailType");
    }
  }
}

export function ArcjetStackToProtocol(stack: ArcjetStack): SDKStack {
  switch (stack) {
    case "NODEJS":
      return SDKStack.SDK_STACK_NODEJS;
    case "NEXTJS":
      return SDKStack.SDK_STACK_NEXTJS;
    case "BUN":
      return SDKStack.SDK_STACK_BUN;
    case "SVELTEKIT":
      return SDKStack.SDK_STACK_SVELTEKIT;
    case "DENO":
      return SDKStack.SDK_STACK_DENO;
    case "NESTJS":
      return SDKStack.SDK_STACK_NESTJS;
    case "REMIX":
      return SDKStack.SDK_STACK_REMIX;
    case "ASTRO":
      return SDKStack.SDK_STACK_ASTRO;
    default: {
      const _exhaustive: never = stack;
      return SDKStack.SDK_STACK_UNSPECIFIED;
    }
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
    default: {
      const _exhaustive: never = stack;
      return RuleState.UNSPECIFIED;
    }
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
    default: {
      const _exhaustive: never = ruleState;
      throw new Error("Invalid RuleState");
    }
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
    default: {
      const _exhaustive: never = conclusion;
      return Conclusion.UNSPECIFIED;
    }
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
    default: {
      const _exhaustive: never = conclusion;
      throw new Error("Invalid Conclusion");
    }
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
    case "botV2": {
      const reason = proto.reason.value;
      return new ArcjetBotReason({
        allowed: reason.allowed,
        denied: reason.denied,
        verified: reason.verified,
        spoofed: reason.spoofed,
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
    case "sensitiveInfo": {
      const reason = proto.reason.value;
      return new ArcjetSensitiveInfoReason({
        allowed: reason.allowed,
        denied: reason.denied,
      });
    }
    case "bot": {
      return new ArcjetErrorReason("bot detection v1 is deprecated");
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
        case: "botV2",
        value: new BotV2Reason({
          allowed: reason.allowed,
          denied: reason.denied,
          verified: reason.verified,
          spoofed: reason.spoofed,
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

  if (reason.isSensitiveInfo()) {
    return new Reason({
      reason: {
        case: "sensitiveInfo",
        value: new SensitiveInfoReason({
          allowed: reason.allowed,
          denied: reason.denied,
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
    fingerprint: ruleResult.fingerprint,
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
    ruleId: proto.ruleId,
    fingerprint: proto.fingerprint,
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

export function ArcjetIpDetailsFromProtocol(
  ipDetails?: IpDetails,
): ArcjetIpDetails {
  if (!ipDetails) {
    return new ArcjetIpDetails();
  }
  // TODO(@wooorm-arcjet): uncovered.

  // A default value from the Decide service means we don't have data for the
  // field so we translate to `undefined`. Some fields have interconnected logic
  // that determines if the default value can be provided to users.
  return new ArcjetIpDetails({
    // If we have a non-0 latitude, or a 0 latitude with a non-0 accuracy radius
    // then we have a latitude from the Decide service
    latitude:
      ipDetails.latitude || ipDetails.accuracyRadius
        ? ipDetails.latitude
        : undefined,
    // If we have a non-0 longitude, or a 0 longitude with a non-0 accuracy
    // radius then we have a longitude from the Decide service
    longitude:
      ipDetails.longitude || ipDetails.accuracyRadius
        ? ipDetails.longitude
        : undefined,
    // If we have a non-0 latitude/longitude/accuracyRadius, we assume that the
    // accuracyRadius value was set
    accuracyRadius:
      ipDetails.longitude || ipDetails.latitude || ipDetails.accuracyRadius
        ? ipDetails.accuracyRadius
        : undefined,
    timezone: ipDetails.timezone !== "" ? ipDetails.timezone : undefined,
    postalCode: ipDetails.postalCode !== "" ? ipDetails.postalCode : undefined,
    city: ipDetails.city !== "" ? ipDetails.city : undefined,
    region: ipDetails.region !== "" ? ipDetails.region : undefined,
    country: ipDetails.country !== "" ? ipDetails.country : undefined,
    countryName:
      ipDetails.countryName !== "" ? ipDetails.countryName : undefined,
    continent: ipDetails.continent !== "" ? ipDetails.continent : undefined,
    continentName:
      ipDetails.continentName !== "" ? ipDetails.continentName : undefined,
    asn: ipDetails.asn !== "" ? ipDetails.asn : undefined,
    asnName: ipDetails.asnName !== "" ? ipDetails.asnName : undefined,
    asnDomain: ipDetails.asnDomain !== "" ? ipDetails.asnDomain : undefined,
    asnType: ipDetails.asnType !== "" ? ipDetails.asnType : undefined,
    asnCountry: ipDetails.asnCountry !== "" ? ipDetails.asnCountry : undefined,
    service: ipDetails.service !== "" ? ipDetails.service : undefined,
    isHosting: ipDetails.isHosting,
    isVpn: ipDetails.isVpn,
    isProxy: ipDetails.isProxy,
    isTor: ipDetails.isTor,
    isRelay: ipDetails.isRelay,
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
      ip: new ArcjetIpDetails(),
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
        ip: ArcjetIpDetailsFromProtocol(decision.ipDetails),
      });
    case Conclusion.DENY:
      return new ArcjetDenyDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: ArcjetReasonFromProtocol(decision.reason),
        results,
        ip: ArcjetIpDetailsFromProtocol(decision.ipDetails),
      });
    case Conclusion.CHALLENGE:
      return new ArcjetChallengeDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: ArcjetReasonFromProtocol(decision.reason),
        results,
        ip: ArcjetIpDetailsFromProtocol(decision.ipDetails),
      });
    case Conclusion.ERROR:
      return new ArcjetErrorDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: new ArcjetErrorReason(decision.reason),
        results,
        ip: ArcjetIpDetailsFromProtocol(decision.ipDetails),
      });
    case Conclusion.UNSPECIFIED:
      return new ArcjetErrorDecision({
        id: decision.id,
        ttl: decision.ttl,
        reason: new ArcjetErrorReason("Invalid Conclusion"),
        results,
        ip: ArcjetIpDetailsFromProtocol(decision.ipDetails),
      });
    default: {
      const _exhaustive: never = decision.conclusion;
      return new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason("Missing Conclusion"),
        results: [],
        ip: ArcjetIpDetailsFromProtocol(decision.ipDetails),
      });
    }
  }
}

interface RuleWithType {
  type: string;
}

function isRateLimitRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetRateLimitRule<Props> {
  return rule.type === "RATE_LIMIT";
}

function isTokenBucketRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetTokenBucketRateLimitRule<Props> {
  return isRateLimitRule(rule) && rule.algorithm === "TOKEN_BUCKET";
}
function isFixedWindowRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetFixedWindowRateLimitRule<Props> {
  return isRateLimitRule(rule) && rule.algorithm === "FIXED_WINDOW";
}
function isSlidingWindowRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetSlidingWindowRateLimitRule<Props> {
  return isRateLimitRule(rule) && rule.algorithm === "SLIDING_WINDOW";
}

function isBotRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetBotRule<Props> {
  return rule.type === "BOT";
}

function isEmailRule<Props extends { email: string }>(
  rule: RuleWithType,
): rule is ArcjetEmailRule<Props> {
  return rule.type === "EMAIL";
}

function isShieldRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetShieldRule<Props> {
  return rule.type === "SHIELD";
}

function isSensitiveInfoRule<Props extends {}>(
  rule: RuleWithType,
): rule is ArcjetSensitiveInfoRule<Props> {
  return rule.type === "SENSITIVE_INFO";
}

export function ArcjetRuleToProtocol<Props extends { [key: string]: unknown }>(
  rule: ArcjetRule<Props>,
): Rule {
  if (isTokenBucketRule(rule)) {
    return new Rule({
      rule: {
        case: "rateLimit",
        value: {
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
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
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
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
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
          characteristics: rule.characteristics,
          algorithm: RateLimitAlgorithm.SLIDING_WINDOW,
          max: rule.max,
          interval: rule.interval,
        },
      },
    });
  }

  if (isEmailRule(rule)) {
    const allow = Array.isArray(rule.allow)
      ? rule.allow.map(ArcjetEmailTypeToProtocol)
      : [];
    const deny = Array.isArray(rule.deny)
      ? rule.deny.map(ArcjetEmailTypeToProtocol)
      : [];
    return new Rule({
      rule: {
        case: "email",
        value: {
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
          allow,
          deny,
          requireTopLevelDomain: rule.requireTopLevelDomain,
          allowDomainLiteral: rule.allowDomainLiteral,
        },
      },
    });
  }

  if (isBotRule(rule)) {
    const allow = Array.isArray(rule.allow) ? rule.allow : [];
    const deny = Array.isArray(rule.deny) ? rule.deny : [];
    return new Rule({
      rule: {
        case: "botV2",
        value: {
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
          allow,
          deny,
        },
      },
    });
  }

  if (isShieldRule(rule)) {
    return new Rule({
      rule: {
        case: "shield",
        value: {
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
          autoAdded: false,
        },
      },
    });
  }

  if (isSensitiveInfoRule(rule)) {
    return new Rule({
      rule: {
        case: "sensitiveInfo",
        value: {
          version: rule.version,
          mode: ArcjetModeToProtocol(rule.mode),
          allow: rule.allow,
          deny: rule.deny,
        },
      },
    });
  }

  return new Rule();
}
