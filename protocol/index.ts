import type { Cache } from "@arcjet/cache";
import { typeid } from "typeid-js";
import { Reason } from "./proto/decide/v1alpha1/decide_pb.js";

// Re-export the Well Known Bots from the generated file
export type * from "./well-known-bots.js";

// Re-export the Bot categories from the generated file
export { categories as botCategories } from "./well-known-bots.js";

type RequiredProps<T, K extends keyof T> = {
  [P in K]-?: Exclude<T[P], undefined>;
};

/**
 * Mode of a rule.
 */
export type ArcjetMode = "LIVE" | "DRY_RUN";

/**
 * Names of different rate limit algorithms.
 */
export type ArcjetRateLimitAlgorithm =
  | "TOKEN_BUCKET"
  | "FIXED_WINDOW"
  | "SLIDING_WINDOW";

/**
 * Kinds of email addresses.
 */
export type ArcjetEmailType =
  | "DISPOSABLE"
  | "FREE"
  | "NO_MX_RECORDS"
  | "NO_GRAVATAR"
  | "INVALID";

/**
 * Sensitive info identified by Arcjet.
 */
export type ArcjetIdentifiedEntity = {
  /**
   * Start index into value.
   */
  start: number;

  /**
   * End index into value.
   */
  end: number;

  /**
   * Kind of the identified entity.
   */
  identifiedType: string;
};

/**
 * Names of integrations supported by Arcjet.
 */
export type ArcjetStack =
  | "ASTRO"
  | "BUN"
  | "DENO"
  | "FASTIFY"
  | "NESTJS"
  | "NEXTJS"
  | "NODEJS"
  | "REACT_ROUTER"
  | "REMIX"
  | "SVELTEKIT";

/**
 * State of a rule after calling it.
 */
export type ArcjetRuleState = "RUN" | "NOT_RUN" | "CACHED" | "DRY_RUN";

/**
 * Conclusion of a rule after calling it.
 */
export type ArcjetConclusion = "ALLOW" | "DENY" | "CHALLENGE" | "ERROR";

/**
 * Kinds of sensitive info.
 */
export type ArcjetSensitiveInfoType =
  | "EMAIL"
  | "PHONE_NUMBER"
  | "IP_ADDRESS"
  | "CREDIT_CARD_NUMBER";

/**
 * Reason returned by a rule.
 */
export class ArcjetReason {
  /**
   * Kind.
   */
  type?:
    | "RATE_LIMIT"
    | "BOT"
    | "EDGE_RULE"
    | "SHIELD"
    | "EMAIL"
    | "ERROR"
    | "FILTER"
    | "SENSITIVE_INFO"
    | undefined;

  /**
   * Check if this reason is a sensitive info reason.
   *
   * @returns
   *   Whether this reason is a sensitive info reason.
   */
  isSensitiveInfo(): this is ArcjetSensitiveInfoReason {
    return this.type === "SENSITIVE_INFO";
  }

  /**
   * Check if this reason is a rate limit reason.
   *
   * @returns
   *   Whether this reason is a rate limit reason.
   */
  isRateLimit(): this is ArcjetRateLimitReason {
    return this.type === "RATE_LIMIT";
  }

  /**
   * Check if this reason is a bot reason.
   *
   * @returns
   *   Whether this reason is a bot reason.
   */
  isBot(): this is ArcjetBotReason {
    return this.type === "BOT";
  }

  /**
   * Check if this reason is an edge rule reason.
   *
   * @returns
   *   Whether this reason is an edge rule reason.
   */
  isEdgeRule(): this is ArcjetEdgeRuleReason {
    return this.type === "EDGE_RULE";
  }

  /**
   * Check if this reason is a shield reason.
   *
   * @returns
   *   Whether this reason is a shield reason.
   */
  isShield(): this is ArcjetShieldReason {
    return this.type === "SHIELD";
  }

  /**
   * Check if this reason is an email reason.
   *
   * @returns
   *   Whether this reason is an email reason.
   */
  isEmail(): this is ArcjetEmailReason {
    return this.type === "EMAIL";
  }

  /**
   * Check if this reason is an error reason.
   *
   * @returns
   *   Whether this reason is an error reason.
   */
  isError(): this is ArcjetErrorReason {
    return this.type === "ERROR";
  }

  /**
   * Check if this is a filter reason.
   *
   * @returns
   *   Whether this is a filter reason.
   */
  isFilter(): this is ArcjetFilterReason {
    return this.type === "FILTER";
  }
}

/**
 * Configuration for `ArcjetFilterReason`.
 */
interface ArcjetFilterReasonInit {
  /**
   * Expression that matched.
   */
  matchedExpressions: Array<string>;

  /**
   * Expression that could not be matched.
   */
  undeterminedExpressions: Array<string>;
}

/**
 * Filter reason.
 */
export class ArcjetFilterReason extends ArcjetReason {
  /**
   * Expressions that matched.
   */
  matchedExpressions;

  /**
   * Kind.
   */
  type = "FILTER" as const;

  /**
   * Expression that could not be matched.
   */
  undeterminedExpressions;

  /**
   * Create a filter reason.
   *
   * @param init
   *   Expression that matched.
   * @returns
   *   Filter reason.
   */
  constructor(init: ArcjetFilterReasonInit) {
    super();

    this.matchedExpressions = init.matchedExpressions;
    this.undeterminedExpressions = init.undeterminedExpressions;
  }
}

/**
 * Configuration for `ArcjetSensitiveInfoReason`.
 */
interface ArcjetSensitiveInfoReasonInit {
  /**
   * List of allowed entities.
   */
  allowed: ArcjetIdentifiedEntity[];

  /**
   * List of denied entities.
   */
  denied: ArcjetIdentifiedEntity[];
}

/**
 * Sensitive info reason.
 */
export class ArcjetSensitiveInfoReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "SENSITIVE_INFO" as const;

  /**
   * List of denied entities.
   */
  denied: ArcjetIdentifiedEntity[];

  /**
   * List of allowed entities.
   */
  allowed: ArcjetIdentifiedEntity[];

  /**
   * Create an `ArcjetSensitiveInfoReason`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Sensitive info reason.
   */
  constructor(init: ArcjetSensitiveInfoReasonInit) {
    super();

    this.denied = init.denied;
    this.allowed = init.allowed;
  }
}

/**
 * Configuration for `ArcjetRateLimitReason`.
 */
interface ArcjetRateLimitReasonInit {
  /**
   * Maximum number of allowed requests.
   */
  max: number;

  /**
   * Remaining number of requests.
   */
  remaining: number;

  /**
   * Time in seconds until reset.
   */
  reset: number;

  /**
   * Time in seconds until the window resets.
   */
  window: number;

  /**
   * Time when the rate limit resets.
   */
  resetTime?: Date | undefined;
}

/**
 * Rate limit reason.
 */
export class ArcjetRateLimitReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "RATE_LIMIT" as const;

  /**
   * Maximum number of allowed requests.
   */
  max: number;

  /**
   * Remaining number of requests.
   */
  remaining: number;

  /**
   * Time in seconds until reset.
   */
  reset: number;

  /**
   * Time in seconds until the window resets.
   */
  window: number;

  /**
   * Time when the rate limit resets.
   */
  resetTime?: Date | undefined;

  /**
   * Create an `ArcjetRateLimitReason`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Rate limit reason.
   */
  constructor(init: ArcjetRateLimitReasonInit) {
    super();

    this.max = init.max;
    this.remaining = init.remaining;
    this.reset = init.reset;
    this.window = init.window;
    this.resetTime = init.resetTime;
  }
}

/**
 * Configuration for `ArcjetBotReason`.
 */
interface ArcjetBotReasonInit {
  /**
   * List of allowed bot identifiers.
   */
  allowed: Array<string>;

  /**
   * List of denied bot identifiers.
   */
  denied: Array<string>;

  /**
   * Whether the bot is verified.
   */
  verified: boolean;

  /**
   * Whether the bot is spoofed.
   */
  spoofed: boolean;
}

/**
 * Bot reason.
 */
export class ArcjetBotReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "BOT" as const;

  /**
   * List of allowed bot identifiers.
   */
  allowed: Array<string>;

  /**
   * List of denied bot identifiers.
   */
  denied: Array<string>;

  /**
   * Whether the bot is verified.
   */
  verified: boolean;

  /**
   * Whether the bot is spoofed.
   */
  spoofed: boolean;

  /**
   * Create an `ArcjetBotReason`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Bot reason.
   */
  constructor(init: ArcjetBotReasonInit) {
    super();

    this.allowed = init.allowed;
    this.denied = init.denied;
    this.verified = init.verified;
    this.spoofed = init.spoofed;
  }

  /**
   * Check if the bot is verified.
   *
   * @returns
   *   Whether the bot is verified.
   */
  isVerified(): boolean {
    return this.verified;
  }

  /**
   * Check if the bot is spoofed.
   *
   * @returns
   *   Whether the bot is spoofed.
   */
  isSpoofed(): boolean {
    return this.spoofed;
  }
}

/**
 * Edge rule reason.
 *
 * @deprecated
 *   This reason is currently not used.
 */
export class ArcjetEdgeRuleReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "EDGE_RULE" as const;
}

/**
 * Configuration for `ArcjetShieldReason`.
 */
interface ArcjetShieldReasonInit {
  /**
   * Whether the shield was triggered.
   */
  shieldTriggered?: boolean | undefined;
}

/**
 * Shield reason.
 */
export class ArcjetShieldReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "SHIELD" as const;

  /**
   * Whether the shield was triggered.
   */
  shieldTriggered: boolean;

  /**
   * Create an `ArcjetShieldReason`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Shield reason.
   */
  constructor(init: ArcjetShieldReasonInit) {
    super();

    this.shieldTriggered = init.shieldTriggered ?? false;
  }
}

/**
 * Configuration for `ArcjetEmailReason`.
 */
interface ArcjetEmailReasonInit {
  /**
   * List of email types that are allowed.
   */
  emailTypes?: ArcjetEmailType[] | undefined;
}

/**
 * Email reason.
 */
export class ArcjetEmailReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "EMAIL" as const;

  /**
   * List of email types that are allowed.
   */
  emailTypes: ArcjetEmailType[];

  /**
   * Create an `ArcjetEmailReason`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Email reason.
   */
  constructor(init: ArcjetEmailReasonInit) {
    super();
    this.emailTypes = init.emailTypes ?? [];
  }
}

/**
 * Error reason.
 */
export class ArcjetErrorReason extends ArcjetReason {
  /**
   * Kind.
   */
  type = "ERROR" as const;

  /**
   * Error message.
   */
  message: string;

  /**
   * Create an `ArcjetErrorReason`.
   *
   * @param error
   *   Error that occurred.
   * @returns
   *   Error reason.
   */
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

/**
 * Configuration for `ArcjetRuleResult`.
 */
interface ArcjetRuleResultInit {
  /**
   * Stable, deterministic, and unique identifier of the rule that generated
   * this result.
   */
  ruleId: string;

  /**
   * Fingerprint calculated for this rule, which can be used to cache the
   * result for the amount of time specified by `ttl`.
   */
  fingerprint: string;

  /**
   * Duration in seconds this result should be considered valid, also known
   * as time-to-live.
   */
  ttl: number;

  /**
   * State of the rule.
   */
  state: ArcjetRuleState;

  /**
   * Conclusion of the rule.
   */
  conclusion: ArcjetConclusion;

  /**
   * Reason for the conclusion.
   */
  reason: ArcjetReason;
}

/**
 * Result of calling a rule.
 */
export class ArcjetRuleResult {
  /**
   * Stable, deterministic, and unique identifier of the rule that generated
   * this result.
   */
  ruleId: string;

  /**
   * Fingerprint calculated for this rule, which can be used to cache the
   * result for the amount of time specified by `ttl`.
   */
  fingerprint: string;

  /**
   * Duration in seconds this result should be considered valid, also known
   * as time-to-live.
   */
  ttl: number;

  /**
   * State of the rule.
   */
  state: ArcjetRuleState;

  /**
   * Conclusion of the rule.
   */
  conclusion: ArcjetConclusion;

  /**
   * Reason for the conclusion.
   */
  reason: ArcjetReason;

  /**
   * Create an `ArcjetRuleResult`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Rule result.
   */
  constructor(init: ArcjetRuleResultInit) {
    this.ruleId = init.ruleId;
    this.fingerprint = init.fingerprint;
    this.ttl = init.ttl;
    this.state = init.state;
    this.conclusion = init.conclusion;
    this.reason = init.reason;
  }

  /**
   * Check if the rule result is denied.
   *
   * @returns
   *   Whether the rule result is denied.
   */
  isDenied() {
    return this.conclusion === "DENY";
  }
}

/**
 * Configuration for `ArcjetIpDetails`.
 */
interface ArcjetIpDetailsInit {
  latitude?: number | undefined;
  longitude?: number | undefined;
  accuracyRadius?: number | undefined;
  timezone?: string | undefined;
  postalCode?: string | undefined;
  city?: string | undefined;
  region?: string | undefined;
  country?: string | undefined;
  countryName?: string | undefined;
  continent?: string | undefined;
  continentName?: string | undefined;
  asn?: string | undefined;
  asnName?: string | undefined;
  asnDomain?: string | undefined;
  asnType?: string | undefined;
  asnCountry?: string | undefined;
  service?: string | undefined;
  isHosting?: boolean | undefined;
  isVpn?: boolean | undefined;
  isProxy?: boolean | undefined;
  isTor?: boolean | undefined;
  isRelay?: boolean | undefined;
}

/**
 * Info about an IP address.
 */
export class ArcjetIpDetails {
  /**
   * Estimated latitude of the IP address within the `accuracyRadius` margin
   * of error.
   */
  latitude?: number | undefined;
  /**
   * Estimated longitude of the IP address - see accuracy_radius for the
   * margin of error.
   */
  longitude?: number | undefined;
  /**
   * Accuracy radius of the IP address location in kilometers.
   */
  accuracyRadius?: number | undefined;
  /**
   * Timezone of the IP address.
   */
  timezone?: string | undefined;
  /**
   * Postal code of the IP address.
   */
  postalCode?: string | undefined;
  /**
   * City the IP address is located in.
   */
  city?: string | undefined;
  /**
   * Region the IP address is located in.
   */
  region?: string | undefined;
  /**
   * Country code the IP address is located in.
   */
  country?: string | undefined;
  /**
   * Country name the IP address is located in.
   */
  countryName?: string | undefined;
  /**
   * Continent code the IP address is located in.
   */
  continent?: string | undefined;
  /**
   * Continent name the IP address is located in.
   */
  continentName?: string | undefined;
  /**
   * AS number the IP address belongs to.
   */
  asn?: string | undefined;
  /**
   * AS name the IP address belongs to.
   */
  asnName?: string | undefined;
  /**
   * ASN domain the IP address belongs to.
   */
  asnDomain?: string | undefined;
  /**
   * ASN type: ISP, hosting, business, or education
   */
  asnType?: string | undefined;
  /**
   * ASN country code the IP address belongs to.
   */
  asnCountry?: string | undefined;
  /**
   * Name of service the IP address belongs to.
   */
  service?: string | undefined;

  /**
   * Create an `ArcjetIpDetails`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   IP details.
   */
  constructor(init: ArcjetIpDetailsInit = {}) {
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

  /**
   * Check if the IP address has geo `latitude` info.
   * This also implies that `accuracyRadius` is available.
   *
   * @returns
   *   Whether the IP address has latitude info.
   */
  hasLatitude(): this is RequiredProps<this, "latitude" | "accuracyRadius"> {
    return typeof this.latitude !== "undefined";
  }

  /**
   * Check if the IP address has geo `longitude` info.
   * This also implies that `accuracyRadius` is available.
   *
   * @returns
   *   Whether the IP address has longitude info.
   */
  hasLongitude(): this is RequiredProps<this, "longitude" | "accuracyRadius"> {
    return typeof this.longitude !== "undefined";
  }

  /**
   * Check if the IP address has geo accuracy radius info.
   * This also implies that `latitude` and `longitude` are available.
   *
   * @returns
   *   Whether the IP address has accuracy info.
   */
  hasAccuracyRadius(): this is RequiredProps<
    this,
    "latitude" | "longitude" | "accuracyRadius"
  > {
    return typeof this.accuracyRadius !== "undefined";
  }

  /**
   * Check if the IP address has timezone info.
   *
   * @returns
   *   Whether the IP address has timezone info.
   */
  hasTimezone(): this is RequiredProps<this, "timezone"> {
    return typeof this.timezone !== "undefined";
  }

  /**
   * Check if the IP address has postcal code info.
   *
   * @returns
   *   Whether the IP address has postcal code info.
   */
  hasPostalCode(): this is RequiredProps<this, "postalCode"> {
    return typeof this.postalCode !== "undefined";
  }

  /**
   * Check if the IP address has city info.
   *
   * @returns
   *   Whether the IP address has city info.
   */
  // TODO: If we have city, what other data are we sure to have?
  hasCity(): this is RequiredProps<this, "city"> {
    return typeof this.city !== "undefined";
  }

  /**
   * Check if the IP address has region info.
   *
   * @returns
   *   Whether the IP address has region info.
   */
  // TODO: If we have region, what other data are we sure to have?
  hasRegion(): this is RequiredProps<this, "region"> {
    return typeof this.region !== "undefined";
  }

  /**
   * Check if the IP address has country info:
   * `countryName` and `country`.
   *
   * @returns
   *   Whether the IP address has country info.
   */
  // TODO: If we have country, should we also have continent?
  hasCountry(): this is RequiredProps<this, "country" | "countryName"> {
    return typeof this.country !== "undefined";
  }

  /**
   * Check if the IP address has continent info:
   * `continentName` and `continent`.
   *
   * @returns
   *   Whether the IP address has continent info.
   */
  hasContintent(): this is RequiredProps<this, "continent" | "continentName"> {
    return typeof this.continent !== "undefined";
  }

  /**
   * Check if the IP address has ASN info.
   *
   * @deprecated
   *   Use `hasAsn()` instead.
   *
   * @returns
   *   Whether the IP address has ASN info.
   */
  hasASN(): this is RequiredProps<
    this,
    "asn" | "asnName" | "asnDomain" | "asnType" | "asnCountry"
  > {
    return this.hasAsn();
  }

  /**
   * Check if the IP address has ASN info:
   * `asnCountry`, `asnDomain`, `asnName`, `asnType`, and `asn` fields.
   *
   * @returns
   *   Whether the IP address has ASN info.
   */
  hasAsn(): this is RequiredProps<
    this,
    "asn" | "asnName" | "asnDomain" | "asnType" | "asnCountry"
  > {
    return typeof this.asn !== "undefined";
  }

  /**
   * Check if the IP address has a service.
   *
   * @returns
   *   Whether the IP address has a service.
   */
  hasService(): this is RequiredProps<this, "service"> {
    return typeof this.service !== "undefined";
  }

  /**
   * Check if the IP address belongs to a hosting provider.
   *
   * @returns
   *   Whether the IP address belongs to a hosting provider.
   */
  isHosting(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isHosting;
  }

  /**
   * Check if the IP address belongs to a VPN provider.
   *
   * @returns
   *   Whether the IP address belongs to a VPN provider.
   */
  isVpn(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isVpn;
  }

  /**
   * Check if the IP address belongs to a proxy provider.
   *
   * @returns
   *   Whether the IP address belongs to a proxy provider.
   */
  isProxy(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isProxy;
  }

  /**
   * Check if the IP address belongs to a Tor node.
   *
   * @returns
   *   Whether the IP address belongs to a Tor node.
   */
  isTor(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isTor;
  }

  /**
   * Check if the IP address belongs to a relay service.
   *
   * @returns
   *   Whether the IP address belongs to a relay service.
   */
  isRelay(): boolean {
    // @ts-expect-error because we attach this with Object.defineProperties
    return this._isRelay;
  }
}

/**
 * Configuration for the basic `ArcjetDecision`.
 */
interface ArcjetDecisionInitAbstract {
  /**
   * Unique identifier of the decision.
   */
  id?: string;

  /**
   * List of results from calling rules.
   */
  results: ArcjetRuleResult[];

  /**
   * Duration in milliseconds this decision should be considered valid.
   */
  ttl: number;

  /**
   * Details about the IP address.
   */
  ip?: ArcjetIpDetails;
}

/**
 * Configuration for most `ArcjetDecision`s.
 */
interface ArcjetDecisionInit extends ArcjetDecisionInitAbstract {
  /**
   * Reason for the decision.
   */
  reason: ArcjetReason;
}

/**
 * Configuration for `ArcjetErrorDecision`.
 */
interface ArcjetErrorDecisionInit extends ArcjetDecisionInitAbstract {
  /**
   * Reason for the decision.
   */
  reason: ArcjetErrorReason;
}

/**
 * Decision returned by the Arcjet SDK.
 */
export abstract class ArcjetDecision {
  /**
   * Unique identifier of the decision.
   * This can be used to look up the decision in the Arcjet dashboard.
   */
  id: string;

  /**
   * Duration in milliseconds this decision should be considered valid, also
   * known as time-to-live.
   */
  ttl: number;

  /**
   * List of results from calling rules.
   * Can also be found by logging into the Arcjet dashboard and searching for the decision `id`.
   */
  results: ArcjetRuleResult[];

  /**
   * Details about the IP address that informed the `conclusion`.
   */
  ip: ArcjetIpDetails;

  /**
   * Conclusion about the request.
   */
  abstract conclusion: ArcjetConclusion;

  /**
   * Reason for the decision.
   */
  abstract reason: ArcjetReason;

  /**
   * Create an `ArcjetDecision`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Decision.
   */
  constructor(init: ArcjetDecisionInitAbstract) {
    if (typeof init.id === "string") {
      this.id = init.id;
    } else {
      this.id = typeid("lreq").toString();
    }

    this.results = init.results;
    this.ttl = init.ttl;
    this.ip = init.ip ?? new ArcjetIpDetails();
  }

  /**
   * Check if the decision is allowed.
   * This considers `ERROR` decisions as allowed too.
   *
   * @returns
   *   Whether the decision is allowed.
   */
  isAllowed(): this is ArcjetAllowDecision | ArcjetErrorDecision {
    return this.conclusion === "ALLOW" || this.conclusion === "ERROR";
  }

  /**
   * Check if the decision is denied.
   *
   * @returns
   *   Whether the decision is denied.
   */
  isDenied(): this is ArcjetDenyDecision {
    return this.conclusion === "DENY";
  }

  /**
   * Check if the decision is challenged.
   *
   * @returns
   *   Whether the decision is challenged.
   */
  isChallenged(): this is ArcjetChallengeDecision {
    return this.conclusion === "CHALLENGE";
  }

  /**
   * Check if the decision is errored.
   * This does **not** consider `ALLOW` as errored.
   *
   * @returns
   *   Whether the decision is errored.
   */
  isErrored(): this is ArcjetErrorDecision {
    return this.conclusion === "ERROR";
  }
}

/**
 * Allow decision.
 */
export class ArcjetAllowDecision extends ArcjetDecision {
  /**
   * Kind.
   */
  conclusion = "ALLOW" as const;

  /**
   * Reason for decision.
   */
  reason: ArcjetReason;

  /**
   * Create an `ArcjetAllowDecision`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Allow decision.
   */
  constructor(init: ArcjetDecisionInit) {
    super(init);

    this.reason = init.reason;
  }
}

/**
 * Deny decision.
 */
export class ArcjetDenyDecision extends ArcjetDecision {
  /**
   * Kind.
   */
  conclusion = "DENY" as const;

  /**
   * Reason for decision.
   */
  reason: ArcjetReason;

  /**
   * Create an `ArcjetDenyDecision`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Deny decision.
   */
  constructor(init: ArcjetDecisionInit) {
    super(init);

    this.reason = init.reason;
  }
}

/**
 * Challenge decision.
 */
export class ArcjetChallengeDecision extends ArcjetDecision {
  /**
   * Kind.
   */
  conclusion = "CHALLENGE" as const;

  /**
   * Reason for decision.
   */
  reason: ArcjetReason;

  /**
   * Create an `ArcjetChallengeDecision`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Challenge decision.
   */
  constructor(init: ArcjetDecisionInit) {
    super(init);

    this.reason = init.reason;
  }
}

/**
 * Error decision.
 */
export class ArcjetErrorDecision extends ArcjetDecision {
  /**
   * Kind.
   */
  conclusion = "ERROR" as const;

  /**
   * Reason for decision.
   */
  reason: ArcjetErrorReason;

  /**
   * Create an `ArcjetErrorDecision`.
   *
   * @param init
   *   Configuration.
   * @returns
   *   Error decision.
   */
  constructor(init: ArcjetErrorDecisionInit) {
    super(init);

    this.reason = init.reason;
  }
}

/**
 * Request details.
 */
export interface ArcjetRequestDetails {
  /**
   * IP address (IPv4 or IPv6).
   */
  ip: string;

  /**
   * HTTP method (such as `GET`).
   */
  method: string;

  /**
   * Protocol (such as `"http"`).
   */
  protocol: string;

  /**
   * Hostname (such as `"example.com"`).
   */
  host: string;

  /**
   * Path (such as `"/path/to/resource"`).
   */
  path: string;

  /**
   * Headers of the request.
   *
   * This is a [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object.
   * This never includes cookies: those are stored separately.
   */
  headers: Headers;

  /**
   * Cookies of the request (such as `"cookie1=value1; cookie2=value2"`).
   */
  cookies: string;

  /**
   * Query string of the request (such as `"?q=alpha"`).
   */
  query: string;

  /**
   * Extra info.
   */
  extra: { [key: string]: string };

  /**
   * Email address of the user making the request.
   */
  // TODO: Consider moving email to `extra` map
  email?: string;
}

/**
 * Arcjet rule.
 *
 * @template Props
 *   Extra properties passed to the rule.
 */
export type ArcjetRule<Props extends {} = {}> = {
  /**
   * Kind.
   */
  // TODO(@wooorm-arcjet):
  // if it is intentional that people can extend rules,
  // then we need to allow that in the types.
  type:
    | "RATE_LIMIT"
    | "BOT"
    | "EMAIL"
    | "FILTER"
    | "SHIELD"
    | "SENSITIVE_INFO"
    | string;

  /**
   * Mode.
   */
  mode: ArcjetMode;

  /**
   * Priority.
   */
  priority: number;

  /**
   * Version of rule.
   */
  version: number;

  /**
   * Validate locally whether the rule can run.
   *
   * For example, the email rule requires an `email` field and throws if it is
   * not passed.
   *
   * @param context
   *   Arcjet context.
   * @param details
   *   Request details and extra properties.
   * @returns
   *   Nothing.
   * @throws
   *   If the rule cannot run.
   */
  validate(
    context: ArcjetContext,
    details: Partial<ArcjetRequestDetails & Props>,
  ): asserts details is ArcjetRequestDetails & Props;

  /**
   * Run a rule locally.
   *
   * The result is used if it is a `LIVE` `DENY` result.
   * In other cases the server is contacted to get results.
   *
   * @param context
   *   Arcjet context.
   * @param details
   *   Request details and extra properties.
   * @returns
   *   Promise to a rule result.
   */
  protect(
    context: ArcjetContext,
    details: ArcjetRequestDetails & Props,
  ): Promise<ArcjetRuleResult>;
};

/**
 * Abstract rate limit rule.
 */
export interface ArcjetRateLimitRule<Props extends {}>
  extends ArcjetRule<Props> {
  /**
   * Kind.
   */
  type: "RATE_LIMIT";

  /**
   * Algorithm used for rate limiting.
   */
  algorithm: ArcjetRateLimitAlgorithm;

  /**
   * Characteristics of the rule.
   */
  characteristics?: string[];
}

/**
 * Token bucket rate limit rule.
 */
export interface ArcjetTokenBucketRateLimitRule<Props extends {}>
  extends ArcjetRateLimitRule<Props> {
  /**
   * Algorithm kind.
   */
  algorithm: "TOKEN_BUCKET";

  /**
   * Tokens to add to the bucket at each interval.
   */
  refillRate: number;

  /**
   * Interval in seconds to add tokens to the bucket.
   */
  interval: number;

  /**
   * Max tokens the bucket can hold.
   */
  capacity: number;
}

/**
 * Fixed window rate limit rule.
 */
export interface ArcjetFixedWindowRateLimitRule<Props extends {}>
  extends ArcjetRateLimitRule<Props> {
  /**
   * Algorithm kind.
   */
  algorithm: "FIXED_WINDOW";

  /**
   * Max requests allowed in the time window.
   */
  max: number;

  /**
   * Time window in seconds the rate limit applies to.
   */
  window: number;
}

/**
 * Sliding window rate limit rule.
 */
export interface ArcjetSlidingWindowRateLimitRule<Props extends {}>
  extends ArcjetRateLimitRule<Props> {
  /**
   * Algorithm kind.
   */
  algorithm: "SLIDING_WINDOW";

  /**
   * Max requests allowed in the time window.
   */
  max: number;

  /**
   * Time interval in seconds for the rate limit.
   */
  interval: number;
}

/**
 * Email rule.
 */
export interface ArcjetEmailRule<Props extends { email: string }>
  extends ArcjetRule<Props> {
  /**
   * Kind.
   */
  type: "EMAIL";

  /**
   * Email types that are allowed.
   */
  allow: ArcjetEmailType[];

  /**
   * Email types that are not allowed.
   */
  deny: ArcjetEmailType[];

  /**
   * Whether to allow email addresses that contain a single domain segment.
   * Something like `foo@bar` is not allowed when `true`.
   * It is allowed when `false`.
   */
  requireTopLevelDomain: boolean;

  /**
   * Whether to allow email addresses that contain a domain literal.
   * Something like `foo@[192.168.1.1]` is allowed when `true`.
   * It is not allowed when `false`.
   */
  allowDomainLiteral: boolean;
}

/**
 * Filter rule.
 */
export interface ArcjetFilterRule extends ArcjetRule<{}> {
  /**
   * List of expressions that allow a request when one matches and deny otherwise.
   */
  allow: ReadonlyArray<string>;

  /**
   * List of expressions that deny a request when one matches and allow otherwise.
   */
  deny: ReadonlyArray<string>;

  /**
   * Kind.
   */
  type: "FILTER";
}

/**
 * Sensitive info rule.
 */
export interface ArcjetSensitiveInfoRule<Props extends {}>
  extends ArcjetRule<Props> {
  /**
   * Kind.
   */
  type: "SENSITIVE_INFO";

  /**
   * Allowed entities.
   */
  allow: string[];

  /**
   * Denied entities.
   */
  deny: string[];
}

/**
 * Bot rule.
 */
export interface ArcjetBotRule<Props extends {}> extends ArcjetRule<Props> {
  /**
   * Kind.
   */
  type: "BOT";

  /**
   * Allowed bots.
   */
  allow: Array<string>;

  /**
   * Denied bots.
   */
  deny: Array<string>;
}

/**
 * Shield rule.
 */
export interface ArcjetShieldRule<Props extends {}> extends ArcjetRule<Props> {
  /**
   * Kind.
   */
  type: "SHIELD";
}

/**
 * Arcjet logger interface.
 *
 * Some Pino-compatible functions are required but most of its interface is
 * omitted.
 *
 * See `@arcjet/logger` for an implementation.
 */
export interface ArcjetLogger {
  /**
   * Debug.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  debug(msg: string, ...args: unknown[]): void;

  /**
   * Debug.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;

  /**
   * Info.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(msg: string, ...args: unknown[]): void;

  /**
   * Info.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;

  /**
   * Warn.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  warn(msg: string, ...args: unknown[]): void;

  /**
   * Warn.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;

  /**
   * Error.
   *
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  error(msg: string, ...args: unknown[]): void;

  /**
   * Error.
   *
   * @param obj
   *   Merging object copied into the JSON log line.
   * @param msg
   *   Template.
   * @param args
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
}

/**
 * Arcjet context.
 */
export type ArcjetContext<T = unknown> = {
  /**
   * Arbitrary indexing into context is currently allowed but not typed.
   */
  [key: string]: unknown;

  /**
   * API key.
   */
  key: string;

  /**
   * Fingerprint of request.
   */
  fingerprint: string;

  /**
   * Detected runtime.
   */
  runtime: string;

  /**
   * Logger to use.
   */
  log: ArcjetLogger;

  /**
   * Global characteristics.
   */
  characteristics: string[];

  /**
   * Cache to use.
   */
  cache: Cache<T>;

  /**
   * Function to use to read a request.
   */
  getBody: () => Promise<string | undefined>;

  /**
   * Function called to wait for something.
   *
   * @param promise
   *   Promise to wait for.
   * @returns
   *   Nothing.
   */
  waitUntil?: (promise: Promise<unknown>) => void;
};
