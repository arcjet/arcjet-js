import { typeid } from "typeid-js";
import { Reason } from "./proto/decide/v1alpha1/decide_pb.js";

// Re-export the Well Known Bots from the generated file
export type * from "./well-known-bots.js";

// Re-export the Bot categories from the generated file
export { categories as botCategories } from "./well-known-bots.js";

type RequiredProps<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

type ArcjetEnum<T extends string> = { readonly [Key in T]: T };

export type ArcjetMode = "LIVE" | "DRY_RUN";
export const ArcjetMode: ArcjetEnum<ArcjetMode> = Object.freeze({
  LIVE: "LIVE",
  DRY_RUN: "DRY_RUN",
});

export type ArcjetRateLimitAlgorithm =
  | "TOKEN_BUCKET"
  | "FIXED_WINDOW"
  | "SLIDING_WINDOW";
export const ArcjetRateLimitAlgorithm: ArcjetEnum<ArcjetRateLimitAlgorithm> =
  Object.freeze({
    TOKEN_BUCKET: "TOKEN_BUCKET",
    FIXED_WINDOW: "FIXED_WINDOW",
    SLIDING_WINDOW: "SLIDING_WINDOW",
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

export type ArcjetIdentifiedEntity = {
  start: number;
  end: number;
  identifiedType: string;
};

export type ArcjetStack =
  | "NODEJS"
  | "NEXTJS"
  | "BUN"
  | "SVELTEKIT"
  | "DENO"
  | "NESTJS";
export const ArcjetStack: ArcjetEnum<ArcjetStack> = {
  NODEJS: "NODEJS",
  NEXTJS: "NEXTJS",
  BUN: "BUN",
  SVELTEKIT: "SVELTEKIT",
  DENO: "DENO",
  NESTJS: "NESTJS",
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

export type ArcjetSensitiveInfoType =
  | "EMAIL"
  | "PHONE_NUMBER"
  | "IP_ADDRESS"
  | "CREDIT_CARD_NUMBER";
export const ArcjetSensitiveInfoType: ArcjetEnum<ArcjetSensitiveInfoType> = {
  EMAIL: "EMAIL",
  PHONE_NUMBER: "PHONE_NUMBER",
  IP_ADDRESS: "IP_ADDRESS",
  CREDIT_CARD_NUMBER: "CREDIT_CARD_NUMBER",
};

export type ArcjetRuleType = "LOCAL" | "REMOTE";
export const ArcjetRuleType: ArcjetEnum<ArcjetRuleType> = Object.freeze({
  LOCAL: "LOCAL",
  REMOTE: "REMOTE",
});

export class ArcjetReason {
  type?:
    | "RATE_LIMIT"
    | "BOT"
    | "EDGE_RULE"
    | "SHIELD"
    | "EMAIL"
    | "ERROR"
    | "SENSITIVE_INFO";

  isSensitiveInfo(): this is ArcjetSensitiveInfoReason {
    return this.type === "SENSITIVE_INFO";
  }

  isRateLimit(): this is ArcjetRateLimitReason {
    return this.type === "RATE_LIMIT";
  }

  isBot(): this is ArcjetBotReason {
    return this.type === "BOT";
  }

  isEdgeRule(): this is ArcjetEdgeRuleReason {
    return this.type === "EDGE_RULE";
  }

  isShield(): this is ArcjetShieldReason {
    return this.type === "SHIELD";
  }

  isEmail(): this is ArcjetEmailReason {
    return this.type === "EMAIL";
  }

  isError(): this is ArcjetErrorReason {
    return this.type === "ERROR";
  }
}

export class ArcjetSensitiveInfoReason extends ArcjetReason {
  type = "SENSITIVE_INFO" as const;

  denied: ArcjetIdentifiedEntity[];
  allowed: ArcjetIdentifiedEntity[];

  constructor(init: {
    denied: ArcjetIdentifiedEntity[];
    allowed: ArcjetIdentifiedEntity[];
  }) {
    super();

    this.denied = init.denied;
    this.allowed = init.allowed;
  }
}

export class ArcjetRateLimitReason extends ArcjetReason {
  type = "RATE_LIMIT" as const;

  max: number;
  remaining: number;
  reset: number;
  window: number;
  resetTime?: Date;

  constructor(init: {
    max: number;
    remaining: number;
    reset: number;
    window: number;
    resetTime?: Date;
  }) {
    super();

    this.max = init.max;
    this.remaining = init.remaining;
    this.reset = init.reset;
    this.window = init.window;
    this.resetTime = init.resetTime;
  }
}

export class ArcjetBotReason extends ArcjetReason {
  type = "BOT" as const;

  allowed: Array<string>;
  denied: Array<string>;

  constructor(init: { allowed: Array<string>; denied: Array<string> }) {
    super();

    this.allowed = init.allowed;
    this.denied = init.denied;
  }
}

export class ArcjetEdgeRuleReason extends ArcjetReason {
  type = "EDGE_RULE" as const;
}

export class ArcjetShieldReason extends ArcjetReason {
  type = "SHIELD" as const;

  shieldTriggered: boolean;

  constructor(init: { shieldTriggered?: boolean }) {
    super();

    this.shieldTriggered = init.shieldTriggered ?? false;
  }
}

export class ArcjetEmailReason extends ArcjetReason {
  type = "EMAIL" as const;

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
  type = "ERROR" as const;

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
   * The duration in seconds this result should be considered valid, also known
   * as time-to-live.
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

export class ArcjetIpDetails {
  /**
   * The estimated latitude of the IP address within the `accuracyRadius` margin
   * of error.
   */
  latitude?: number;
  /**
   * The estimated longitude of the IP address - see accuracy_radius for the
   * margin of error.
   */
  longitude?: number;
  /**
   * The accuracy radius of the IP address location in kilometers.
   */
  accuracyRadius?: number;
  /**
   * The timezone of the IP address.
   */
  timezone?: string;
  /**
   * The postal code of the IP address.
   */
  postalCode?: string;
  /**
   * The city the IP address is located in.
   */
  city?: string;
  /**
   * The region the IP address is located in.
   */
  region?: string;
  /**
   * The country code the IP address is located in.
   */
  country?: string;
  /**
   * The country name the IP address is located in.
   */
  countryName?: string;
  /**
   * The continent code the IP address is located in.
   */
  continent?: string;
  /**
   * The continent name the IP address is located in.
   */
  continentName?: string;
  /**
   * The AS number the IP address belongs to.
   */
  asn?: string;
  /**
   * The AS name the IP address belongs to.
   */
  asnName?: string;
  /**
   * The AS domain the IP address belongs to.
   */
  asnDomain?: string;
  /**
   * The ASN type: ISP, hosting, business, or education
   */
  asnType?: string;
  /**
   * The ASN country code the IP address belongs to.
   */
  asnCountry?: string;
  /**
   * The name of the service the IP address belongs to.
   */
  service?: string;

  constructor(
    init: {
      latitude?: number;
      longitude?: number;
      accuracyRadius?: number;
      timezone?: string;
      postalCode?: string;
      city?: string;
      region?: string;
      country?: string;
      countryName?: string;
      continent?: string;
      continentName?: string;
      asn?: string;
      asnName?: string;
      asnDomain?: string;
      asnType?: string;
      asnCountry?: string;
      service?: string;
      isHosting?: boolean;
      isVpn?: boolean;
      isProxy?: boolean;
      isTor?: boolean;
      isRelay?: boolean;
    } = {},
  ) {
    this.latitude = init.latitude;
    this.longitude = init.longitude;
    this.accuracyRadius = init.accuracyRadius;
    this.timezone = init.timezone;
    this.postalCode = init.postalCode;
    this.city = init.city;
    this.region = init.region;
    this.country = init.country;
    this.countryName = init.countryName;
    this.continent = init.continent;
    this.continentName = init.continentName;
    this.asn = init.asn;
    this.asnName = init.asnName;
    this.asnDomain = init.asnDomain;
    this.asnType = init.asnType;
    this.asnCountry = init.asnCountry;
    this.service = init.service;
    // TypeScript creates symbols on the class when using `private` or `#`
    // identifiers for tracking these properties. We don't want to end up with
    // the same issues as Next.js with private symbols so we use
    // `Object.defineProperties` here and then `@ts-expect-error` when we access
    // the values. This is mostly to improve the editor experience, as props
    // starting with `_` are sorted to the top of autocomplete.
    Object.defineProperties(this, {
      _isHosting: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: init.isHosting ?? false,
      },
      _isVpn: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: init.isVpn ?? false,
      },
      _isProxy: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: init.isProxy ?? false,
      },
      _isTor: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: init.isTor ?? false,
      },
      _isRelay: {
        configurable: false,
        enumerable: false,
        writable: false,
        value: init.isRelay ?? false,
      },
    });
  }

  hasLatitude(): this is RequiredProps<this, "latitude" | "accuracyRadius"> {
    return typeof this.latitude !== "undefined";
  }

  hasLongitude(): this is RequiredProps<this, "longitude" | "accuracyRadius"> {
    return typeof this.longitude !== "undefined";
  }

  hasAccuracyRadius(): this is RequiredProps<
    this,
    "latitude" | "longitude" | "accuracyRadius"
  > {
    return typeof this.accuracyRadius !== "undefined";
  }

  hasTimezone(): this is RequiredProps<this, "timezone"> {
    return typeof this.timezone !== "undefined";
  }

  hasPostalCode(): this is RequiredProps<this, "postalCode"> {
    return typeof this.postalCode !== "undefined";
  }

  // TODO: If we have city, what other data are we sure to have?
  hasCity(): this is RequiredProps<this, "city"> {
    return typeof this.city !== "undefined";
  }

  // TODO: If we have region, what other data are we sure to have?
  hasRegion(): this is RequiredProps<this, "region"> {
    return typeof this.region !== "undefined";
  }

  // If we have country, we should have country name
  // TODO: If we have country, should we also have continent?
  hasCountry(): this is RequiredProps<this, "country" | "countryName"> {
    return typeof this.country !== "undefined";
  }

  // If we have continent, we should have continent name
  hasContintent(): this is RequiredProps<this, "continent" | "continentName"> {
    return typeof this.continent !== "undefined";
  }

  // If we have ASN, we should have every piece of ASN information.
  hasASN(): this is RequiredProps<
    this,
    "asn" | "asnName" | "asnDomain" | "asnType" | "asnCountry"
  > {
    return typeof this.asn !== "undefined";
  }

  hasService(): this is RequiredProps<this, "service"> {
    return typeof this.service !== "undefined";
  }

  /**
   * @returns `true` if the IP address belongs to a hosting provider.
   */
  isHosting(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isHosting;
  }

  /**
   * @returns `true` if the IP address belongs to a VPN provider.
   */
  isVpn(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isVpn;
  }

  /**
   * @returns `true` if the IP address belongs to a proxy provider.
   */
  isProxy(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isProxy;
  }

  /**
   * @returns `true` if the IP address belongs to a Tor node.
   */
  isTor(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isTor;
  }

  /**
   * @returns `true` if the the IP address belongs to a relay service.
   */
  isRelay(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isRelay;
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
 * {@link ArcjetBotReason}, {@link ArcjetShieldReason},
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

  /**
   * Details about the IP address that informed the `conclusion`.
   */
  ip: ArcjetIpDetails;

  abstract conclusion: ArcjetConclusion;
  abstract reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    ip?: ArcjetIpDetails;
  }) {
    if (typeof init.id === "string") {
      this.id = init.id;
    } else {
      this.id = typeid("lreq").toString();
    }

    this.results = init.results;
    this.ttl = init.ttl;
    this.ip = init.ip ?? new ArcjetIpDetails();
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
  conclusion = "ALLOW" as const;
  reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetReason;
    ip?: ArcjetIpDetails;
  }) {
    super(init);

    this.reason = init.reason;
  }
}

export class ArcjetDenyDecision extends ArcjetDecision {
  conclusion = "DENY" as const;
  reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetReason;
    ip?: ArcjetIpDetails;
  }) {
    super(init);

    this.reason = init.reason;
  }
}
export class ArcjetChallengeDecision extends ArcjetDecision {
  conclusion = "CHALLENGE" as const;
  reason: ArcjetReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetReason;
    ip?: ArcjetIpDetails;
  }) {
    super(init);

    this.reason = init.reason;
  }
}

export class ArcjetErrorDecision extends ArcjetDecision {
  conclusion = "ERROR" as const;
  reason: ArcjetErrorReason;

  constructor(init: {
    id?: string;
    results: ArcjetRuleResult[];
    ttl: number;
    reason: ArcjetErrorReason;
    ip?: ArcjetIpDetails;
  }) {
    super(init);

    this.reason = init.reason;
  }
}

export interface ArcjetRequestDetails {
  ip: string;
  method: string;
  protocol: string;
  host: string;
  path: string;
  headers: Headers;
  cookies: string;
  query: string;
  extra: { [key: string]: string };
  // TODO: Consider moving email to `extra` map
  email?: string;
}

export type ArcjetRule<Props extends {} = {}> = {
  type: "RATE_LIMIT" | "BOT" | "EMAIL" | "SHIELD" | "SENSITIVE_INFO" | string;
  mode: ArcjetMode;
  priority: number;
};

// An ArcjetLocalRule provides additional `validate` and `protect` functions
// which are used to provide local protections before requesting protections
// from the Arcjet service.
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
  algorithm: ArcjetRateLimitAlgorithm;
  characteristics?: string[];
}

export interface ArcjetTokenBucketRateLimitRule<Props extends {}>
  extends ArcjetRateLimitRule<Props> {
  algorithm: "TOKEN_BUCKET";

  match?: string;
  refillRate: number;
  interval: number;
  capacity: number;
}

export interface ArcjetFixedWindowRateLimitRule<Props extends {}>
  extends ArcjetRateLimitRule<Props> {
  algorithm: "FIXED_WINDOW";

  match?: string;
  max: number;
  window: number;
}

export interface ArcjetSlidingWindowRateLimitRule<Props extends {}>
  extends ArcjetRateLimitRule<Props> {
  algorithm: "SLIDING_WINDOW";

  match?: string;
  max: number;
  interval: number;
}

export interface ArcjetEmailRule<Props extends { email: string }>
  extends ArcjetLocalRule<Props> {
  type: "EMAIL";

  block: ArcjetEmailType[];
  requireTopLevelDomain: boolean;
  allowDomainLiteral: boolean;
}

export interface ArcjetSensitiveInfoRule<Props extends {}>
  extends ArcjetLocalRule<Props> {
  type: "SENSITIVE_INFO";

  allow: string[];
  deny: string[];
}

export interface ArcjetBotRule<Props extends {}>
  extends ArcjetLocalRule<Props> {
  type: "BOT";

  allow: Array<string>;
  deny: Array<string>;
}

export interface ArcjetShieldRule<Props extends {}> extends ArcjetRule<Props> {
  type: "SHIELD";
}

export interface ArcjetLogger {
  // Latency logs will be emitted if `time` and `timeEnd` calls exist on the
  // logger interface, but they are optional since Pino doesn't have them.
  time?(label: string): void;
  timeEnd?(label: string): void;
  // Pino-compatible logging functions are required.
  debug(msg: string, ...args: unknown[]): void;
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
}

export type ArcjetContext = {
  [key: string]: unknown;
  key: string;
  fingerprint: string;
  runtime: string;
  log: ArcjetLogger;
  characteristics: string[];
  getBody: () => Promise<string | undefined>;
};
