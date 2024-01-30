import { typeid } from "typeid-js";
import { Reason } from "./gen/es/decide/v1alpha1/decide_pb.js";
import type { Logger } from "@arcjet/logger";

type ArcjetEnum<T extends string> = { readonly [Key in T]: T };

export type ArcjetMode = "LIVE" | "DRY_RUN";
export const ArcjetMode: ArcjetEnum<ArcjetMode> = Object.freeze({
  LIVE: "LIVE",
  DRY_RUN: "DRY_RUN",
});

export type ArcjetBotType =
  | "NOT_ANALYZED"
  | "AUTOMATED"
  | "LIKELY_AUTOMATED"
  | "LIKELY_NOT_A_BOT"
  | "VERIFIED_BOT";
export const ArcjetBotType: ArcjetEnum<ArcjetBotType> = Object.freeze({
  NOT_ANALYZED: "NOT_ANALYZED",
  AUTOMATED: "AUTOMATED",
  LIKELY_AUTOMATED: "LIKELY_AUTOMATED",
  LIKELY_NOT_A_BOT: "LIKELY_NOT_A_BOT",
  VERIFIED_BOT: "VERIFIED_BOT",
});

export type ArcjetEmailType =
  | "DISPOSABLE"
  | "FREE"
  | "NO_MX_RECORDS"
  | "NO_GRAVATAR"
  | "INVALID";
export const ArcjetEmailType: ArcjetEnum<ArcjetEmailType> = {
  DISPOSABLE: "DISPOSABLE",
  FREE: "FREE",
  NO_MX_RECORDS: "NO_MX_RECORDS",
  NO_GRAVATAR: "NO_GRAVATAR",
  INVALID: "INVALID",
};

export type ArcjetStack = "NODEJS" | "NEXTJS";
export const ArcjetStack: ArcjetEnum<ArcjetStack> = {
  NODEJS: "NODEJS",
  NEXTJS: "NEXTJS",
};

export type ArcjetRuleState = "RUN" | "NOT_RUN" | "CACHED" | "DRY_RUN";
export const ArcjetRuleState: ArcjetEnum<ArcjetRuleState> = Object.freeze({
  RUN: "RUN",
  NOT_RUN: "NOT_RUN",
  CACHED: "CACHED",
  DRY_RUN: "DRY_RUN",
});

export type ArcjetConclusion = "ALLOW" | "DENY" | "CHALLENGE" | "ERROR";
export const ArcjetConclusion: ArcjetEnum<ArcjetConclusion> = Object.freeze({
  ALLOW: "ALLOW",
  DENY: "DENY",
  CHALLENGE: "CHALLENGE",
  ERROR: "ERROR",
});

export type ArcjetRuleType = "LOCAL" | "REMOTE";
export const ArcjetRuleType: ArcjetEnum<ArcjetRuleType> = Object.freeze({
  LOCAL: "LOCAL",
  REMOTE: "REMOTE",
});

export class ArcjetReason {
  type?: "RATE_LIMIT" | "BOT" | "EDGE_RULE" | "SUSPICIOUS" | "EMAIL" | "ERROR";

  isRateLimit(): this is ArcjetRateLimitReason {
    return this.type === "RATE_LIMIT";
  }

  isBot(): this is ArcjetBotReason {
    return this.type === "BOT";
  }

  isEdgeRule(): this is ArcjetEdgeRuleReason {
    return this.type === "EDGE_RULE";
  }

  isSuspicious(): this is ArcjetSuspiciousReason {
    return this.type === "SUSPICIOUS";
  }

  isEmail(): this is ArcjetEmailReason {
    return this.type === "EMAIL";
  }

  isError(): this is ArcjetErrorReason {
    return this.type === "ERROR";
  }
}

export class ArcjetRateLimitReason extends ArcjetReason {
  type: "RATE_LIMIT" = "RATE_LIMIT";

  max: number;
  count: number;
  remaining: number;
  resetTime?: Date;

  constructor(init: {
    max: number;
    count: number;
    remaining: number;
    resetTime?: Date;
  }) {
    super();

    this.max = init.max;
    this.count = init.count;
    this.remaining = init.remaining;
    this.resetTime = init.resetTime;
  }
}

export class ArcjetBotReason extends ArcjetReason {
  type: "BOT" = "BOT";

  botType: ArcjetBotType;
  botScore: number;
  userAgentMatch: boolean;
  ipHosting: boolean;
  ipVpn: boolean;
  ipProxy: boolean;
  ipTor: boolean;
  ipRelay: boolean;

  constructor(init: {
    botType: ArcjetBotType;
    botScore?: number;
    userAgentMatch?: boolean;
    ipHosting?: boolean;
    ipVpn?: boolean;
    ipProxy?: boolean;
    ipTor?: boolean;
    ipRelay?: boolean;
  }) {
    super();

    this.botType = init.botType;
    this.botScore = init.botScore ?? 0;
    this.userAgentMatch = init.userAgentMatch ?? false;
    this.ipHosting = init.ipHosting ?? false;
    this.ipVpn = init.ipVpn ?? false;
    this.ipProxy = init.ipProxy ?? false;
    this.ipTor = init.ipTor ?? false;
    this.ipRelay = init.ipRelay ?? false;
  }
}

export class ArcjetEdgeRuleReason extends ArcjetReason {
  type: "EDGE_RULE" = "EDGE_RULE";
}

export class ArcjetSuspiciousReason extends ArcjetReason {
  type: "SUSPICIOUS" = "SUSPICIOUS";

  shieldTriggered: boolean;

  constructor(init: { shieldTriggered?: boolean }) {
    super();

    this.shieldTriggered = init.shieldTriggered ?? false;
  }
}

export class ArcjetEmailReason extends ArcjetReason {
  type: "EMAIL" = "EMAIL";

  emailTypes: ArcjetEmailType[];

  constructor(init: { emailTypes?: ArcjetEmailType[] }) {
    super();
    if (typeof init === "undefined") {
      this.emailTypes = [];
    } else {
      this.emailTypes = init.emailTypes ?? [];
    }
  }
}

export class ArcjetErrorReason extends ArcjetReason {
  type: "ERROR" = "ERROR";

  message: string;

  constructor(error: unknown) {
    super();

    // TODO: Get rid of instanceof check
    if (error instanceof Reason) {
      if (error.reason.case === "error") {
        this.message = error.reason.value.message;
        return;
      } else {
        this.message = "Missing error reason";
      }
    }

    // TODO: Get rid of instanceof check
    if (error instanceof Error) {
      this.message = error.message;
      return;
    }

    if (typeof error === "string") {
      this.message = error;
      return;
    }

    this.message = "Unknown error occurred";
  }
}

export class ArcjetRuleResult {
  ruleId: string;
  /**
   * The duration in milliseconds this result should be considered valid, also
   * known as time-to-live.
   */
  ttl: number;
  state: ArcjetRuleState;
  conclusion: ArcjetConclusion;
  reason: ArcjetReason;

  constructor(init: {
    ttl: number;
    state: ArcjetRuleState;
    conclusion: ArcjetConclusion;
    reason: ArcjetReason;
  }) {
    // TODO(#230): Generated, stable IDs for Rules
    this.ruleId = "";

    this.ttl = init.ttl;
    this.state = init.state;
    this.conclusion = init.conclusion;
    this.reason = init.reason;
  }

  isDenied() {
    return this.conclusion === "DENY";
  }
}

/**
 * Represents a decision returned by the Arcjet SDK.
 *
 * @property `id` - The unique ID of the decision. This can be used to look up
 * the decision in the Arcjet dashboard.
 * @property `conclusion` - Arcjet's conclusion about the request. This will be
 * one of `"ALLOW"`, `"DENY"`, `"CHALLENGE"`, or `"ERROR"`.
 * @property `reason` - A structured data type about the reason for the
 * decision. One of: {@link ArcjetRateLimitReason}, {@link ArcjetEdgeRuleReason},
 * {@link ArcjetBotReason}, {@link ArcjetSuspiciousReason},
 * {@link ArcjetEmailReason}, or {@link ArcjetErrorReason}.
 * @property `ttl` - The duration in milliseconds this decision should be
 * considered valid, also known as time-to-live.
 * @property `results` - Each separate {@link ArcjetRuleResult} can be found here
 * or by logging into the Arcjet dashboard and searching for the decision `id`.
 */
export abstract class ArcjetDecision {
  id: string;
  /**
   * The duration in milliseconds this decision should be considered valid, also
   * known as time-to-live.
   */
  ttl: number;
  results: ArcjetRuleResult[];

  abstract conclusion: ArcjetConclusion;
  abstract reason: ArcjetReason;

  constructor(init: { id?: string; results: ArcjetRuleResult[]; ttl: number }) {
    if (typeof init.id === "string") {
      this.id = init.id;
    } else {
      this.id = typeid("lreq").toString();
    }

    this.results = init.results;
    this.ttl = init.ttl;
  }

  isAllowed(): this is ArcjetAllowDecision | ArcjetErrorDecision {
    return this.conclusion === "ALLOW" || this.conclusion === "ERROR";
  }

  isDenied(): this is ArcjetDenyDecision {
    return this.conclusion === "DENY";
  }

  isChallenged(): this is ArcjetChallengeDecision {
    return this.conclusion === "CHALLENGE";
  }

  isErrored(): this is ArcjetErrorDecision {
    return this.conclusion === "ERROR";
  }
}

export class ArcjetAllowDecision extends ArcjetDecision {
  conclusion: "ALLOW" = "ALLOW";
  reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetReason;
  }) {
    super(init);

    this.reason = init.reason;
  }
}

export class ArcjetDenyDecision extends ArcjetDecision {
  conclusion: "DENY" = "DENY";
  reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetReason;
  }) {
    super(init);

    this.reason = init.reason;
  }
}
export class ArcjetChallengeDecision extends ArcjetDecision {
  conclusion: "CHALLENGE" = "CHALLENGE";
  reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetReason;
  }) {
    super(init);

    this.reason = init.reason;
  }
}

export class ArcjetErrorDecision extends ArcjetDecision {
  conclusion: "ERROR" = "ERROR";
  reason: ArcjetErrorReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetErrorReason;
  }) {
    super(init);

    this.reason = init.reason;
  }
}

export interface ArcjetRequestDetails {
  [key: string]: unknown;
  ip: string;
  method: string;
  protocol: string;
  host: string;
  path: string;
  // TODO(#215): Allow `Record<string, string>` and `Record<string, string[]>`?
  headers: Headers;
  extra: Record<string, string>;
}

export type ArcjetRule<Props extends {} = {}> = {
  type: "RATE_LIMIT" | "BOT" | "EMAIL" | string;
  mode: ArcjetMode;
  priority: number;
};

export interface ArcjetLocalRule<Props extends { [key: string]: unknown } = {}>
  extends ArcjetRule<Props> {
  validate(
    context: ArcjetContext,
    details: Partial<ArcjetRequestDetails & Props>,
  ): asserts details is ArcjetRequestDetails & Props;
  protect(
    context: ArcjetContext,
    details: ArcjetRequestDetails & Props,
  ): Promise<ArcjetRuleResult>;
}

export interface ArcjetRateLimitRule<Props extends {}>
  extends ArcjetRule<Props> {
  type: "RATE_LIMIT";

  match?: string;
  characteristics?: string[];
  window: string;
  max: number;
  timeout: string;
}

export interface ArcjetEmailRule<Props extends { email: string }>
  extends ArcjetLocalRule<Props> {
  type: "EMAIL";

  block: ArcjetEmailType[];
  requireTopLevelDomain: boolean;
  allowDomainLiteral: boolean;
}

export interface ArcjetBotRule<Props extends {}>
  extends ArcjetLocalRule<Props> {
  type: "BOT";

  block: ArcjetBotType[];
  add: [string, ArcjetBotType][];
  remove: string[];
}

export type ArcjetContext = {
  key: string;
  fingerprint: string;
  log: Logger;
};
