// @generated by protoc-gen-es v1.4.2
// @generated from file decide/v1alpha1/decide.proto (package proto.decide.v1alpha1, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import type { BinaryReadOptions, FieldList, JsonReadOptions, JsonValue, PartialMessage, PlainMessage, Timestamp } from "@bufbuild/protobuf";
import { Message, proto3 } from "@bufbuild/protobuf";

/**
 * Represents whether we think the client is a bot or not. This should be used
 * alongside the bot score which represents the level of certainty of our
 * detection.
 *
 * @generated from enum proto.decide.v1alpha1.BotType
 */
export declare enum BotType {
  /**
   * The bot type is unspecified. This should not be used, but is here to
   * conform to the gRPC best practices.
   *
   * @generated from enum value: BOT_TYPE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * We could not analyze the request, perhaps because of insufficient
   * information or because the bot analysis can't be executed in this
   * environment. We do not recommend blocking these requests. Represented by
   * a score of 0.
   *
   * @generated from enum value: BOT_TYPE_NOT_ANALYZED = 1;
   */
  NOT_ANALYZED = 1,

  /**
   * We are sure the request was made by an automated bot. We recommend
   * blocking these requests for paths which are for humans only e.g. login or
   * signup pages, but not blocking for API paths. Represented by a score of
   * 1.
   *
   * @generated from enum value: BOT_TYPE_AUTOMATED = 2;
   */
  AUTOMATED = 2,

  /**
   * We have some evidence that the request was made by an automated bot. The
   * degree of certainty is represented by a score range of 2-29.
   *
   * @generated from enum value: BOT_TYPE_LIKELY_AUTOMATED = 3;
   */
  LIKELY_AUTOMATED = 3,

  /**
   * We don't think this request was made by an automated bot. The degree of
   * certainty is represented by a score range of 30-99.
   *
   * @generated from enum value: BOT_TYPE_LIKELY_NOT_A_BOT = 4;
   */
  LIKELY_NOT_A_BOT = 4,

  /**
   * We are sure the request was made by an automated bot and it is on our
   * list of verified good bots. This is manually maintained by the Arcjet
   * team and includes bots such as monitoring agents and friendly search
   * engine crawlers. In most cases you can allow these requests on public
   * pages, but you may wish to block them for internal or private paths.
   * Represented by a score of 100.
   *
   * @generated from enum value: BOT_TYPE_VERIFIED_BOT = 5;
   */
  VERIFIED_BOT = 5,
}

/**
 * Represents the type of email address submitted.
 *
 * @generated from enum proto.decide.v1alpha1.EmailType
 */
export declare enum EmailType {
  /**
   * The email type is unspecified. This should not be used, but is here to
   * conform to the gRPC best practices.
   *
   * @generated from enum value: EMAIL_TYPE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * The email address is disposable, which means it's registered to a service
   * that allows throwaway email addresses. Although these are sometimes used
   * for privacy, they are also often used for spam signups or fraudulent
   * activity when combined with a transaction e.g. attempting to use a credit
   * card. We recommend blocking these in higher risk scenarios.
   *
   * @generated from enum value: EMAIL_TYPE_DISPOSABLE = 1;
   */
  DISPOSABLE = 1,

  /**
   * The email address is registered to a free email service. These are very
   * common, such as GMail or Yahoo Mail, so we do not recommend blocking
   * these. However, you may wish to flag these for review the first time they
   * attempt a transaction.
   *
   * @generated from enum value: EMAIL_TYPE_FREE = 2;
   */
  FREE = 2,

  /**
   * This email address is registered to a domain name which has no MX records
   * configured. This means it cannot receive email. We recommend blocking
   * these.
   *
   * @generated from enum value: EMAIL_TYPE_NO_MX_RECORDS = 3;
   */
  NO_MX_RECORDS = 3,

  /**
   * This email has no Gravatar attached to the email from
   * https://gravatar.com which makes it slightly less likely to be a valid
   * signup. We recommend using this as part of your own risk scoring or
   * manually reviewing these signups.
   *
   * @generated from enum value: EMAIL_TYPE_NO_GRAVATAR = 4;
   */
  NO_GRAVATAR = 4,

  /**
   * This email was specified in an invalid format.
   *
   * @generated from enum value: EMAIL_TYPE_INVALID = 5;
   */
  INVALID = 5,
}

/**
 * The mode to run in. This can be either `DRY_RUN` or `LIVE`. In `DRY_RUN`
 * mode, all requests will be allowed and you can review what the action would
 * have been from your dashboard. In `LIVE` mode, requests will be allowed,
 * challenged or blocked based on the returned decision.
 *
 * @generated from enum proto.decide.v1alpha1.Mode
 */
export declare enum Mode {
  /**
   * The mode is unspecified. This should not be used, but is here to conform
   * to the gRPC best practices.
   *
   * @generated from enum value: MODE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * In `DRY_RUN` mode, all requests will be allowed and you can review what
   * the action would have been from your dashboard.
   *
   * @generated from enum value: MODE_DRY_RUN = 1;
   */
  DRY_RUN = 1,

  /**
   * In `LIVE` mode, requests will be allowed, challenged or blocked based on
   * the returned decision.
   *
   * @generated from enum value: MODE_LIVE = 2;
   */
  LIVE = 2,
}

/**
 * @generated from enum proto.decide.v1alpha1.RuleState
 */
export declare enum RuleState {
  /**
   * The mode is unspecified. This should not be used, but is here to conform
   * to the gRPC best practices.
   *
   * @generated from enum value: RULE_STATE_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * The rule was run and the outcome was
   * taken into consideration for the end decision
   *
   * @generated from enum value: RULE_STATE_RUN = 1;
   */
  RUN = 1,

  /**
   * The rule wasn't run
   *
   * @generated from enum value: RULE_STATE_NOT_RUN = 2;
   */
  NOT_RUN = 2,

  /**
   * The rule was run but not actioned on,
   * meaning the outcome didn't affect the end decision
   *
   * @generated from enum value: RULE_STATE_DRY_RUN = 3;
   */
  DRY_RUN = 3,

  /**
   * The rule was not run because the reason was cached
   *
   * @generated from enum value: RULE_STATE_CACHED = 4;
   */
  CACHED = 4,
}

/**
 * The conclusion for the request based on the Arcjet analysis and any specific
 * configuration.
 *
 * @generated from enum proto.decide.v1alpha1.Conclusion
 */
export declare enum Conclusion {
  /**
   * The conclusion is unspecified. This should not be used, but is here to
   * conform to the gRPC best practices.
   *
   * @generated from enum value: CONCLUSION_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * The request should be allowed.
   *
   * @generated from enum value: CONCLUSION_ALLOW = 1;
   */
  ALLOW = 1,

  /**
   * The request should be blocked.
   *
   * @generated from enum value: CONCLUSION_DENY = 2;
   */
  DENY = 2,

  /**
   * The request should be challenged.
   *
   * @generated from enum value: CONCLUSION_CHALLENGE = 3;
   */
  CHALLENGE = 3,

  /**
   * The request errored.
   *
   * @generated from enum value: CONCLUSION_ERROR = 4;
   */
  ERROR = 4,
}

/**
 * The SDK used to make the request. Used for analytics and to help us improve.
 *
 * @generated from enum proto.decide.v1alpha1.SDKStack
 */
export declare enum SDKStack {
  /**
   * @generated from enum value: SDK_STACK_UNSPECIFIED = 0;
   */
  SDK_STACK_UNSPECIFIED = 0,

  /**
   * @generated from enum value: SDK_STACK_NODEJS = 1;
   */
  SDK_STACK_NODEJS = 1,

  /**
   * @generated from enum value: SDK_STACK_NEXTJS = 2;
   */
  SDK_STACK_NEXTJS = 2,

  /**
   * @generated from enum value: SDK_STACK_PYTHON = 3;
   */
  SDK_STACK_PYTHON = 3,

  /**
   * @generated from enum value: SDK_STACK_DJANGO = 4;
   */
  SDK_STACK_DJANGO = 4,
}

/**
 * @generated from enum proto.decide.v1alpha1.RateLimitAlgorithm
 */
export declare enum RateLimitAlgorithm {
  /**
   * @generated from enum value: RATE_LIMIT_ALGORITHM_UNSPECIFIED = 0;
   */
  UNSPECIFIED = 0,

  /**
   * @generated from enum value: RATE_LIMIT_ALGORITHM_TOKEN_BUCKET = 1;
   */
  TOKEN_BUCKET = 1,

  /**
   * @generated from enum value: RATE_LIMIT_ALGORITHM_FIXED_WINDOW = 2;
   */
  FIXED_WINDOW = 2,

  /**
   * @generated from enum value: RATE_LIMIT_ALGORITHM_SLIDING_WINDOW = 3;
   */
  SLIDING_WINDOW = 3,
}

/**
 * The reason for the decision. This is populated based on the selected rules
 * for deny or challenge responses. Additional details can be found in the
 * field and by logging into the Arcjet dashboard and searching for the
 * decision ID.
 *
 * @generated from message proto.decide.v1alpha1.Reason
 */
export declare class Reason extends Message<Reason> {
  /**
   * @generated from oneof proto.decide.v1alpha1.Reason.reason
   */
  reason: {
    /**
     * Contains details about the rate limit when the decision was made
     * based on a rate limit rule.
     *
     * @generated from field: proto.decide.v1alpha1.RateLimitReason rate_limit = 1;
     */
    value: RateLimitReason;
    case: "rateLimit";
  } | {
    /**
     * Contains details about the edge rules which were triggered when
     * the decision was made based on an edge rule.
     *
     * @generated from field: proto.decide.v1alpha1.EdgeRuleReason edge_rule = 2;
     */
    value: EdgeRuleReason;
    case: "edgeRule";
  } | {
    /**
     * Contains details about why the request was considered a bot when
     * the decision was made based on a bot rule.
     *
     * @generated from field: proto.decide.v1alpha1.BotReason bot = 3;
     */
    value: BotReason;
    case: "bot";
  } | {
    /**
     * Contains details about why the request was considered suspicious
     * when the decision was based on a WAF rule.
     *
     * @generated from field: proto.decide.v1alpha1.SuspiciousReason suspicious = 4;
     */
    value: SuspiciousReason;
    case: "suspicious";
  } | {
    /**
     * Contains details about the email when the decision was made based
     * on an email rule.
     *
     * @generated from field: proto.decide.v1alpha1.EmailReason email = 5;
     */
    value: EmailReason;
    case: "email";
  } | {
    /**
     * Contains details about the error decision when an error occurred.
     *
     * @generated from field: proto.decide.v1alpha1.ErrorReason error = 6;
     */
    value: ErrorReason;
    case: "error";
  } | { case: undefined; value?: undefined };

  constructor(data?: PartialMessage<Reason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.Reason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Reason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Reason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Reason;

  static equals(a: Reason | PlainMessage<Reason> | undefined, b: Reason | PlainMessage<Reason> | undefined): boolean;
}

/**
 * Details of a rate limit decision.
 *
 * @generated from message proto.decide.v1alpha1.RateLimitReason
 */
export declare class RateLimitReason extends Message<RateLimitReason> {
  /**
   * The configured maximum number of requests allowed in the current window.
   *
   * @generated from field: uint32 max = 1;
   */
  max: number;

  /**
   * Deprecated: Always empty. Previously, the number of requests which have
   * been made in the current window.
   *
   * @generated from field: int32 count = 2 [deprecated = true];
   * @deprecated
   */
  count: number;

  /**
   * The number of requests remaining in the current window.
   *
   * @generated from field: uint32 remaining = 3;
   */
  remaining: number;

  /**
   * The time at which the rate limit window will reset.
   *
   * @generated from field: google.protobuf.Timestamp reset_time = 4;
   */
  resetTime?: Timestamp;

  constructor(data?: PartialMessage<RateLimitReason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.RateLimitReason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): RateLimitReason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): RateLimitReason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): RateLimitReason;

  static equals(a: RateLimitReason | PlainMessage<RateLimitReason> | undefined, b: RateLimitReason | PlainMessage<RateLimitReason> | undefined): boolean;
}

/**
 * Details of an edge rule decision. Unimplmented.
 *
 * @generated from message proto.decide.v1alpha1.EdgeRuleReason
 */
export declare class EdgeRuleReason extends Message<EdgeRuleReason> {
  constructor(data?: PartialMessage<EdgeRuleReason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.EdgeRuleReason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): EdgeRuleReason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): EdgeRuleReason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): EdgeRuleReason;

  static equals(a: EdgeRuleReason | PlainMessage<EdgeRuleReason> | undefined, b: EdgeRuleReason | PlainMessage<EdgeRuleReason> | undefined): boolean;
}

/**
 * Details of a bot decision.
 *
 * @generated from message proto.decide.v1alpha1.BotReason
 */
export declare class BotReason extends Message<BotReason> {
  /**
   * The bot type we detected. See `BotType` for more information.
   *
   * @generated from field: proto.decide.v1alpha1.BotType bot_type = 1;
   */
  botType: BotType;

  /**
   * The bot score we calculated. Score ranges from 0 to 99 representing the
   * degree of certainty. The higher the number within the type category, the
   * greater the degree of certainty. See `BotType` for more information.
   *
   * @generated from field: int32 bot_score = 2;
   */
  botScore: number;

  /**
   * Whether bot detection was triggered by our user agent matching.
   *
   * @generated from field: bool user_agent_match = 3;
   */
  userAgentMatch: boolean;

  /**
   * Whether the IP address belongs to a hosting provider.
   *
   * @generated from field: bool ip_hosting = 5;
   */
  ipHosting: boolean;

  /**
   * Whether the IP address belongs to a VPN provider.
   *
   * @generated from field: bool ip_vpn = 6;
   */
  ipVpn: boolean;

  /**
   * Whether the IP address belongs to a proxy provider.
   *
   * @generated from field: bool ip_proxy = 7;
   */
  ipProxy: boolean;

  /**
   * Whether the IP address belongs to a Tor node.
   *
   * @generated from field: bool ip_tor = 8;
   */
  ipTor: boolean;

  /**
   * Whether the IP address belongs to a relay service.
   *
   * @generated from field: bool ip_relay = 9;
   */
  ipRelay: boolean;

  constructor(data?: PartialMessage<BotReason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.BotReason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): BotReason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): BotReason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): BotReason;

  static equals(a: BotReason | PlainMessage<BotReason> | undefined, b: BotReason | PlainMessage<BotReason> | undefined): boolean;
}

/**
 * Details of why we consider the request suspicious.
 *
 * @generated from message proto.decide.v1alpha1.SuspiciousReason
 */
export declare class SuspiciousReason extends Message<SuspiciousReason> {
  /**
   * Whether the WAF was triggered. Log into the Arcjet dashboard and search
   * for the decision ID to find more details about the WAF rules which were
   * triggered.
   *
   * @generated from field: bool waf_triggered = 1;
   */
  wafTriggered: boolean;

  constructor(data?: PartialMessage<SuspiciousReason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.SuspiciousReason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): SuspiciousReason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): SuspiciousReason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): SuspiciousReason;

  static equals(a: SuspiciousReason | PlainMessage<SuspiciousReason> | undefined, b: SuspiciousReason | PlainMessage<SuspiciousReason> | undefined): boolean;
}

/**
 * Details of an email decision.
 *
 * @generated from message proto.decide.v1alpha1.EmailReason
 */
export declare class EmailReason extends Message<EmailReason> {
  /**
   * The types of email address we detected. This may be one or more of the
   * `EmailType` values.
   *
   * @generated from field: repeated proto.decide.v1alpha1.EmailType email_types = 1;
   */
  emailTypes: EmailType[];

  constructor(data?: PartialMessage<EmailReason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.EmailReason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): EmailReason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): EmailReason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): EmailReason;

  static equals(a: EmailReason | PlainMessage<EmailReason> | undefined, b: EmailReason | PlainMessage<EmailReason> | undefined): boolean;
}

/**
 * Details of an error decision.
 *
 * @generated from message proto.decide.v1alpha1.ErrorReason
 */
export declare class ErrorReason extends Message<ErrorReason> {
  /**
   * The error message associated with the error decision.
   *
   * @generated from field: string message = 1;
   */
  message: string;

  constructor(data?: PartialMessage<ErrorReason>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.ErrorReason";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ErrorReason;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ErrorReason;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ErrorReason;

  static equals(a: ErrorReason | PlainMessage<ErrorReason> | undefined, b: ErrorReason | PlainMessage<ErrorReason> | undefined): boolean;
}

/**
 * The rate limit configuration for a path.
 *
 * @generated from message proto.decide.v1alpha1.RateLimitRule
 */
export declare class RateLimitRule extends Message<RateLimitRule> {
  /**
   * @generated from field: proto.decide.v1alpha1.Mode mode = 1;
   */
  mode: Mode;

  /**
   * The request path the rate limit applies to. If not specified and Arcjet
   * is running on a specific API route, it defaults to the path for that
   * route. If not specified and Arcjet is running from middleware, it applies
   * to all routes.
   *
   * @generated from field: string match = 2;
   */
  match: string;

  /**
   * Defines how Arcjet will track the rate limit. If not specified, it will
   * default to the client IP address ip.src. If more than one option is
   * provided, they will be combined. See
   * https://docs.arcjet.com/rate-limiting/configuration
   *
   * @generated from field: repeated string characteristics = 3;
   */
  characteristics: string[];

  /**
   * The time window the rate limit applies to. This is a string value with a
   * sequence of decimal numbers, each with an optional fraction and a unit
   * suffix e.g. 1s for 1 second, 1h45m for 1 hour and 45 minutes, 1d for 1
   * day. Valid time units are ns, us (or µs), ms, s, m, h, d, w, y.
   *
   * @generated from field: string window = 4;
   */
  window: string;

  /**
   * The maximum number of requests allowed in the time period. This is a
   * positive integer value e.g. 100.
   *
   * Required by "fixed window", "sliding window", and unspecified algorithms.
   *
   * @generated from field: uint32 max = 5;
   */
  max: number;

  /**
   * How long to apply the limit before it expires and the client is allowed
   * to make more requests. If not specified, this will default to the same
   * value as the Window e.g. if the window is 1 hour, the client will be rate
   * limited for 1 hour after they hit the limit. This is a string value with
   * a sequence of decimal numbers, each with an optional fraction and a unit
   * suffix e.g. 1s for 1 second, 1h45m for 1 hour and 45 minutes, 1d for 1
   * day. Valid time units are ns, us (or µs), ms, s, m, h, d, w, y.
   *
   * @generated from field: string timeout = 6;
   */
  timeout: string;

  /**
   * The algorithm to use for rate limiting a request. If unspecified, we will
   * fallback to the "fixed window" algorithm. The chosen algorithm will
   * affect which other fields must be specified to be a valid configuration.
   *
   * @generated from field: proto.decide.v1alpha1.RateLimitAlgorithm algorithm = 7;
   */
  algorithm: RateLimitAlgorithm;

  /**
   * The amount of tokens that are refilled at the provided interval.
   *
   * Required by "token bucket" algorithm.
   *
   * @generated from field: uint32 refill_rate = 8;
   */
  refillRate: number;

  /**
   * The interval in which a rate limit is applied or tokens refilled.
   *
   * Required by "token bucket" and "sliding window" algorithms.
   *
   * @generated from field: uint32 interval = 9;
   */
  interval: number;

  /**
   * The maximum number of tokens that can exist in a token bucket.
   *
   * Required by "token bucket" algorithm.
   *
   * @generated from field: uint32 capacity = 10;
   */
  capacity: number;

  /**
   * The number of tokens to attempt to consume from a token bucket.
   *
   * Required by "token bucket" algorithm.
   *
   * @generated from field: uint32 requested = 11;
   */
  requested: number;

  constructor(data?: PartialMessage<RateLimitRule>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.RateLimitRule";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): RateLimitRule;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): RateLimitRule;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): RateLimitRule;

  static equals(a: RateLimitRule | PlainMessage<RateLimitRule> | undefined, b: RateLimitRule | PlainMessage<RateLimitRule> | undefined): boolean;
}

/**
 * The bot detection configuration.
 *
 * @generated from message proto.decide.v1alpha1.BotRule
 */
export declare class BotRule extends Message<BotRule> {
  /**
   * @generated from field: proto.decide.v1alpha1.Mode mode = 1;
   */
  mode: Mode;

  /**
   * The bot types to block. This may be one or more of the `BotType` values.
   *
   * @generated from field: repeated proto.decide.v1alpha1.BotType block = 2;
   */
  block: BotType[];

  /**
   * Additional bot detection rules to add or remove from the Arcjet standard
   * list. Each rule is a regular expression that matches the user agent of
   * the bot plus a label to indicate what type of bot it is from the above
   * `BotType`s.
   *
   * @generated from field: proto.decide.v1alpha1.BotRule.Patterns patterns = 3;
   */
  patterns?: BotRule_Patterns;

  constructor(data?: PartialMessage<BotRule>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.BotRule";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): BotRule;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): BotRule;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): BotRule;

  static equals(a: BotRule | PlainMessage<BotRule> | undefined, b: BotRule | PlainMessage<BotRule> | undefined): boolean;
}

/**
 * @generated from message proto.decide.v1alpha1.BotRule.Patterns
 */
export declare class BotRule_Patterns extends Message<BotRule_Patterns> {
  /**
   * @generated from field: map<string, proto.decide.v1alpha1.BotType> add = 1;
   */
  add: { [key: string]: BotType };

  /**
   * @generated from field: repeated string remove = 2;
   */
  remove: string[];

  constructor(data?: PartialMessage<BotRule_Patterns>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.BotRule.Patterns";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): BotRule_Patterns;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): BotRule_Patterns;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): BotRule_Patterns;

  static equals(a: BotRule_Patterns | PlainMessage<BotRule_Patterns> | undefined, b: BotRule_Patterns | PlainMessage<BotRule_Patterns> | undefined): boolean;
}

/**
 * The signup protection configuration.
 *
 * @generated from message proto.decide.v1alpha1.EmailRule
 */
export declare class EmailRule extends Message<EmailRule> {
  /**
   * @generated from field: proto.decide.v1alpha1.Mode mode = 1;
   */
  mode: Mode;

  /**
   * The email types to block. This may be one or more of the `EmailType`
   * values.
   *
   * @generated from field: repeated proto.decide.v1alpha1.EmailType block = 2;
   */
  block: EmailType[];

  /**
   * @generated from field: bool require_top_level_domain = 3;
   */
  requireTopLevelDomain: boolean;

  /**
   * @generated from field: bool allow_domain_literal = 4;
   */
  allowDomainLiteral: boolean;

  constructor(data?: PartialMessage<EmailRule>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.EmailRule";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): EmailRule;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): EmailRule;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): EmailRule;

  static equals(a: EmailRule | PlainMessage<EmailRule> | undefined, b: EmailRule | PlainMessage<EmailRule> | undefined): boolean;
}

/**
 * The configuration for Arcjet.
 *
 * @generated from message proto.decide.v1alpha1.Rule
 */
export declare class Rule extends Message<Rule> {
  /**
   * @generated from oneof proto.decide.v1alpha1.Rule.rule
   */
  rule: {
    /**
     * @generated from field: proto.decide.v1alpha1.RateLimitRule rate_limit = 1;
     */
    value: RateLimitRule;
    case: "rateLimit";
  } | {
    /**
     * @generated from field: proto.decide.v1alpha1.BotRule bots = 2;
     */
    value: BotRule;
    case: "bots";
  } | {
    /**
     * @generated from field: proto.decide.v1alpha1.EmailRule email = 3;
     */
    value: EmailRule;
    case: "email";
  } | { case: undefined; value?: undefined };

  constructor(data?: PartialMessage<Rule>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.Rule";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Rule;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Rule;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Rule;

  static equals(a: Rule | PlainMessage<Rule> | undefined, b: Rule | PlainMessage<Rule> | undefined): boolean;
}

/**
 * @generated from message proto.decide.v1alpha1.RuleResult
 */
export declare class RuleResult extends Message<RuleResult> {
  /**
   * The id for the rule this result relates to
   *
   * @generated from field: string rule_id = 1;
   */
  ruleId: string;

  /**
   * The rule run state
   *
   * @generated from field: proto.decide.v1alpha1.RuleState state = 2;
   */
  state: RuleState;

  /**
   * The conclusion determined by the rule.
   *
   * @generated from field: proto.decide.v1alpha1.Conclusion conclusion = 3;
   */
  conclusion: Conclusion;

  /**
   * The reason for the conclusion.
   *
   * @generated from field: proto.decide.v1alpha1.Reason reason = 4;
   */
  reason?: Reason;

  /**
   * The duration in milliseconds this result should be considered valid, also
   * known as time-to-live.
   *
   * @generated from field: int32 ttl = 5;
   */
  ttl: number;

  constructor(data?: PartialMessage<RuleResult>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.RuleResult";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): RuleResult;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): RuleResult;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): RuleResult;

  static equals(a: RuleResult | PlainMessage<RuleResult> | undefined, b: RuleResult | PlainMessage<RuleResult> | undefined): boolean;
}

/**
 * Details about a request under investigation.
 *
 * @generated from message proto.decide.v1alpha1.RequestDetails
 */
export declare class RequestDetails extends Message<RequestDetails> {
  /**
   * @generated from field: string ip = 1;
   */
  ip: string;

  /**
   * @generated from field: string method = 2;
   */
  method: string;

  /**
   * @generated from field: string protocol = 3;
   */
  protocol: string;

  /**
   * @generated from field: string host = 4;
   */
  host: string;

  /**
   * @generated from field: string path = 5;
   */
  path: string;

  /**
   * @generated from field: map<string, string> headers = 6;
   */
  headers: { [key: string]: string };

  /**
   * @generated from field: bytes body = 7;
   */
  body: Uint8Array;

  /**
   * @generated from field: map<string, string> extra = 8;
   */
  extra: { [key: string]: string };

  /**
   * @generated from field: string email = 9;
   */
  email: string;

  /**
   * The string representing semicolon-separated Cookies for a request.
   *
   * @generated from field: string cookies = 10;
   */
  cookies: string;

  /**
   * The `?`-prefixed string representing the Query for a request. Commonly
   * referred to as a "querystring".
   *
   * @generated from field: string query = 11;
   */
  query: string;

  constructor(data?: PartialMessage<RequestDetails>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.RequestDetails";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): RequestDetails;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): RequestDetails;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): RequestDetails;

  static equals(a: RequestDetails | PlainMessage<RequestDetails> | undefined, b: RequestDetails | PlainMessage<RequestDetails> | undefined): boolean;
}

/**
 * A decision made about the request under investigation.
 *
 * @generated from message proto.decide.v1alpha1.Decision
 */
export declare class Decision extends Message<Decision> {
  /**
   * The decision ID. This is a unique identifier for the decision which can
   * be used to search for the request details in the Arcjet dashboard.
   *
   * @generated from field: string id = 1;
   */
  id: string;

  /**
   * Arcjet's conclusion for the request based on our analysis.
   *
   * @generated from field: proto.decide.v1alpha1.Conclusion conclusion = 2;
   */
  conclusion: Conclusion;

  /**
   * The reason for the decision.
   *
   * @generated from field: proto.decide.v1alpha1.Reason reason = 3;
   */
  reason?: Reason;

  /**
   * The outcome of each rule taken into consideration for the decision.
   *
   * @generated from field: repeated proto.decide.v1alpha1.RuleResult rule_results = 4;
   */
  ruleResults: RuleResult[];

  /**
   * The duration in milliseconds this decision should be considered valid,
   * also known as time-to-live.
   *
   * @generated from field: int32 ttl = 5;
   */
  ttl: number;

  constructor(data?: PartialMessage<Decision>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.Decision";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): Decision;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): Decision;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): Decision;

  static equals(a: Decision | PlainMessage<Decision> | undefined, b: Decision | PlainMessage<Decision> | undefined): boolean;
}

/**
 * A request to the decide API.
 *
 * @generated from message proto.decide.v1alpha1.DecideRequest
 */
export declare class DecideRequest extends Message<DecideRequest> {
  /**
   * @generated from field: proto.decide.v1alpha1.SDKStack sdk_stack = 1;
   */
  sdkStack: SDKStack;

  /**
   * @generated from field: string sdk_version = 2;
   */
  sdkVersion: string;

  /**
   * The fingerprint of the request
   *
   * @generated from field: string fingerprint = 3;
   */
  fingerprint: string;

  /**
   * The information provided via an SDK about a request under investigation.
   *
   * @generated from field: proto.decide.v1alpha1.RequestDetails details = 4;
   */
  details?: RequestDetails;

  /**
   * The rules that are being considered for this request.
   *
   * @generated from field: repeated proto.decide.v1alpha1.Rule rules = 5;
   */
  rules: Rule[];

  constructor(data?: PartialMessage<DecideRequest>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.DecideRequest";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): DecideRequest;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): DecideRequest;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): DecideRequest;

  static equals(a: DecideRequest | PlainMessage<DecideRequest> | undefined, b: DecideRequest | PlainMessage<DecideRequest> | undefined): boolean;
}

/**
 * A response from the decide API.
 *
 * @generated from message proto.decide.v1alpha1.DecideResponse
 */
export declare class DecideResponse extends Message<DecideResponse> {
  /**
   * The decision made about the request under investigation.
   *
   * @generated from field: proto.decide.v1alpha1.Decision decision = 1;
   */
  decision?: Decision;

  /**
   * Any extra information returned by the Arcjet analysis.
   *
   * @generated from field: map<string, string> extra = 2;
   */
  extra: { [key: string]: string };

  constructor(data?: PartialMessage<DecideResponse>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.DecideResponse";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): DecideResponse;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): DecideResponse;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): DecideResponse;

  static equals(a: DecideResponse | PlainMessage<DecideResponse> | undefined, b: DecideResponse | PlainMessage<DecideResponse> | undefined): boolean;
}

/**
 * A request to the Report RPC when SDK has already made a decision locally.
 *
 * @generated from message proto.decide.v1alpha1.ReportRequest
 */
export declare class ReportRequest extends Message<ReportRequest> {
  /**
   * @generated from field: proto.decide.v1alpha1.SDKStack sdk_stack = 1;
   */
  sdkStack: SDKStack;

  /**
   * @generated from field: string sdk_version = 2;
   */
  sdkVersion: string;

  /**
   * The fingerprint of the request.
   *
   * @generated from field: string fingerprint = 3;
   */
  fingerprint: string;

  /**
   * The information provided via an SDK about a request under investigation.
   *
   * @generated from field: proto.decide.v1alpha1.RequestDetails details = 4;
   */
  details?: RequestDetails;

  /**
   * The decision reported about the request under investigation.
   *
   * @generated from field: proto.decide.v1alpha1.Decision decision = 5;
   */
  decision?: Decision;

  /**
   * The rules that are were considered for this request.
   *
   * @generated from field: repeated proto.decide.v1alpha1.Rule rules = 6;
   */
  rules: Rule[];

  /**
   * @generated from field: google.protobuf.Timestamp received_at = 7;
   */
  receivedAt?: Timestamp;

  constructor(data?: PartialMessage<ReportRequest>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.ReportRequest";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ReportRequest;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ReportRequest;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ReportRequest;

  static equals(a: ReportRequest | PlainMessage<ReportRequest> | undefined, b: ReportRequest | PlainMessage<ReportRequest> | undefined): boolean;
}

/**
 * A response from the Report RPC.
 *
 * @generated from message proto.decide.v1alpha1.ReportResponse
 */
export declare class ReportResponse extends Message<ReportResponse> {
  /**
   * The decision reported about the request under investigation.
   *
   * @generated from field: proto.decide.v1alpha1.Decision decision = 1;
   */
  decision?: Decision;

  /**
   * Any extra information returned by the Arcjet analysis.
   *
   * @generated from field: map<string, string> extra = 2;
   */
  extra: { [key: string]: string };

  constructor(data?: PartialMessage<ReportResponse>);

  static readonly runtime: typeof proto3;
  static readonly typeName = "proto.decide.v1alpha1.ReportResponse";
  static readonly fields: FieldList;

  static fromBinary(bytes: Uint8Array, options?: Partial<BinaryReadOptions>): ReportResponse;

  static fromJson(jsonValue: JsonValue, options?: Partial<JsonReadOptions>): ReportResponse;

  static fromJsonString(jsonString: string, options?: Partial<JsonReadOptions>): ReportResponse;

  static equals(a: ReportResponse | PlainMessage<ReportResponse> | undefined, b: ReportResponse | PlainMessage<ReportResponse> | undefined): boolean;
}

