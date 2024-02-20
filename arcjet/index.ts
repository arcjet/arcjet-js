import {
  ArcjetContext,
  ArcjetBotReason,
  ArcjetBotType,
  ArcjetEmailReason,
  ArcjetEmailRule,
  ArcjetEmailType,
  ArcjetErrorReason,
  ArcjetMode,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetStack,
  ArcjetDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetBotRule,
  ArcjetRule,
  ArcjetLocalRule,
  ArcjetRequestDetails,
  ArcjetTokenBucketRateLimitRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetSlidingWindowRateLimitRule,
} from "@arcjet/protocol";
import {
  ArcjetBotTypeToProtocol,
  ArcjetStackToProtocol,
  ArcjetBotTypeFromProtocol,
  ArcjetDecisionFromProtocol,
  ArcjetDecisionToProtocol,
  ArcjetRuleToProtocol,
} from "@arcjet/protocol/convert.js";
import {
  createPromiseClient,
  Transport,
  BotType,
  DecideRequest,
  DecideService,
  ReportRequest,
  Timestamp,
} from "@arcjet/protocol/proto.js";
import * as analyze from "@arcjet/analyze";
import * as duration from "@arcjet/duration";
import { Logger } from "@arcjet/logger";

export * from "@arcjet/protocol";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

function isIterable(val: any): val is Iterable<any> {
  return typeof val?.[Symbol.iterator] === "function";
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

class Cache<T> {
  expires: Map<string, number>;
  data: Map<string, T>;

  constructor() {
    this.expires = new Map();
    this.data = new Map();
  }

  get(key: string) {
    const ttl = this.ttl(key);
    if (ttl > 0) {
      return this.data.get(key);
    } else {
      // Cleanup if expired
      this.expires.delete(key);
      this.data.delete(key);
    }
  }

  set(key: string, value: T, expiresAt: number) {
    this.expires.set(key, expiresAt);
    this.data.set(key, value);
  }

  ttl(key: string): number {
    const now = nowInSeconds();
    const expiresAt = this.expires.get(key) ?? now;
    return expiresAt - now;
  }
}

function errorMessage(err: unknown): string {
  if (err) {
    if (typeof err === "string") {
      return err;
    }

    if (
      typeof err === "object" &&
      "message" in err &&
      typeof err.message === "string"
    ) {
      return err.message;
    }
  }

  return "Unknown problem";
}

// Type helpers from https://github.com/sindresorhus/type-fest but adjusted for
// our use.
//
// Simplify:
// https://github.com/sindresorhus/type-fest/blob/964466c9d59c711da57a5297ad954c13132a0001/source/simplify.d.ts
// UnionToIntersection:
// https://github.com/sindresorhus/type-fest/blob/017bf38ebb52df37c297324d97bcc693ec22e920/source/union-to-intersection.d.ts
// IsNever:
// https://github.com/sindresorhus/type-fest/blob/e02f228f6391bb2b26c32a55dfe1e3aa2386d515/source/primitive.d.ts
// LiteralCheck & IsStringLiteral:
// https://github.com/sindresorhus/type-fest/blob/e02f228f6391bb2b26c32a55dfe1e3aa2386d515/source/is-literal.d.ts
//
// Licensed: MIT License Copyright (c) Sindre Sorhus <sindresorhus@gmail.com>
// (https://sindresorhus.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};
type UnionToIntersection<Union> =
  // `extends unknown` is always going to be the case and is used to convert the
  // `Union` into a [distributive conditional
  // type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
  (
    Union extends unknown
      ? // The union type is used as the only argument to a function since the union
        // of function arguments is an intersection.
        (distributedUnion: Union) => void
      : // This won't happen.
        never
  ) extends // Infer the `Intersection` type since TypeScript represents the positional
  // arguments of unions of functions as an intersection of the union.
  (mergedIntersection: infer Intersection) => void
    ? // The `& Union` is to allow indexing by the resulting type
      Intersection & Union
    : never;
type IsNever<T> = [T] extends [never] ? true : false;
type LiteralCheck<
  T,
  LiteralType extends
    | null
    | undefined
    | string
    | number
    | boolean
    | symbol
    | bigint,
> =
  IsNever<T> extends false // Must be wider than `never`
    ? [T] extends [LiteralType] // Must be narrower than `LiteralType`
      ? [LiteralType] extends [T] // Cannot be wider than `LiteralType`
        ? false
        : true
      : false
    : false;
type IsStringLiteral<T> = LiteralCheck<T, string>;

export interface RemoteClient {
  decide(
    context: ArcjetContext,
    details: Partial<ArcjetRequestDetails>,
    rules: ArcjetRule[],
  ): Promise<ArcjetDecision>;
  // Call the Arcjet Log Decision API with details of the request and decision
  // made so we can log it.
  report(
    context: ArcjetContext,
    request: Partial<ArcjetRequestDetails>,
    decision: ArcjetDecision,
    rules: ArcjetRule[],
  ): void;
}

export type RemoteClientOptions = {
  transport?: Transport;
  baseUrl?: string;
  timeout?: number;
  sdkStack?: ArcjetStack;
  sdkVersion?: string;
};

const baseUrlAllowed = [
  "https://decide.arcjet.com",
  "https://decide.arcjettest.com",
  "https://decide.arcjet.orb.local:4082",
];

export function defaultBaseUrl() {
  // TODO(#90): Remove this production conditional before 1.0.0
  if (process.env["NODE_ENV"] === "production") {
    // Use ARCJET_BASE_URL if it is set and belongs to our allowlist; otherwise
    // use the hardcoded default.
    if (
      typeof process.env["ARCJET_BASE_URL"] === "string" &&
      baseUrlAllowed.includes(process.env["ARCJET_BASE_URL"])
    ) {
      return process.env["ARCJET_BASE_URL"];
    } else {
      return "https://decide.arcjet.com";
    }
  } else {
    return process.env["ARCJET_BASE_URL"]
      ? process.env["ARCJET_BASE_URL"]
      : "https://decide.arcjet.com";
  }
}

const knownFields = [
  "ip",
  "method",
  "protocol",
  "host",
  "path",
  "headers",
  "body",
  "email",
  "cookies",
  "query",
];

function isUnknownRequestProperty(key: string) {
  return !knownFields.includes(key);
}

function toString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "<unsupported value>";
}

function extraProps<Props extends PlainObject>(
  details: ArcjetRequest<Props>,
): Record<string, string> {
  const extra: Map<string, string> = new Map();
  for (const [key, value] of Object.entries(details)) {
    if (isUnknownRequestProperty(key)) {
      extra.set(key, toString(value));
    }
  }
  return Object.fromEntries(extra.entries());
}

export function createRemoteClient(
  options?: RemoteClientOptions,
): RemoteClient {
  // TODO(#207): Remove this when we can default the transport
  if (typeof options?.transport === "undefined") {
    throw new Error("Transport must be defined");
  }

  // The base URL for the Arcjet API. Will default to the standard production
  // API unless environment variable `ARCJET_BASE_URL` is set.
  // TODO(#207): This is unused until we can default the transport
  const baseUrl = options?.baseUrl ?? defaultBaseUrl();

  // The timeout for the Arcjet API in milliseconds. This is set to a low value
  // in production so calls fail open.
  const timeout =
    options?.timeout ?? (process.env["NODE_ENV"] === "production" ? 500 : 1000);

  const sdkStack = ArcjetStackToProtocol(options?.sdkStack ?? "NODEJS");
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  const client = createPromiseClient(DecideService, options.transport);

  return Object.freeze({
    async decide(
      context: ArcjetContext,
      details: ArcjetRequestDetails,
      rules: ArcjetRule[],
    ): Promise<ArcjetDecision> {
      // Build the request object from the Protobuf generated class.
      const decideRequest = new DecideRequest({
        sdkStack,
        sdkVersion,
        fingerprint: context.fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          headers: Object.fromEntries(details.headers.entries()),
          cookies: details.cookies,
          query: details.query,
          // TODO(#208): Re-add body
          // body: details.body,
          extra: details.extra,
          email: typeof details.email === "string" ? details.email : undefined,
        },
        rules: rules.map(ArcjetRuleToProtocol),
      });

      context.log.debug("Decide request to %s", baseUrl);

      const response = await client.decide(decideRequest, {
        headers: { Authorization: `Bearer ${context.key}` },
        timeoutMs: timeout,
      });

      const decision = ArcjetDecisionFromProtocol(response.decision);

      context.log.debug("Decide response", {
        id: decision.id,
        fingerprint: context.fingerprint,
        path: details.path,
        runtime: runtime(),
        ttl: decision.ttl,
        conclusion: decision.conclusion,
        reason: decision.reason,
        ruleResults: decision.results,
      });

      return decision;
    },

    report(
      context: ArcjetContext,
      details: ArcjetRequestDetails,
      decision: ArcjetDecision,
      rules: ArcjetRule[],
    ): void {
      // Build the request object from the Protobuf generated class.
      const reportRequest = new ReportRequest({
        sdkStack,
        sdkVersion,
        fingerprint: context.fingerprint,
        details: {
          ip: details.ip,
          method: details.method,
          protocol: details.protocol,
          host: details.host,
          path: details.path,
          headers: Object.fromEntries(details.headers.entries()),
          // TODO(#208): Re-add body
          // body: details.body,
          extra: details.extra,
          email: typeof details.email === "string" ? details.email : undefined,
        },
        decision: ArcjetDecisionToProtocol(decision),
        rules: rules.map(ArcjetRuleToProtocol),
        receivedAt: Timestamp.now(),
      });

      context.log.debug("Report request to %s", baseUrl);

      // We use the promise API directly to avoid returning a promise from this function so execution can't be paused with `await`
      client
        .report(reportRequest, {
          headers: { Authorization: `Bearer ${context.key}` },
          timeoutMs: 2_000, // 2 seconds
        })
        .then((response) => {
          context.log.debug("Report response", {
            id: response.decision?.id,
            fingerprint: context.fingerprint,
            path: details.path,
            runtime: runtime(),
            ttl: decision.ttl,
          });
        })
        .catch((err: unknown) => {
          context.log.log(
            "Encountered problem sending report: %s",
            errorMessage(err),
          );
        });
    },
  });
}

/**
 * Represents the runtime that the client is running in. This is used to bring
 * in the appropriate libraries for the runtime e.g. the WASM module.
 */
export enum Runtime {
  /**
   * Running in a Node.js runtime
   */
  Node = "node",
  /**
   * Running in a Node.js runtime without WASM support e.g. Vercel serverless
   * functions
   * @see
   * https://vercel.com/docs/concepts/functions/serverless-functions/runtimes/node-js
   */
  Node_NoWASM = "node_nowasm",
  /**
   * Running in an Edge runtime
   * @see https://edge-runtime.vercel.app/
   * @see https://vercel.com/docs/concepts/functions/edge-functions/edge-runtime
   */
  Edge = "edge",
}

function runtime(): Runtime {
  if (typeof process.env["ARCJET_RUNTIME"] === "string") {
    switch (process.env["ARCJET_RUNTIME"]) {
      case "edge":
        return Runtime.Edge;
      case "node":
        return Runtime.Node;
      case "node_nowasm":
        return Runtime.Node_NoWASM;
      default:
        throw new Error("Unknown ARCJET_RUNTIME specified!");
    }
  } else {
    if (process.env["NEXT_RUNTIME"] === "edge") {
      return Runtime.Edge;
    } else if (process.env["VERCEL"] === "1") {
      return Runtime.Node_NoWASM;
    } else {
      return Runtime.Node;
    }
  }
}

type TokenBucketRateLimitOptions<Characteristics extends readonly string[]> = {
  mode?: ArcjetMode;
  match?: string;
  characteristics?: Characteristics;
  refillRate: number;
  interval: string | number;
  capacity: number;
};

type FixedWindowRateLimitOptions<Characteristics extends readonly string[]> = {
  mode?: ArcjetMode;
  match?: string;
  characteristics?: Characteristics;
  window: string | number;
  max: number;
};

type SlidingWindowRateLimitOptions<Characteristics extends readonly string[]> =
  {
    mode?: ArcjetMode;
    match?: string;
    characteristics?: Characteristics;
    interval: string | number;
    max: number;
  };

/**
 * Bot detection is disabled by default. The `bots` configuration block allows
 * you to enable or disable it and configure additional rules.
 *
 * @link https://docs.arcjet.com/bot-protection
 */
export type BotOptions = {
  mode?: ArcjetMode;
  /**
   * The types of bots to block. Defaults to `block:
   * [ArcjetBotType.Automated]` which blocks requests we are sure are
   * automated. Choose from the list of `ArcjetBotType` values: `Automated`,
   * `LikelyAutomated`, `LikelyNotABot`, `VerifiedBot`.
   */
  block?: ArcjetBotType[];
  /**
   * Additional bot detection rules. This allows you to add or remove rules.
   */
  patterns?: {
    /**
     * You can add additional bot detection rules to the bots configuration
     * block. Each rule is a regular expression that matches the user agent of
     * the bot plus a label to indicate what type of bot this is.
     *
     * @example
     * ```ts
     * patterns: {
     *  add: {
     *   // Adds Googlebot to the list of good bots
     *   "Googlebot\\/": ArcjetBotType.Automated,
     *  },
     * },
     * ```
     */
    add?: { [key: string]: ArcjetBotType };
    /**
     * Arcjet includes a set of default matching rules to detect common bots.
     * You can remove any of these rules by listing them here. See the docs
     * for a list of default rules which can be removed.
     *
     * @link https://docs.arcjet.com/bot-protection
     * @example
     * ```ts
     * patterns: {
     *   remove: [
     *   // Removes the datadog agent from the list of bots so it will be
     *   // considered as ArcjetBotType.LikelyNotABot
     *   "datadog agent"
     *   ],
     * },
     * ```
     */
    remove?: string[];
  };
};

export type EmailOptions = {
  mode?: ArcjetMode;
  block?: ArcjetEmailType[];
  requireTopLevelDomain?: boolean;
  allowDomainLiteral?: boolean;
};

export class ArcjetHeaders extends Headers {
  constructor(
    init?: HeadersInit | Record<string, string | string[] | undefined>,
  ) {
    super();
    if (typeof init !== "undefined") {
      if (isIterable(init)) {
        for (const [key, value] of init) {
          this.append(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(
          init as Record<string, string | string[] | undefined>,
        )) {
          if (typeof value === "undefined") {
            continue;
          }

          if (Array.isArray(value)) {
            for (const singleValue of value) {
              this.append(key, singleValue);
            }
          } else {
            this.append(key, value);
          }
        }
      }
    }
  }
}

const Priority = {
  RateLimit: 1,
  BotDetection: 2,
  EmailValidation: 3,
};

type PlainObject = { [key: string]: unknown };

// Primitives and Products external names for Rules even though they are defined
// the same.
// See ExtraProps below for further explanation on why we define them like this.
export type Primitive<Props extends PlainObject = {}> = ArcjetRule<Props>[];
export type Product<Props extends PlainObject = {}> = ArcjetRule<Props>[];

// User-defined characteristics alter the required props of an ArcjetRequest
// Note: If a user doesn't provide the object literal to our primitives
// directly, we fallback to no required props. They can opt-in by adding the
// `as const` suffix to the characteristics array.
type PropsForCharacteristic<T> =
  IsStringLiteral<T> extends true
    ? T extends
        | "ip.src"
        | "http.host"
        | "http.method"
        | "http.request.uri.path"
        | `http.request.headers["${string}"]`
        | `http.request.cookie["${string}"]`
        | `http.request.uri.args["${string}"]`
      ? {}
      : T extends string
        ? Record<T, string | number | boolean>
        : never
    : {};
// Rules can specify they require specific props on an ArcjetRequest
type PropsForRule<R> = R extends ArcjetRule<infer Props> ? Props : {};
// We theoretically support an arbitrary amount of rule flattening,
// but one level seems to be easiest; however, this puts a constraint of
// the definition of `Product` such that they need to spread each `Primitive`
// they are re-exporting.
export type ExtraProps<Rules> = Rules extends []
  ? {}
  : Rules extends ArcjetRule[][]
    ? UnionToIntersection<PropsForRule<Rules[number][number]>>
    : Rules extends ArcjetRule[]
      ? UnionToIntersection<PropsForRule<Rules[number]>>
      : never;

/**
 * @property {string} ip - The IP address of the client.
 * @property {string} method - The HTTP method of the request.
 * @property {string} protocol - The protocol of the request.
 * @property {string} host - The host of the request.
 * @property {string} path - The path of the request.
 * @property {Headers} headers - The headers of the request.
 * @property {string} cookies - The string representing semicolon-separated Cookies for a request.
 * @property {string} query - The `?`-prefixed string representing the Query for a request. Commonly referred to as a "querystring".
 * @property {string} email - An email address related to the request.
 * @property ...extra - Extra data that might be useful for Arcjet. For example, requested tokens are specified as the `requested` property.
 */
export type ArcjetRequest<Props extends PlainObject> = Simplify<
  {
    [key: string]: unknown;
    ip?: string;
    method?: string;
    protocol?: string;
    host?: string;
    path?: string;
    headers?: Headers | Record<string, string | string[] | undefined>;
    cookies?: string;
    query?: string;
  } & Props
>;

function isLocalRule<Props extends PlainObject>(
  rule: ArcjetRule<Props>,
): rule is ArcjetLocalRule<Props> {
  return (
    "validate" in rule &&
    typeof rule.validate === "function" &&
    "protect" in rule &&
    typeof rule.protect === "function"
  );
}

export function tokenBucket<
  const Characteristics extends readonly string[] = [],
>(
  options?: TokenBucketRateLimitOptions<Characteristics>,
  ...additionalOptions: TokenBucketRateLimitOptions<Characteristics>[]
): Primitive<
  Simplify<
    UnionToIntersection<
      { requested: number } | PropsForCharacteristic<Characteristics[number]>
    >
  >
> {
  const rules: ArcjetTokenBucketRateLimitRule<{ requested: number }>[] = [];

  if (typeof options === "undefined") {
    return rules;
  }

  for (const opt of [options, ...additionalOptions]) {
    const mode = opt.mode === "LIVE" ? "LIVE" : "DRY_RUN";
    const match = opt.match;
    const characteristics = Array.isArray(opt.characteristics)
      ? opt.characteristics
      : undefined;

    const refillRate = opt.refillRate;
    const interval = duration.parse(opt.interval);
    const capacity = opt.capacity;

    rules.push({
      type: "RATE_LIMIT",
      priority: Priority.RateLimit,
      mode,
      match,
      characteristics,
      algorithm: "TOKEN_BUCKET",
      refillRate,
      interval,
      capacity,
    });
  }

  return rules;
}

export function fixedWindow<
  const Characteristics extends readonly string[] = [],
>(
  options?: FixedWindowRateLimitOptions<Characteristics>,
  ...additionalOptions: FixedWindowRateLimitOptions<Characteristics>[]
): Primitive<
  Simplify<UnionToIntersection<PropsForCharacteristic<Characteristics[number]>>>
> {
  const rules: ArcjetFixedWindowRateLimitRule<{}>[] = [];

  if (typeof options === "undefined") {
    return rules;
  }

  for (const opt of [options, ...additionalOptions]) {
    const mode = opt.mode === "LIVE" ? "LIVE" : "DRY_RUN";
    const match = opt.match;
    const characteristics = Array.isArray(opt.characteristics)
      ? opt.characteristics
      : undefined;

    const max = opt.max;
    const window = duration.parse(opt.window);

    rules.push({
      type: "RATE_LIMIT",
      priority: Priority.RateLimit,
      mode,
      match,
      characteristics,
      algorithm: "FIXED_WINDOW",
      max,
      window,
    });
  }

  return rules;
}

// This is currently kept for backwards compatibility but should be removed in
// favor of the fixedWindow primitive.
export function rateLimit<const Characteristics extends readonly string[] = []>(
  options?: FixedWindowRateLimitOptions<Characteristics>,
  ...additionalOptions: FixedWindowRateLimitOptions<Characteristics>[]
): Primitive<
  Simplify<UnionToIntersection<PropsForCharacteristic<Characteristics[number]>>>
> {
  // TODO(#195): We should also have a local rate limit using an in-memory data
  // structure if the environment supports it
  return fixedWindow(options, ...additionalOptions);
}

export function slidingWindow<
  const Characteristics extends readonly string[] = [],
>(
  options?: SlidingWindowRateLimitOptions<Characteristics>,
  ...additionalOptions: SlidingWindowRateLimitOptions<Characteristics>[]
): Primitive<
  Simplify<UnionToIntersection<PropsForCharacteristic<Characteristics[number]>>>
> {
  const rules: ArcjetSlidingWindowRateLimitRule<{}>[] = [];

  if (typeof options === "undefined") {
    return rules;
  }

  for (const opt of [options, ...additionalOptions]) {
    const mode = opt.mode === "LIVE" ? "LIVE" : "DRY_RUN";
    const match = opt.match;
    const characteristics = Array.isArray(opt.characteristics)
      ? opt.characteristics
      : undefined;

    const max = opt.max;
    const interval = duration.parse(opt.interval);

    rules.push({
      type: "RATE_LIMIT",
      priority: Priority.RateLimit,
      mode,
      match,
      characteristics,
      algorithm: "SLIDING_WINDOW",
      max,
      interval,
    });
  }

  return rules;
}

export function validateEmail(
  options?: EmailOptions,
  ...additionalOptions: EmailOptions[]
): Primitive<{ email: string }> {
  const rules: ArcjetEmailRule<{ email: string }>[] = [];

  // Always create at least one EMAIL rule
  for (const opt of [options ?? {}, ...additionalOptions]) {
    const mode = opt.mode === "LIVE" ? "LIVE" : "DRY_RUN";
    // TODO: Filter invalid email types (or error??)
    const block = opt.block ?? [];
    const requireTopLevelDomain = opt.requireTopLevelDomain ?? true;
    const allowDomainLiteral = opt.allowDomainLiteral ?? false;

    const analyzeOpts = {
      requireTopLevelDomain,
      allowDomainLiteral,
    };

    rules.push({
      type: "EMAIL",
      priority: Priority.EmailValidation,
      mode,
      block,
      requireTopLevelDomain,
      allowDomainLiteral,

      validate(
        context: ArcjetContext,
        details: Partial<ArcjetRequestDetails & { email: string }>,
      ): asserts details is ArcjetRequestDetails & { email: string } {
        assert(
          typeof details.email !== "undefined",
          "ValidateEmail requires `email` to be set.",
        );
      },

      async protect(
        context: ArcjetContext,
        { email }: ArcjetRequestDetails & { email: string },
      ): Promise<ArcjetRuleResult> {
        if (await analyze.isValidEmail(email, analyzeOpts)) {
          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetEmailReason({ emailTypes: [] }),
          });
        } else {
          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetEmailReason({
              emailTypes: ["INVALID"],
            }),
          });
        }
      },
    });
  }

  return rules;
}

export function detectBot(
  options?: BotOptions,
  ...additionalOptions: BotOptions[]
): Primitive {
  const rules: ArcjetBotRule<{}>[] = [];

  // Always create at least one BOT rule
  for (const opt of [options ?? {}, ...additionalOptions]) {
    const mode = opt.mode === "LIVE" ? "LIVE" : "DRY_RUN";
    // TODO: Filter invalid bot types (or error??)
    const block = Array.isArray(opt.block)
      ? opt.block
      : [ArcjetBotType.AUTOMATED];
    // TODO: Does this avoid prototype pollution by putting in a Map first?
    const addMap = new Map();
    for (const [key, value] of Object.entries(opt.patterns?.add ?? {})) {
      addMap.set(key, value);
    }
    // TODO(#217): Additional validation on these `patterns` options
    const add = Array.from(addMap.entries());
    const remove = opt.patterns?.remove ?? [];

    rules.push({
      type: "BOT",
      priority: Priority.BotDetection,
      mode,
      block,
      add,
      remove,

      validate(
        context: ArcjetContext,
        details: Partial<ArcjetRequestDetails>,
      ): asserts details is ArcjetRequestDetails {
        assert(
          typeof details.headers !== "undefined",
          "DetectBot requires `headers` to be set.",
        );
      },

      /**
       * Attempts to call the bot detection on the headers.
       */
      async protect(
        context: ArcjetContext,
        { headers }: ArcjetRequestDetails,
      ): Promise<ArcjetRuleResult> {
        const headersKV: Record<string, string> = {};

        for (const [key, value] of headers) {
          headersKV[key] = value;
        }

        const botResult = await analyze.detectBot(
          JSON.stringify(headersKV),
          JSON.stringify(
            Object.fromEntries(
              add.map(([key, botType]) => [
                key,
                ArcjetBotTypeToProtocol(botType),
              ]),
            ),
          ),
          JSON.stringify(remove),
        );

        // If this is a bot and of a type that we want to block, then block!
        if (
          botResult.bot_score !== 0 &&
          block.includes(BotType[botResult.bot_type] as ArcjetBotType)
        ) {
          return new ArcjetRuleResult({
            ttl: 60,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              // TODO: Make the Wasm SDK return string variants
              botType: ArcjetBotTypeFromProtocol(botResult.bot_type),
              botScore: botResult.bot_score,
              userAgentMatch: true,
            }),
          });
        } else {
          return new ArcjetRuleResult({
            ttl: 60,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetBotReason({
              // TODO: Make the Wasm SDK return string variants
              botType: ArcjetBotTypeFromProtocol(botResult.bot_type),
            }),
          });
        }
      },
    });
  }

  return rules;
}

export type ProtectSignupOptions<Characteristics extends string[]> = {
  rateLimit?:
    | SlidingWindowRateLimitOptions<Characteristics>
    | SlidingWindowRateLimitOptions<Characteristics>[];
  bots?: BotOptions | BotOptions[];
  email?: EmailOptions | EmailOptions[];
};

export function protectSignup<const Characteristics extends string[] = []>(
  options?: ProtectSignupOptions<Characteristics>,
): Product<
  Simplify<
    UnionToIntersection<
      { email: string } | PropsForCharacteristic<Characteristics[number]>
    >
  >
> {
  let rateLimitRules: Primitive<{}> = [];
  if (Array.isArray(options?.rateLimit)) {
    rateLimitRules = slidingWindow(...options.rateLimit);
  } else {
    rateLimitRules = slidingWindow(options?.rateLimit);
  }

  let botRules: Primitive<{}> = [];
  if (Array.isArray(options?.bots)) {
    botRules = detectBot(...options.bots);
  } else {
    botRules = detectBot(options?.bots);
  }

  let emailRules: Primitive<{ email: string }> = [];
  if (Array.isArray(options?.email)) {
    emailRules = validateEmail(...options.email);
  } else {
    emailRules = validateEmail(options?.email);
  }

  return [...rateLimitRules, ...botRules, ...emailRules];
}

export interface ArcjetOptions<Rules extends [...(Primitive | Product)[]]> {
  /**
   * The API key to identify the site in Arcjet.
   */
  key: string;
  /**
   * Rules to apply when protecting a request.
   */
  rules: readonly [...Rules];
  /**
   * The client used to make requests to the Arcjet API. This must be set
   * when creating the SDK, such as inside @arcjet/next or mocked in tests.
   */
  client?: RemoteClient;
}

/**
 * The Arcjet client provides a public `protect()` method to
 * make a decision about how a request should be handled.
 */
export interface Arcjet<Props extends PlainObject> {
  get runtime(): Runtime;
  /**
   * Make a decision about how to handle a request. This will analyze the
   * request locally where possible and call the Arcjet decision API.
   *
   * @param {ArcjetRequest} request - Details about the {@link ArcjetRequest} that Arcjet needs to make a decision.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(request: ArcjetRequest<Props>): Promise<ArcjetDecision>;
}

/**
 * Create a new Arcjet client with the specified {@link ArcjetOptions}.
 *
 * @param options {ArcjetOptions} Arcjet configuration options.
 */
export default function arcjet<
  const Rules extends [...(Primitive | Product)[]] = [],
>(options: ArcjetOptions<Rules>): Arcjet<Simplify<ExtraProps<Rules>>> {
  const log = new Logger();

  // We destructure here to make the function signature neat when viewed by consumers
  const { key, rules, client } = options;

  // TODO(#207): Remove this when we can default the transport so client is not required
  // It is currently optional in the options so the Next SDK can override it for the user
  if (typeof client === "undefined") {
    throw new Error("Client is required");
  }

  // A local cache of block decisions. Might be emphemeral per request,
  // depending on the way the runtime works, but it's worth a try.
  // TODO(#132): Support configurable caching
  const blockCache = new Cache<ArcjetReason>();

  const flatSortedRules = rules.flat(1).sort((a, b) => a.priority - b.priority);

  return Object.freeze({
    get runtime() {
      return runtime();
    },
    async protect(
      request: ArcjetRequest<ExtraProps<Rules>>,
    ): Promise<ArcjetDecision> {
      // This goes against the type definition above, but users might call
      // `protect()` with no value and we don't want to crash
      if (typeof request === "undefined") {
        request = {} as typeof request;
      }

      const details: Partial<ArcjetRequestDetails> = Object.freeze({
        ip: request.ip,
        method: request.method,
        protocol: request.protocol,
        host: request.host,
        path: request.path,
        headers: new ArcjetHeaders(request.headers),
        cookies: request.cookies,
        query: request.query,
        // TODO(#208): Re-add body
        // body: request.body,
        extra: extraProps(request),
        email: typeof request.email === "string" ? request.email : undefined,
      });

      log.time("local");

      log.time("fingerprint");
      let ip = "";
      if (typeof details.ip === "string") {
        ip = details.ip;
      }
      if (details.ip === "") {
        log.warn("generateFingerprint: ip is empty");
      }
      const fingerprint = await analyze.generateFingerprint(ip);
      log.debug("fingerprint (%s): %s", runtime(), fingerprint);
      log.timeEnd("fingerprint");

      const context: ArcjetContext = { key, fingerprint, log };

      if (flatSortedRules.length > 10) {
        log.error("Failure running rules. Only 10 rules may be specified.");

        const decision = new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason("Only 10 rules may be specified"),
          // No results because the sorted rules were too long and we don't want
          // to instantiate a ton of NOT_RUN results
          results: [],
        });

        client.report(
          context,
          details,
          decision,
          // No rules because we've determined they were too long and we don't
          // want to try to send them to the server
          [],
        );

        return decision;
      }

      const results: ArcjetRuleResult[] = [];
      // Default all rules to NOT_RUN/ALLOW before doing anything
      for (let idx = 0; idx < flatSortedRules.length; idx++) {
        results[idx] = new ArcjetRuleResult({
          ttl: 0,
          state: "NOT_RUN",
          conclusion: "ALLOW",
          reason: new ArcjetReason(),
        });
      }

      // We have our own local cache which we check first. This doesn't work in
      // serverless environments where every request is isolated, but there may be
      // some instances where the instance is not recycled immediately. If so, we
      // can take advantage of that.
      log.time("cache");
      const existingBlockReason = blockCache.get(fingerprint);
      log.timeEnd("cache");

      // If already blocked then we can async log to the API and return the
      // decision immediately.
      if (existingBlockReason) {
        log.timeEnd("local");
        log.debug("decide: alreadyBlocked", {
          fingerprint,
          existingBlockReason,
        });
        const decision = new ArcjetDenyDecision({
          ttl: blockCache.ttl(fingerprint),
          reason: existingBlockReason,
          // All results will be NOT_RUN because we used a cached decision
          results,
        });

        client.report(context, details, decision, flatSortedRules);

        log.debug("decide: already blocked", {
          id: decision.id,
          conclusion: decision.conclusion,
          fingerprint,
          reason: existingBlockReason,
          runtime: runtime(),
        });

        return decision;
      }

      for (const [idx, rule] of flatSortedRules.entries()) {
        // This re-assignment is a workaround to a TypeScript error with
        // assertions where the name was introduced via a destructure
        let localRule: ArcjetLocalRule;
        if (isLocalRule(rule)) {
          localRule = rule;
        } else {
          continue;
        }

        log.time(rule.type);

        try {
          localRule.validate(context, details);
          results[idx] = await localRule.protect(context, details);

          log.debug("Local rule result:", {
            id: results[idx].ruleId,
            rule: rule.type,
            fingerprint,
            path: details.path,
            runtime: runtime(),
            ttl: results[idx].ttl,
            conclusion: results[idx].conclusion,
            reason: results[idx].reason,
          });
        } catch (err) {
          log.error(
            "Failure running rule: %s due to %s",
            rule.type,
            errorMessage(err),
          );

          results[idx] = new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ERROR",
            reason: new ArcjetErrorReason(err),
          });
        }

        log.timeEnd(rule.type);

        if (results[idx].isDenied()) {
          log.timeEnd("local");

          const decision = new ArcjetDenyDecision({
            ttl: results[idx].ttl,
            reason: results[idx].reason,
            results,
          });

          // Only a DENY decision is reported to avoid creating 2 entries for a
          // request. Upon ALLOW, the `decide` call will create an entry for the
          // request.
          client.report(context, details, decision, flatSortedRules);

          // If we're not in DRY_RUN mode, we want to cache non-zero TTL results
          // and return this DENY decision.
          if (rule.mode !== "DRY_RUN") {
            if (results[idx].ttl > 0) {
              log.debug("Caching decision for %d seconds", decision.ttl, {
                fingerprint,
                conclusion: decision.conclusion,
                reason: decision.reason,
              });

              blockCache.set(
                fingerprint,
                decision.reason,
                nowInSeconds() + decision.ttl,
              );
            }

            return decision;
          }

          log.warn(
            `Dry run mode is enabled for "%s" rule. Overriding decision. Decision was: %s`,
            rule.type,
            decision.conclusion,
          );
        }
      }

      log.timeEnd("local");
      log.time("remote");

      // With no cached values, we take a decision remotely. We use a timeout to
      // fail open.
      try {
        log.time("decideApi");
        const decision = await client.decide(context, details, flatSortedRules);
        log.timeEnd("decideApi");

        // If the decision is to block and we have a non-zero TTL, we cache the
        // block locally
        if (decision.isDenied() && decision.ttl > 0) {
          log.debug(
            "decide: Caching block locally for %d seconds",
            decision.ttl,
          );

          blockCache.set(
            fingerprint,
            decision.reason,
            nowInSeconds() + decision.ttl,
          );
        }

        return decision;
      } catch (err) {
        log.error(
          "Encountered problem getting remote decision: %s",
          errorMessage(err),
        );
        const decision = new ArcjetErrorDecision({
          ttl: 0,
          reason: new ArcjetErrorReason(err),
          results,
        });

        client.report(
          { key, fingerprint, log },
          details,
          decision,
          flatSortedRules,
        );

        return decision;
      } finally {
        log.timeEnd("remote");
      }
    },
  });
}
