import type {
  ArcjetContext,
  ArcjetEmailRule,
  ArcjetBotRule,
  ArcjetRule,
  ArcjetMode,
  ArcjetRequestDetails,
  ArcjetTokenBucketRateLimitRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetSlidingWindowRateLimitRule,
  ArcjetShieldRule,
  ArcjetLogger,
  ArcjetSensitiveInfoRule,
  ArcjetIdentifiedEntity,
  ArcjetWellKnownBot,
  ArcjetBotCategory,
  ArcjetEmailType,
  ArcjetSensitiveInfoType,
  ArcjetRateLimitRule,
} from "@arcjet/protocol";
import {
  ArcjetBotReason,
  ArcjetEmailReason,
  ArcjetErrorReason,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetSensitiveInfoReason,
  ArcjetDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
  ArcjetShieldReason,
  ArcjetRateLimitReason,
  ArcjetConclusion,
} from "@arcjet/protocol";
import type { Client } from "@arcjet/protocol/client.js";
import * as analyze from "@arcjet/analyze";
import type {
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
  BotConfig,
  EmailValidationConfig,
} from "@arcjet/analyze";
import * as duration from "@arcjet/duration";
import ArcjetHeaders from "@arcjet/headers";
import { runtime } from "@arcjet/runtime";
import * as hasher from "@arcjet/stable-hash";
import { MemoryCache } from "@arcjet/cache";

export * from "@arcjet/protocol";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
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

/**
 * List of known fields.
 */
const knownRequestProperties = [
  "body",
  "cookies",
  "email",
  "headers",
  "host",
  "ip",
  "method",
  "path",
  "protocol",
  "query",
] as const;

/**
 * Type of known fields.
 */
type KnownRequestProperty = (typeof knownRequestProperties)[number];

/**
 * Check that a (`string`) property key is a known request property.
 *
 * @param key
 *   Key.
 * @returns
 *   Whether `key` is a known field.
 */
function isKnownRequestProperty(key: string): key is KnownRequestProperty {
  const properties = knownRequestProperties as readonly string[];
  return properties.includes(key);
}

/**
 * Check that a value is a known email type.
 *
 * @param value
 *   Value.
 * @returns
 *   Whether `value` is a known email type.
 */
function isEmailType(value: string): value is ArcjetEmailType {
  return (
    value === "DISPOSABLE" ||
    value === "FREE" ||
    value === "INVALID" ||
    value === "NO_GRAVATAR" ||
    value === "NO_MX_RECORDS"
  );
}

class Performance {
  log: ArcjetLogger;

  constructor(logger: ArcjetLogger) {
    this.log = logger;
  }

  // TODO(#2020): We should no-op this if loglevel is not `debug` to do less work
  measure(label: string) {
    const start = performance.now();
    return () => {
      const end = performance.now();
      const diff = end - start;
      this.log.debug("LATENCY %s: %sms", label, diff.toFixed(3));
    };
  }
}

// This is the Symbol that Vercel defines in their infrastructure to access the
// Context (where available). The Context can contain the `waitUntil` function.
// https://github.com/vercel/vercel/blob/930d7fb892dc26f240f2b950d963931c45e1e661/packages/functions/src/get-context.ts#L6
const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");

type WaitUntil = (promise: Promise<unknown>) => void;

function lookupWaitUntil(): WaitUntil | undefined {
  const fromSymbol: typeof globalThis & {
    [SYMBOL_FOR_REQ_CONTEXT]?: unknown;
  } = globalThis;
  if (
    typeof fromSymbol[SYMBOL_FOR_REQ_CONTEXT] === "object" &&
    fromSymbol[SYMBOL_FOR_REQ_CONTEXT] !== null &&
    "get" in fromSymbol[SYMBOL_FOR_REQ_CONTEXT] &&
    typeof fromSymbol[SYMBOL_FOR_REQ_CONTEXT].get === "function"
  ) {
    const vercelCtx = fromSymbol[SYMBOL_FOR_REQ_CONTEXT].get();
    if (
      typeof vercelCtx === "object" &&
      vercelCtx !== null &&
      "waitUntil" in vercelCtx &&
      typeof vercelCtx.waitUntil === "function"
    ) {
      return vercelCtx.waitUntil;
    }
  }
}

/**
 * Get the unknown request properties.
 *
 * @param properties
 *   Raw properties.
 * @returns
 *   Extra properties.
 */
function unknownRequestProperties(
  properties: Record<string, unknown>,
): Record<string, string> {
  const extra: Map<string, string> = new Map();

  // We only support the basic primitives.
  for (const [key, value] of Object.entries(properties)) {
    if (!isKnownRequestProperty(key)) {
      extra.set(
        key,
        typeof value === "boolean" ||
          typeof value === "number" ||
          typeof value === "string"
          ? String(value)
          : "<unsupported value>",
      );
    }
  }

  return Object.fromEntries(extra.entries());
}

type Validator = (key: string, value: unknown) => void;

type ValidationSchema = {
  key: string;
  required: boolean;
  validate: Validator;
};

function createTypeValidator(
  ...types: Array<
    // These are the types we can compare via `typeof`
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function"
  >
): Validator {
  return (key, value) => {
    const typeOfValue = typeof value;
    if (!types.includes(typeOfValue)) {
      if (types.length === 1) {
        throw new Error(`invalid type for \`${key}\` - expected ${types[0]}`);
      } else {
        throw new Error(
          `invalid type for \`${key}\` - expected one of ${types.join(", ")}`,
        );
      }
    } else {
      return false;
    }
  };
}

function createValueValidator(
  // This uses types to ensure we have at least 2 values
  ...values: [string, string, ...string[]]
): Validator {
  return (key, value) => {
    // We cast the values to unknown because the optionValue isn't known but
    // we only want to use `values` on string enumerations
    if (!(values as unknown[]).includes(value)) {
      throw new Error(
        `invalid value for \`${key}\` - expected one of ${values.map((value) => `'${value}'`).join(", ")}`,
      );
    }
  };
}

function createArrayValidator(validate: Validator): Validator {
  return (key, value) => {
    if (Array.isArray(value)) {
      for (const [idx, item] of value.entries()) {
        validate(`${key}[${idx}]`, item);
      }
    } else {
      throw new Error(`invalid type for \`${key}\` - expected an array`);
    }
  };
}

function createValidator({
  rule,
  validations,
}: {
  rule: string;
  validations: ValidationSchema[];
}) {
  return (options: Record<string, unknown>) => {
    for (const { key, validate, required } of validations) {
      if (required && !Object.hasOwn(options, key)) {
        throw new Error(`\`${rule}\` options error: \`${key}\` is required`);
      }

      const value = options[key];

      // The `required` flag is checked above, so these should only be validated
      // if the value is not undefined.
      if (typeof value !== "undefined") {
        try {
          validate(key, value);
        } catch (err) {
          throw new Error(`\`${rule}\` options error: ${errorMessage(err)}`);
        }
      }
    }
  };
}

const validateString = createTypeValidator("string");
const validateNumber = createTypeValidator("number");
const validateBoolean = createTypeValidator("boolean");
const validateFunction = createTypeValidator("function");
const validateStringOrNumber = createTypeValidator("string", "number");
const validateStringArray = createArrayValidator(validateString);
const validateMode = createValueValidator("LIVE", "DRY_RUN");
const validateEmailTypes = createArrayValidator(
  createValueValidator(
    "DISPOSABLE",
    "FREE",
    "NO_MX_RECORDS",
    "NO_GRAVATAR",
    "INVALID",
  ),
);

const validateTokenBucketOptions = createValidator({
  rule: "tokenBucket",
  validations: [
    {
      key: "mode",
      required: false,
      validate: validateMode,
    },
    {
      key: "characteristics",
      validate: validateStringArray,
      required: false,
    },
    { key: "refillRate", required: true, validate: validateNumber },
    { key: "interval", required: true, validate: validateStringOrNumber },
    { key: "capacity", required: true, validate: validateNumber },
  ],
});

const validateFixedWindowOptions = createValidator({
  rule: "fixedWindow",
  validations: [
    { key: "mode", required: false, validate: validateMode },
    {
      key: "characteristics",
      validate: validateStringArray,
      required: false,
    },
    { key: "max", required: true, validate: validateNumber },
    { key: "window", required: true, validate: validateStringOrNumber },
  ],
});

const validateSlidingWindowOptions = createValidator({
  rule: "slidingWindow",
  validations: [
    { key: "mode", required: false, validate: validateMode },
    {
      key: "characteristics",
      validate: validateStringArray,
      required: false,
    },
    { key: "max", required: true, validate: validateNumber },
    { key: "interval", required: true, validate: validateStringOrNumber },
  ],
});

const validateSensitiveInfoOptions = createValidator({
  rule: "sensitiveInfo",
  validations: [
    { key: "mode", required: false, validate: validateMode },
    { key: "allow", required: false, validate: validateStringArray },
    { key: "deny", required: false, validate: validateStringArray },
    { key: "contextWindowSize", required: false, validate: validateNumber },
    { key: "detect", required: false, validate: validateFunction },
  ],
});

const validateEmailOptions = createValidator({
  rule: "validateEmail",
  validations: [
    { key: "mode", required: false, validate: validateMode },
    { key: "block", required: false, validate: validateEmailTypes },
    { key: "allow", required: false, validate: validateEmailTypes },
    { key: "deny", required: false, validate: validateEmailTypes },
    {
      key: "requireTopLevelDomain",
      required: false,
      validate: validateBoolean,
    },
    { key: "allowDomainLiteral", required: false, validate: validateBoolean },
  ],
});

const validateBotOptions = createValidator({
  rule: "detectBot",
  validations: [
    { key: "mode", required: false, validate: validateMode },
    { key: "allow", required: false, validate: validateStringArray },
    { key: "deny", required: false, validate: validateStringArray },
  ],
});

const validateShieldOptions = createValidator({
  rule: "shield",
  validations: [{ key: "mode", required: false, validate: validateMode }],
});

export type TokenBucketRateLimitOptions<Characteristic extends string> = {
  mode?: ArcjetMode;
  characteristics?: ReadonlyArray<Characteristic>;
  refillRate: number;
  interval: string | number;
  capacity: number;
};

export type FixedWindowRateLimitOptions<Characteristic extends string> = {
  mode?: ArcjetMode;
  characteristics?: ReadonlyArray<Characteristic>;
  window: string | number;
  max: number;
};

export type SlidingWindowRateLimitOptions<Characteristic extends string> = {
  mode?: ArcjetMode;
  characteristics?: ReadonlyArray<Characteristic>;
  interval: string | number;
  max: number;
};

export type BotOptionsAllow = {
  mode?: ArcjetMode;
  allow: Array<ArcjetWellKnownBot | ArcjetBotCategory>;
  deny?: never;
};

export type BotOptionsDeny = {
  mode?: ArcjetMode;
  allow?: never;
  deny: Array<ArcjetWellKnownBot | ArcjetBotCategory>;
};

export type BotOptions = BotOptionsAllow | BotOptionsDeny;

export type EmailOptionsAllow = {
  mode?: ArcjetMode;
  allow: ArcjetEmailType[];
  block?: never;
  deny?: never;
  requireTopLevelDomain?: boolean;
  allowDomainLiteral?: boolean;
};

export type EmailOptionsDeny = {
  mode?: ArcjetMode;
  allow?: never;
  block?: never;
  deny: ArcjetEmailType[];
  requireTopLevelDomain?: boolean;
  allowDomainLiteral?: boolean;
};

type EmailOptionsBlock = {
  mode?: ArcjetMode;
  allow?: never;
  /** @deprecated use `deny` instead */
  block: ArcjetEmailType[];
  deny?: never;
  requireTopLevelDomain?: boolean;
  allowDomainLiteral?: boolean;
};

export type EmailOptions =
  | EmailOptionsAllow
  | EmailOptionsDeny
  | EmailOptionsBlock;

type DetectSensitiveInfoEntities<T> = (
  tokens: string[],
) => Array<ArcjetSensitiveInfoType | T | undefined>;

type ValidEntities<Detect> = Array<
  // Via https://www.reddit.com/r/typescript/comments/17up72w/comment/k958cb0/
  // Conditional types distribute over unions. If you have ((string | undefined)
  // extends undefined ? 1 : 0) it is evaluated separately for each member of
  // the union, then union-ed together again. The result is (string extends
  // undefined ? 1 : 0) | (undefined extends undefined ? 1 : 0) which simplifies
  // to 0 | 1
  undefined extends Detect
    ? ArcjetSensitiveInfoType
    : Detect extends DetectSensitiveInfoEntities<infer CustomEntities>
      ? ArcjetSensitiveInfoType | CustomEntities
      : never
>;

export type SensitiveInfoOptionsAllow<Detect> = {
  allow: ValidEntities<Detect>;
  deny?: never;
  contextWindowSize?: number;
  mode?: ArcjetMode;
  detect?: Detect;
};

export type SensitiveInfoOptionsDeny<Detect> = {
  allow?: never;
  deny: ValidEntities<Detect>;
  contextWindowSize?: number;
  mode?: ArcjetMode;
  detect?: Detect;
};

export type SensitiveInfoOptions<Detect> =
  | SensitiveInfoOptionsAllow<Detect>
  | SensitiveInfoOptionsDeny<Detect>;

const Priority = {
  SensitiveInfo: 1,
  Shield: 2,
  RateLimit: 3,
  BotDetection: 4,
  EmailValidation: 5,
};

/**
 * @deprecated
 *   Please use `[ArcjetRule<Props>]` or `ArcjetRule<Props>[]` directly.
 */
export type Primitive<Props extends Record<string, unknown> = {}> = [
  ArcjetRule<Props>,
];

/**
 * @deprecated
 *   Please use `ArcjetRule<Props>[]` directly.
 */
export type Product<Props extends Record<string, unknown> = {}> =
  ArcjetRule<Props>[];

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
export type CharacteristicProps<Characteristic extends string> =
  UnionToIntersection<PropsForCharacteristic<Characteristic>>;
// Rules can specify they require specific props on an ArcjetRequest
type PropsForRule<R> = R extends ArcjetRule<infer Props> ? Props : {};

/**
 * @deprecated
 *   Please use `T extends ArcjetRule<infer P> ? P : {}` directly.
 */
export type ExtraProps<T> = T extends ArcjetRule[]
  ? UnionToIntersection<PropsForRule<T[number]>>
  : T extends ArcjetRule
    ? UnionToIntersection<PropsForRule<T>>
    : never;

/**
 * Additional context that can be provided by adapters.
 *
 * Among other things, this could include the Arcjet API Key if it were only
 * available in a runtime handler or IP details provided by a platform.
 */
export type ArcjetAdapterContext = {
  [key: string]: unknown;
  getBody(): Promise<string | undefined>;
  waitUntil?: (promise: Promise<unknown>) => void;
};

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
export type ArcjetRequest<Props extends Record<string, unknown>> = Props & {
  ip?: string;
  method?: string;
  protocol?: string;
  host?: string;
  path?: string;
  headers?: Headers | Record<string, string | string[] | undefined>;
  cookies?: string;
  query?: string;
};

type CachedResult = {
  conclusion: ArcjetConclusion;
  reason: ArcjetReason;
};

function isRateLimitRule<Props extends Record<string, unknown>>(
  rule: ArcjetRule<Props>,
): rule is ArcjetRateLimitRule<Props> {
  return rule.type === "RATE_LIMIT";
}

/**
 * Arcjet token bucket rate limiting rule. Applying this rule sets a token
 * bucket rate limit.
 *
 * This algorithm is based on a bucket filled with a specific number of tokens.
 * Each request withdraws some amount of tokens from the bucket and the bucket
 * is refilled at a fixed rate. Once the bucket is empty, the client is blocked
 * until the bucket refills.
 *
 * This algorithm is useful when you want to allow clients to make a burst of
 * requests and then still be able to make requests at a slower rate.
 *
 * @param {TokenBucketRateLimitOptions} options - The options for the token
 * bucket rate limiting rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block requests when the rate limit is
 * exceeded, and `"DRY_RUN"` will allow all requests while still providing
 * access to the rule results. Defaults to `"DRY_RUN"` if not specified.
 * @param {number} options.refillRate - The number of tokens to add to the
 * bucket at each interval. For example, if you set the interval to 60 and the
 * refill rate to 10, the bucket will refill 10 tokens every 60 seconds.
 * @param {string | number} options.interval - The time interval for the refill
 * rate. This can be a string like `"60s"` for 60 seconds, `"1h45m"` for 1 hour
 * and 45 minutes, or a number like `60` for 60 seconds. Valid string time units
 * are:
 * - `s` for seconds.
 * - `m` for minutes.
 * - `h` for hours.
 * - `d` for days.
 * @param {number} options.capacity - The maximum number of tokens the bucket
 * can hold. The bucket starts at full capacity and will refill until it hits
 * the capacity.
 * @returns {[ArcjetRule<{}>]} The token bucket rule to provide to the SDK in the
 * `rules` option.
 *
 * @example
 * ```ts
 * tokenBucket({ mode: "LIVE", refillRate: 10, interval: "60s", capacity: 100 });
 * ```
 * @example
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     tokenBucket({
 *       mode: "LIVE",
 *       refillRate: 10,
 *       interval: "60s",
 *       capacity: 100,
 *     })
 *   ],
 * });
 * ```
 * @link https://docs.arcjet.com/rate-limiting/concepts
 * @link https://docs.arcjet.com/rate-limiting/algorithms#token-bucket
 * @link https://docs.arcjet.com/rate-limiting/reference
 */
export function tokenBucket<const Characteristic extends string = string>(
  options: TokenBucketRateLimitOptions<Characteristic>,
): [
  ArcjetRule<
    UnionToIntersection<
      { requested: number } | CharacteristicProps<Characteristic>
    >
  >,
] {
  validateTokenBucketOptions(options);

  const type = "RATE_LIMIT";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const characteristics = Array.isArray(options.characteristics)
    ? options.characteristics
    : undefined;

  const refillRate = options.refillRate;
  const interval = duration.parse(options.interval);
  const capacity = options.capacity;

  const rule: ArcjetTokenBucketRateLimitRule<
    UnionToIntersection<
      { requested: number } | CharacteristicProps<Characteristic>
    >
  > = {
    type,
    version,
    priority: Priority.RateLimit,
    mode,
    characteristics,
    algorithm: "TOKEN_BUCKET",
    refillRate,
    interval,
    capacity,
    validate() {},
    async protect(context: ArcjetContext<CachedResult>, details) {
      const localCharacteristics = characteristics ?? context.characteristics;

      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.string("algorithm", "TOKEN_BUCKET"),
        hasher.stringSliceOrdered("characteristics", localCharacteristics),
        // Match is deprecated so it is always an empty string in the newest SDKs
        hasher.string("match", ""),
        hasher.uint32("refillRate", refillRate),
        hasher.uint32("interval", interval),
        hasher.uint32("capacity", capacity),
      );

      const analyzeContext = {
        characteristics: localCharacteristics,
        log: context.log,
      };

      const fingerprint = await analyze.generateFingerprint(analyzeContext, {
        ...details,
        headers: Object.fromEntries(details.headers),
      });

      const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
      if (cached && cached.reason.isRateLimit()) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl,
          state: "CACHED",
          conclusion: cached.conclusion,
          // We rebuild the `ArcjetRateLimitReason` because we need to adjust
          // the `reset` based on the current time-to-live
          reason: new ArcjetRateLimitReason({
            max: cached.reason.max,
            remaining: cached.reason.remaining,
            reset: ttl,
            window: cached.reason.window,
            resetTime: cached.reason.resetTime,
          }),
        });
      }

      return new ArcjetRuleResult({
        ruleId,
        fingerprint,
        ttl: 0,
        state: "NOT_RUN",
        conclusion: "ALLOW",
        reason: new ArcjetRateLimitReason({
          max: 0,
          remaining: 0,
          reset: 0,
          window: 0,
          resetTime: new Date(),
        }),
      });
    },
  };

  return [rule];
}

/**
 * Arcjet fixed window rate limiting rule. Applying this rule sets a fixed
 * window rate limit which tracks the number of requests made by a client over a
 * fixed time window.
 *
 * This is the simplest algorithm. It tracks the number of requests made by a
 * client over a fixed time window e.g. 60 seconds. If the client exceeds the
 * limit, they are blocked until the window expires.
 *
 * This algorithm is useful when you want to apply a simple fixed limit in a
 * fixed time window. For example, a simple limit on the total number of
 * requests a client can make. However, it can be susceptible to the stampede
 * problem where a client makes a burst of requests at the start of a window and
 * then is blocked for the rest of the window. The sliding window algorithm can
 * be used to avoid this.
 *
 * @param {FixedWindowRateLimitOptions} options - The options for the fixed
 * window rate limiting rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block requests when the rate limit is
 * exceeded, and `"DRY_RUN"` will allow all requests while still providing
 * access to the rule results. Defaults to `"DRY_RUN"` if not specified.
 * @param {string | number} options.window - The fixed time window. This can be
 * a string like `"60s"` for 60 seconds, `"1h45m"` for 1 hour and 45 minutes, or
 * a number like `60` for 60 seconds. Valid string time units are:
 * - `s` for seconds.
 * - `m` for minutes.
 * - `h` for hours.
 * - `d` for days.
 * @param {number} options.max - The maximum number of requests allowed in the
 * fixed time window.
 * @returns {[ArcjetRule<{}>]} The fixed window rule to provide to the SDK in the
 * `rules` option.
 *
 * @example
 * ```ts
 * fixedWindow({ mode: "LIVE", window: "60s", max: 100 });
 * ```
 * @example
 * ```ts
 * const aj = arcjet({
 *    key: process.env.ARCJET_KEY,
 *   rules: [
 *     fixedWindow({
 *       mode: "LIVE",
 *       window: "60s",
 *       max: 100,
 *     })
 *   ],
 * });
 * ```
 * @link https://docs.arcjet.com/rate-limiting/concepts
 * @link https://docs.arcjet.com/rate-limiting/algorithms#fixed-window
 * @link https://docs.arcjet.com/rate-limiting/reference
 */
export function fixedWindow<const Characteristic extends string = string>(
  options: FixedWindowRateLimitOptions<Characteristic>,
): [ArcjetRule<CharacteristicProps<Characteristic>>] {
  validateFixedWindowOptions(options);

  const type = "RATE_LIMIT";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const characteristics = Array.isArray(options.characteristics)
    ? options.characteristics
    : undefined;

  const max = options.max;
  const window = duration.parse(options.window);

  const rule: ArcjetFixedWindowRateLimitRule<{}> = {
    type,
    version,
    priority: Priority.RateLimit,
    mode,
    characteristics,
    algorithm: "FIXED_WINDOW",
    max,
    window,
    validate() {},
    async protect(context: ArcjetContext<CachedResult>, details) {
      const localCharacteristics = characteristics ?? context.characteristics;

      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.string("algorithm", "FIXED_WINDOW"),
        hasher.stringSliceOrdered("characteristics", localCharacteristics),
        // Match is deprecated so it is always an empty string in the newest SDKs
        hasher.string("match", ""),
        hasher.uint32("max", max),
        hasher.uint32("window", window),
      );

      const analyzeContext = {
        characteristics: localCharacteristics,
        log: context.log,
      };

      const fingerprint = await analyze.generateFingerprint(analyzeContext, {
        ...details,
        headers: Object.fromEntries(details.headers),
      });

      const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
      if (cached && cached.reason.isRateLimit()) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl,
          state: "CACHED",
          conclusion: cached.conclusion,
          // We rebuild the `ArcjetRateLimitReason` because we need to adjust
          // the `reset` based on the current time-to-live
          reason: new ArcjetRateLimitReason({
            max: cached.reason.max,
            remaining: cached.reason.remaining,
            reset: ttl,
            window: cached.reason.window,
            resetTime: cached.reason.resetTime,
          }),
        });
      }

      return new ArcjetRuleResult({
        ruleId,
        fingerprint,
        ttl: 0,
        state: "NOT_RUN",
        conclusion: "ALLOW",
        reason: new ArcjetRateLimitReason({
          max: 0,
          remaining: 0,
          reset: 0,
          window: 0,
        }),
      });
    },
  };

  return [rule];
}

/**
 * Arcjet sliding window rate limiting rule. Applying this rule sets a sliding
 * window rate limit which tracks the number of requests made by a client over a
 * sliding window so that the window moves with time.
 *
 * This algorithm is useful to avoid the stampede problem of the fixed window.
 * It provides smoother rate limiting over time and can prevent a client from
 * making a burst of requests at the start of a window and then being blocked
 * for the rest of the window.
 *
 * @param {SlidingWindowRateLimitOptions} options - The options for the sliding
 * window rate limiting rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block requests when the rate limit is
 * exceeded, and `"DRY_RUN"` will allow all requests while still providing
 * access to the rule results. Defaults to `"DRY_RUN"` if not specified.
 * @param {string | number} options.interval - The time interval for the rate
 * limit. This can be a string like `"60s"` for 60 seconds, `"1h45m"` for 1 hour
 * and 45 minutes, or a number like `60` for 60 seconds. Valid string time units
 * are:
 * - `s` for seconds.
 * - `m` for minutes.
 * - `h` for hours.
 * - `d` for days.
 * @param {number} options.max - The maximum number of requests allowed in the
 * sliding time window.
 * @returns {[ArcjetRule<{}>]} The sliding window rule to provide to the SDK in the
 * `rules` option.
 *
 * @example
 * ```ts
 * slidingWindow({ mode: "LIVE", interval: "60s", max: 100 });
 * ```
 * @example
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     slidingWindow({
 *       mode: "LIVE",
 *       interval: "60s",
 *       max: 100,
 *     })
 *   ],
 * });
 * ```
 * @link https://docs.arcjet.com/rate-limiting/concepts
 * @link https://docs.arcjet.com/rate-limiting/algorithms#sliding-window
 * @link https://docs.arcjet.com/rate-limiting/reference
 */
export function slidingWindow<const Characteristic extends string = string>(
  options: SlidingWindowRateLimitOptions<Characteristic>,
): [ArcjetRule<CharacteristicProps<Characteristic>>] {
  validateSlidingWindowOptions(options);

  const type = "RATE_LIMIT";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const characteristics = Array.isArray(options.characteristics)
    ? options.characteristics
    : undefined;

  const max = options.max;
  const interval = duration.parse(options.interval);

  const rule: ArcjetSlidingWindowRateLimitRule<{}> = {
    type,
    version,
    priority: Priority.RateLimit,
    mode,
    characteristics,
    algorithm: "SLIDING_WINDOW",
    max,
    interval,
    validate() {},
    async protect(context: ArcjetContext<CachedResult>, details) {
      const localCharacteristics = characteristics ?? context.characteristics;

      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.string("algorithm", "SLIDING_WINDOW"),
        hasher.stringSliceOrdered("characteristics", localCharacteristics),
        // Match is deprecated so it is always an empty string in the newest SDKs
        hasher.string("match", ""),
        hasher.uint32("max", max),
        hasher.uint32("interval", interval),
      );

      const analyzeContext = {
        characteristics: localCharacteristics,
        log: context.log,
      };

      const fingerprint = await analyze.generateFingerprint(analyzeContext, {
        ...details,
        headers: Object.fromEntries(details.headers),
      });

      const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
      if (cached && cached.reason.isRateLimit()) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl,
          state: "CACHED",
          conclusion: cached.conclusion,
          // We rebuild the `ArcjetRateLimitReason` because we need to adjust
          // the `reset` based on the current time-to-live
          reason: new ArcjetRateLimitReason({
            max: cached.reason.max,
            remaining: cached.reason.remaining,
            reset: ttl,
            window: cached.reason.window,
            resetTime: cached.reason.resetTime,
          }),
        });
      }

      return new ArcjetRuleResult({
        ruleId,
        fingerprint,
        ttl: 0,
        state: "NOT_RUN",
        conclusion: "ALLOW",
        reason: new ArcjetRateLimitReason({
          max: 0,
          remaining: 0,
          reset: 0,
          window: 0,
        }),
      });
    },
  };

  return [rule];
}

function protocolSensitiveInfoEntitiesToAnalyze<Custom extends string>(
  entity: ArcjetSensitiveInfoType | Custom,
) {
  if (typeof entity !== "string") {
    throw new Error("invalid entity type");
  }

  if (entity === "EMAIL") {
    return { tag: "email" as const };
  }

  if (entity === "PHONE_NUMBER") {
    return { tag: "phone-number" as const };
  }

  if (entity === "IP_ADDRESS") {
    return { tag: "ip-address" as const };
  }

  if (entity === "CREDIT_CARD_NUMBER") {
    return { tag: "credit-card-number" as const };
  }

  return {
    tag: "custom" as const,
    val: entity,
  };
}

function analyzeSensitiveInfoEntitiesToString(
  entity: SensitiveInfoEntity,
): string {
  if (entity.tag === "email") {
    return "EMAIL";
  }

  if (entity.tag === "ip-address") {
    return "IP_ADDRESS";
  }

  if (entity.tag === "credit-card-number") {
    return "CREDIT_CARD_NUMBER";
  }

  if (entity.tag === "phone-number") {
    return "PHONE_NUMBER";
  }

  return entity.val;
}

function convertAnalyzeDetectedSensitiveInfoEntity(
  detectedEntities: DetectedSensitiveInfoEntity[],
): ArcjetIdentifiedEntity[] {
  return detectedEntities.map((detectedEntity) => {
    return {
      ...detectedEntity,
      identifiedType: analyzeSensitiveInfoEntitiesToString(
        detectedEntity.identifiedType,
      ),
    };
  });
}

/**
 * Arcjet sensitive information detection rule. Applying this rule protects
 * against clients sending you sensitive information such as personally
 * identifiable information (PII) that you do not wish to handle. The rule runs
 * entirely locally so no data ever leaves your environment.
 *
 * This rule includes built-in detections for email addresses, credit/debit card
 * numbers, IP addresses, and phone numbers. You can also provide a custom
 * detection function to identify additional sensitive information.
 *
 * @param {SensitiveInfoOptions} options - The options for the sensitive
 * information detection rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block requests when any of the
 * configured sensitive information types are detected, and `"DRY_RUN"` will
 * allow all requests while still providing access to the rule results. Defaults
 * to `"DRY_RUN"` if not specified.
 * @param {Array<ArcjetSensitiveInfoType>} options.deny - The list of sensitive
 * information types to deny. If provided, the sensitive information types in
 * this list will be denied. You may only provide either `allow` or `deny`, not
 * both. Specify one or more of the following:
 *
 * - `"EMAIL"`
 * - `"PHONE_NUMBER"`
 * - `"IP_ADDRESS"`
 * - `"CREDIT_CARD_NUMBER"`
 * @param {Array<ArcjetSensitiveInfoType>} options.allow - The list of sensitive
 * information types to allow. If provided, types in this list will be allowed
 * and all others will be denied. You may only provide either `allow` or `deny`,
 * not both. The same options apply as for `deny`.
 * @param {DetectSensitiveInfoEntities} options.detect - A custom detection
 * function. The function will take a list of tokens and must return a list of
 * either `undefined`, if the corresponding token in the input list is not
 * sensitive, or the name of the entity if it does match. The number of tokens
 * that are provided to the function is controlled by the `contextWindowSize`
 * option, which defaults to `1`. If you need additional context to perform
 * detections then you can increase this value.
 * @param {number} options.contextWindowSize - The number of tokens to provide
 * to the custom detection function. This defaults to 1 if not specified.
 * @returns {[ArcjetRule<{}>]} The sensitive information rule to provide to the SDK in
 * the `rules` option.
 *
 * @example
 * ```ts
 * sensitiveInfo({ mode: "LIVE", deny: ["EMAIL"] });
 * ```
 * @example
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     sensitiveInfo({
 *       mode: "LIVE",
 *       deny: ["EMAIL"],
 *     })
 *   ],
 * });
 * ```
 * @example
 * Custom detection function:
 * ```ts
 * function detectDash(tokens: string[]): Array<"CONTAINS_DASH" | undefined> {
 *   return tokens.map((token) => {
 *     if (token.includes("-")) {
 *       return "CONTAINS_DASH";
 *     }
 *   });
 * }
 *
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     sensitiveInfo({
 *       mode: "LIVE",
 *       deny: ["EMAIL", "CONTAINS_DASH"],
 *       detect: detectDash,
 *       contextWindowSize: 2,
 *     })
 *   ],
 * });
 * ```
 * @link https://docs.arcjet.com/sensitive-info/concepts
 * @link https://docs.arcjet.com/sensitive-info/reference
 */
export function sensitiveInfo<
  const Detect extends DetectSensitiveInfoEntities<CustomEntities> | undefined,
  const CustomEntities extends string,
>(
  options: SensitiveInfoOptions<Detect>,
): [ArcjetRule<CharacteristicProps<string>>] {
  validateSensitiveInfoOptions(options);

  if (
    typeof options.allow !== "undefined" &&
    typeof options.deny !== "undefined"
  ) {
    throw new Error(
      "`sensitiveInfo` options error: `allow` and `deny` cannot be provided together",
    );
  }
  if (
    typeof options.allow === "undefined" &&
    typeof options.deny === "undefined"
  ) {
    throw new Error(
      "`sensitiveInfo` options error: either `allow` or `deny` must be specified",
    );
  }

  const type = "SENSITIVE_INFO";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const allow = options.allow || [];
  const deny = options.deny || [];

  const rule: ArcjetSensitiveInfoRule<{}> = {
    version,
    priority: Priority.SensitiveInfo,
    type,
    mode,
    allow,
    deny,

    validate(
      context: ArcjetContext,
      details: ArcjetRequestDetails,
    ): asserts details is ArcjetRequestDetails {},

    async protect(
      context: ArcjetContext<CachedResult>,
      details: ArcjetRequestDetails,
    ): Promise<ArcjetRuleResult> {
      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.stringSliceOrdered("allow", allow),
        hasher.stringSliceOrdered("deny", deny),
      );

      const { fingerprint } = context;

      // No cache is implemented here because the fingerprint can be the same
      // while the request body changes. This is also why the `sensitiveInfo`
      // rule results always have a `ttl` of 0.

      const body = await context.getBody();
      if (typeof body === "undefined") {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 0,
          state: "NOT_RUN",
          conclusion: "ERROR",
          reason: new ArcjetErrorReason(
            "Couldn't read the body of the request to perform sensitive info identification.",
          ),
        });
      }

      let convertedDetect = undefined;
      if (typeof options.detect !== "undefined") {
        const detect = options.detect;
        convertedDetect = (tokens: string[]) => {
          return detect(tokens)
            .filter((e) => typeof e !== "undefined")
            .map(protocolSensitiveInfoEntitiesToAnalyze);
        };
      }

      let entitiesTag: "allow" | "deny" = "allow";
      let entitiesVal: Array<
        ReturnType<typeof protocolSensitiveInfoEntitiesToAnalyze>
      > = [];

      if (Array.isArray(options.allow)) {
        entitiesTag = "allow";
        entitiesVal = options.allow
          .filter((e) => typeof e !== "undefined")
          .map(protocolSensitiveInfoEntitiesToAnalyze);
      }

      if (Array.isArray(options.deny)) {
        entitiesTag = "deny";
        entitiesVal = options.deny
          .filter((e) => typeof e !== "undefined")
          .map(protocolSensitiveInfoEntitiesToAnalyze);
      }

      const entities = {
        tag: entitiesTag,
        val: entitiesVal,
      };

      const result = await analyze.detectSensitiveInfo(
        context,
        body,
        entities,
        options.contextWindowSize || 1,
        convertedDetect,
      );

      const state = mode === "LIVE" ? "RUN" : "DRY_RUN";

      const reason = new ArcjetSensitiveInfoReason({
        denied: convertAnalyzeDetectedSensitiveInfoEntity(result.denied),
        allowed: convertAnalyzeDetectedSensitiveInfoEntity(result.allowed),
      });

      if (result.denied.length === 0) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 0,
          state,
          conclusion: "ALLOW",
          reason,
        });
      } else {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 0,
          state,
          conclusion: "DENY",
          reason,
        });
      }
    },
  };

  return [rule];
}

/**
 * Arcjet email validation rule. Applying this rule allows you to validate &
 * verify an email address.
 *
 * The first step of the analysis is to validate the email address syntax. This
 * runs locally within the SDK and validates the email address is in the correct
 * format. If the email syntax is valid, the SDK will pass the email address to
 * the Arcjet cloud API to verify the email address. This performs several
 * checks, depending on the rule configuration.
 *
 * @param {EmailOptions} options - The options for the email validation rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block email addresses based on the
 * configuration, and `"DRY_RUN"` will allow all requests while still providing
 * access to the rule results. Defaults to `"DRY_RUN"` if not specified.
 * @param {Array<ArcjetEmailType>} options.deny - The list of email types to
 * deny. If provided, the email types in this list will be denied. You may only
 * provide either `allow` or `deny`, not both. Specify one or more of the
 * following:
 *
 * - `"DISPOSABLE"` - Disposable email addresses.
 * - `"FREE"` - Free email addresses.
 * - `"NO_MX_RECORDS"` - Email addresses with no MX records.
 * - `"NO_GRAVATAR"` - Email addresses with no Gravatar.
 * - `"INVALID"` - Invalid email addresses.
 *
 * @param {Array<ArcjetEmailType>} options.allow - The list of email types to
 * allow. If provided, email addresses in this list will be allowed and all
 * others will be denied. You may only provide either `allow` or `deny`, not
 * both. The same options apply as for `deny`.
 * @returns {[ArcjetRule<{}>]} The email rule to provide to the SDK in the `rules`
 * option.
 *
 * @example
 * ```ts
 * validateEmail({ mode: "LIVE", deny: ["DISPOSABLE", "INVALID"] });
 * ```
 * @example
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     validateEmail({
 *       mode: "LIVE",
 *       deny: ["DISPOSABLE", "INVALID"]
 *     })
 *   ],
 * });
 * ```
 * @link https://docs.arcjet.com/email-validation/concepts
 * @link https://docs.arcjet.com/email-validation/reference
 */
export function validateEmail(
  options: EmailOptions,
): [ArcjetRule<{ email?: string | undefined }>] {
  validateEmailOptions(options);

  if (
    typeof options.allow !== "undefined" &&
    typeof options.deny !== "undefined"
  ) {
    throw new Error(
      "`validateEmail` options error: `allow` and `deny` cannot be provided together",
    );
  }
  if (
    typeof options.allow !== "undefined" &&
    typeof options.block !== "undefined"
  ) {
    throw new Error(
      "`validateEmail` options error: `allow` and `block` cannot be provided together",
    );
  }
  if (
    typeof options.deny !== "undefined" &&
    typeof options.block !== "undefined"
  ) {
    throw new Error(
      "`validateEmail` options error: `deny` and `block` cannot be provided together, `block` is now deprecated so `deny` should be preferred.",
    );
  }
  if (
    typeof options.allow === "undefined" &&
    typeof options.deny === "undefined" &&
    typeof options.block === "undefined"
  ) {
    throw new Error(
      "`validateEmail` options error: either `allow` or `deny` must be specified",
    );
  }

  const type = "EMAIL";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const allow = options.allow ?? [];
  const deny = options.deny ?? options.block ?? [];
  const requireTopLevelDomain = options.requireTopLevelDomain ?? true;
  const allowDomainLiteral = options.allowDomainLiteral ?? false;

  let config: EmailValidationConfig = {
    tag: "deny-email-validation-config",
    val: {
      requireTopLevelDomain,
      allowDomainLiteral,
      deny: [],
    },
  };

  if (typeof options.allow !== "undefined") {
    config = {
      tag: "allow-email-validation-config",
      val: {
        requireTopLevelDomain,
        allowDomainLiteral,
        allow: options.allow,
      },
    };
  }

  if (typeof options.deny !== "undefined") {
    config = {
      tag: "deny-email-validation-config",
      val: {
        requireTopLevelDomain,
        allowDomainLiteral,
        deny: options.deny,
      },
    };
  }

  if (typeof options.block !== "undefined") {
    config = {
      tag: "deny-email-validation-config",
      val: {
        requireTopLevelDomain,
        allowDomainLiteral,
        deny: options.block,
      },
    };
  }

  const rule: ArcjetEmailRule<{ email: string }> = {
    version,
    priority: Priority.EmailValidation,

    type,
    mode,
    allow,
    deny,
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
      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.stringSliceOrdered("allow", allow),
        hasher.stringSliceOrdered("deny", deny),
        hasher.bool("requireTopLevelDomain", requireTopLevelDomain),
        hasher.bool("allowDomainLiteral", allowDomainLiteral),
      );

      const { fingerprint } = context;

      // No cache is implemented here because the fingerprint can be the same
      // while the email changes. This is also why the `email` rule results
      // always have a `ttl` of 0.

      const result = await analyze.isValidEmail(context, email, config);
      const state = mode === "LIVE" ? "RUN" : "DRY_RUN";
      if (result.validity === "valid") {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 0,
          state,
          conclusion: "ALLOW",
          reason: new ArcjetEmailReason({ emailTypes: [] }),
        });
      } else {
        const typedEmailTypes = result.blocked.filter(isEmailType);

        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 0,
          state,
          conclusion: "DENY",
          reason: new ArcjetEmailReason({
            emailTypes: typedEmailTypes,
          }),
        });
      }
    },
  };

  return [rule];
}

/**
 * Arcjet bot detection rule. Applying this rule allows you to manage traffic by
 * automated clients and bots.
 *
 * Bots can be good (such as search engine crawlers or monitoring agents) or bad
 * (such as scrapers or automated scripts). Arcjet allows you to configure which
 * bots you want to allow or deny by specific bot names e.g. curl, as well as by
 * category e.g. search engine bots.
 *
 * Bots are detected based on various signals such as the user agent, IP
 * address, DNS records, and more.
 *
 * @param {BotOptions} options - The options for the bot rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block detected bots, and `"DRY_RUN"`
 * will allow all requests while still providing access to the rule results.
 * Defaults to `"DRY_RUN"` if not specified.
 * @param {Array<ArcjetWellKnownBot | ArcjetBotCategory>} options.allow - The
 * list of bots to allow. If provided, only the bots in this list will be
 * allowed and any other detected bot will be denied. If empty, all bots will be
 * denied. You may only provide either `allow` or `deny`, not both. You can use
 * specific bots e.g. `"CURL"` will allow the default user-agent of the `curl`
 * tool. You can also use categories e.g. `"CATEGORY:SEARCH_ENGINE"` will allow
 * all search engine bots. See
 * https://docs.arcjet.com/bot-protection/identifying-bots for the full list of
 * bots and categories.
 * @param {Array<ArcjetWellKnownBot | ArcjetBotCategory>} options.deny - The
 * list of bots to deny. If provided, the bots in this list will be denied and
 * all other detected bots will be allowed. You may only provide either `allow`
 * or `deny`, not both. The same options apply as for `allow`.
 * @returns {[ArcjetRule<{}>]} The bot rule to provide to the SDK in the `rules`
 * option.
 *
 * @example
 * Allows search engine bots and curl, denies all other bots
 *
 * ```ts
 * detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE", "CURL"] });
 * ```
 * @example
 * Allows search engine bots and curl, denies all other bots
 *
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     detectBot({
 *       mode: "LIVE",
 *       allow: ["CATEGORY:SEARCH_ENGINE", "CURL"]
 *     })
 *   ],
 * });
 * ```
 * @example
 * Denies AI crawlers, allows all other bots
 *
 * ```ts
 * detectBot({ mode: "LIVE", deny: ["CATEGORY:AI"] });
 * ```
 * @example
 * Denies AI crawlers, allows all other bots
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *     detectBot({
 *       mode: "LIVE",
 *       deny: ["CATEGORY:AI"]
 *     })
 *   ],
 * });
 * ```
 * @link https://docs.arcjet.com/bot-protection/concepts
 * @link https://docs.arcjet.com/bot-protection/identifying-bots
 * @link https://docs.arcjet.com/bot-protection/reference
 */
export function detectBot(options: BotOptions): [ArcjetRule<{}>] {
  validateBotOptions(options);

  if (
    typeof options.allow !== "undefined" &&
    typeof options.deny !== "undefined"
  ) {
    throw new Error(
      "`detectBot` options error: `allow` and `deny` cannot be provided together",
    );
  }
  if (
    typeof options.allow === "undefined" &&
    typeof options.deny === "undefined"
  ) {
    throw new Error(
      "`detectBot` options error: either `allow` or `deny` must be specified",
    );
  }

  const type = "BOT";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const allow = options.allow ?? [];
  const deny = options.deny ?? [];

  let config: BotConfig = {
    tag: "allowed-bot-config",
    val: {
      entities: [],
      skipCustomDetect: true,
    },
  };
  if (typeof options.allow !== "undefined") {
    config = {
      tag: "allowed-bot-config",
      val: {
        entities: options.allow,
        skipCustomDetect: true,
      },
    };
  }

  if (typeof options.deny !== "undefined") {
    config = {
      tag: "denied-bot-config",
      val: {
        entities: options.deny,
        skipCustomDetect: true,
      },
    };
  }

  const rule: ArcjetBotRule<{}> = {
    version,
    priority: Priority.BotDetection,

    type,
    mode,
    allow,
    deny,

    validate(
      context: ArcjetContext,
      details: Partial<ArcjetRequestDetails>,
    ): asserts details is ArcjetRequestDetails {
      if (typeof details.headers === "undefined") {
        throw new Error("bot detection requires `headers` to be set");
      }
      if (typeof details.headers.has !== "function") {
        throw new Error("bot detection requires `headers` to extend `Headers`");
      }
      if (!details.headers.has("user-agent")) {
        throw new Error("bot detection requires user-agent header");
      }
    },

    /**
     * Attempts to call the bot detection on the headers.
     */
    async protect(
      context: ArcjetContext<CachedResult>,
      request: ArcjetRequestDetails,
    ): Promise<ArcjetRuleResult> {
      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.stringSliceOrdered("allow", allow),
        hasher.stringSliceOrdered("deny", deny),
      );

      const { fingerprint } = context;

      const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
      if (cached) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl,
          state: "CACHED",
          conclusion: cached.conclusion,
          reason: cached.reason,
        });
      }

      const result = await analyze.detectBot(
        context,
        { ...request, headers: Object.fromEntries(request.headers) },
        config,
      );

      const state = mode === "LIVE" ? "RUN" : "DRY_RUN";

      // If this is a bot and of a type that we want to block, then block!
      if (result.denied.length > 0) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 60,
          state,
          conclusion: "DENY",
          reason: new ArcjetBotReason({
            allowed: result.allowed,
            denied: result.denied,
            verified: result.verified,
            spoofed: result.spoofed,
          }),
        });
      } else {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl: 0,
          state,
          conclusion: "ALLOW",
          reason: new ArcjetBotReason({
            allowed: result.allowed,
            denied: result.denied,
            verified: result.verified,
            spoofed: result.spoofed,
          }),
        });
      }
    },
  };

  return [rule];
}

export type ShieldOptions = {
  mode?: ArcjetMode;
};

/**
 * Arcjet Shield WAF rule. Applying this rule protects your application against
 * common attacks, including the OWASP Top 10.
 *
 * The Arcjet Shield WAF analyzes every request to your application to detect
 * suspicious activity. Once a certain suspicion threshold is reached,
 * subsequent requests from that client are blocked for a period of time.
 *
 * @param {ShieldOptions} options - The options for the Shield rule.
 * @param {ArcjetMode} options.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block suspicious requests, and
 * `"DRY_RUN"` will allow all requests while still providing access to the rule
 * results. Defaults to `"DRY_RUN"` if not specified.
 * @returns {[ArcjetRule<{}>]} The Shield rule to provide to the SDK in the `rules`
 * option.
 *
 * @example
 * ```ts
 * shield({ mode: "LIVE" });
 * ```
 * @example
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [shield({ mode: "LIVE" })],
 * });
 * ```
 * @link https://docs.arcjet.com/shield/concepts
 * @link https://docs.arcjet.com/shield/reference
 */
export function shield(options: ShieldOptions): [ArcjetRule<{}>] {
  validateShieldOptions(options);

  const type = "SHIELD";
  const version = 0;
  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";

  const rule: ArcjetShieldRule<{}> = {
    type,
    version,
    priority: Priority.Shield,
    mode,
    validate() {},
    async protect(context: ArcjetContext<CachedResult>, details) {
      // TODO(#1989): Prefer characteristics defined on rule once available
      const localCharacteristics = context.characteristics;

      const ruleId = await hasher.hash(
        hasher.string("type", type),
        hasher.uint32("version", version),
        hasher.string("mode", mode),
        hasher.stringSliceOrdered("characteristics", localCharacteristics),
      );

      const analyzeContext = {
        characteristics: localCharacteristics,
        log: context.log,
      };

      const fingerprint = await analyze.generateFingerprint(analyzeContext, {
        ...details,
        headers: Object.fromEntries(details.headers),
      });

      const [cached, ttl] = await context.cache.get(ruleId, fingerprint);
      if (cached) {
        return new ArcjetRuleResult({
          ruleId,
          fingerprint,
          ttl,
          state: "CACHED",
          conclusion: cached.conclusion,
          reason: cached.reason,
        });
      }

      return new ArcjetRuleResult({
        ruleId,
        fingerprint,
        ttl: 0,
        state: "NOT_RUN",
        conclusion: "ALLOW",
        reason: new ArcjetShieldReason({
          shieldTriggered: false,
        }),
      });
    },
  };

  return [rule];
}

export type ProtectSignupOptions<Characteristic extends string> = {
  rateLimit: SlidingWindowRateLimitOptions<Characteristic>;
  bots: BotOptions;
  email: EmailOptions;
};

/**
 * Arcjet signup form protection rule. Applying this rule combines rate
 * limiting, bot protection, and email validation to protect your signup forms
 * from abuse. Using this rule will configure the following:
 *
 * - Rate limiting - signup forms are a common target for bots. Arcjet’s rate
 *   limiting helps to prevent bots and other automated or malicious clients
 *   from submitting your signup form too many times in a short period of time.
 * - Bot protection - signup forms are usually exclusively used by humans, which
 *   means that any automated submissions to the form are likely to be
 *   fraudulent.
 * - Email validation - email addresses should be validated to ensure the signup
 *   is coming from a legitimate user with a real email address that can
 *   actually receive messages.
 *
 * @param {ProtectSignupOptions} options - The options for the signup form
 * protection rule.
 * @param {ArcjetMode} options.email.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block email addresses based on the
 * configuration, and `"DRY_RUN"` will allow all requests while still providing
 * access to the rule results. Defaults to `"DRY_RUN"` if not specified.
 * @param {Array<ArcjetEmailType>} options.email.deny - The list of email types
 * to deny. If provided, the email types in this list will be denied. You may
 * only provide either `allow` or `deny`, not both. Specify one or more of the
 * following:
 *
 * - `"DISPOSABLE"` - Disposable email addresses.
 * - `"FREE"` - Free email addresses.
 * - `"NO_MX_RECORDS"` - Email addresses with no MX records.
 * - `"NO_GRAVATAR"` - Email addresses with no Gravatar.
 * - `"INVALID"` - Invalid email addresses.
 *
 * @param {Array<ArcjetEmailType>} options.email.allow - The list of email types
 * to allow. If provided, email addresses in this list will be allowed and all
 * others will be denied. You may only provide either `allow` or `deny`, not
 * both. The same options apply as for `deny`.
 * @param {ArcjetMode} options.bots.mode - The block mode of the rule, either
 * `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block detected bots, and `"DRY_RUN"`
 * will allow all requests while still providing access to the rule results.
 * Defaults to `"DRY_RUN"` if not specified.
 * @param {Array<ArcjetWellKnownBot | ArcjetBotCategory>} options.bots.allow -
 * The list of bots to allow. If provided, only the bots in this list will be
 * allowed and any other detected bot will be denied. If empty, all bots will be
 * denied. You may only provide either `allow` or `deny`, not both. You can use
 * specific bots e.g. `"CURL"` will allow the default user-agent of the `curl`
 * tool. You can also use categories e.g. `"CATEGORY:SEARCH_ENGINE"` will allow
 * all search engine bots. See
 * https://docs.arcjet.com/bot-protection/identifying-bots for the full list of
 * bots and categories.
 * @param {Array<ArcjetWellKnownBot | ArcjetBotCategory>} options.bots.deny -
 * The list of bots to deny. If provided, the bots in this list will be denied
 * and all other detected bots will be allowed. You may only provide either
 * `allow` or `deny`, not both. The same options apply as for `allow`.
 * @param {SlidingWindowRateLimitOptions} options.rateLimit - The options for
 * the sliding window rate limiting rule.
 * @param {ArcjetMode} options.rateLimit.mode - The block mode of the rule,
 * either `"LIVE"` or `"DRY_RUN"`. `"LIVE"` will block requests when the rate
 * limit is exceeded, and `"DRY_RUN"` will allow all requests while still
 * providing access to the rule results. Defaults to `"DRY_RUN"` if not
 * specified.
 * @param {string | number} options.rateLimit.interval - The time interval for
 * the rate limit. This can be a string like `"60s"` for 60 seconds, `"1h45m"`
 * for 1 hour and 45 minutes, or a number like `60` for 60 seconds. Valid string
 * time units are:
 * - `s` for seconds.
 * - `m` for minutes.
 * - `h` for hours.
 * - `d` for days.
 * @param {number} options.rateLimit.max - The maximum number of requests
 * allowed in the sliding time window.
 * @returns {[ArcjetRule<{}>]} The signup form protection rule to provide to the SDK in
 * the `rules` option.
 *
 * @example
 * Our recommended configuration for most signup forms is:
 *
 * - Block emails with invalid syntax, that are from disposable email providers,
 *   or do not have valid MX records configured.
 * - Block all bots.
 * - Apply a rate limit of 5 submissions per 10 minutes from a single IP
 *   address.
 *
 * ```ts
 * const aj = arcjet({
 *   key: process.env.ARCJET_KEY,
 *   rules: [
 *    protectSignup({
 *      email: {
 *        mode: "LIVE",
 *        block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
 *      },
 *      bots: {
 *        mode: "LIVE",
 *        allow: [], // block all detected bots
 *      },
 *      rateLimit: {
 *        mode: "LIVE",
 *        interval: "10m",
 *        max: 5,
 *      },
 *    }),
 *  ],
 * });
 * ```
 * @link https://docs.arcjet.com/signup-protection/concepts
 * @link https://docs.arcjet.com/signup-protection/reference
 */
export function protectSignup<Characteristic extends string = string>(
  options: ProtectSignupOptions<Characteristic>,
): Array<
  ArcjetRule<
    UnionToIntersection<{ email: string } | CharacteristicProps<Characteristic>>
  >
> {
  return [
    ...slidingWindow(options.rateLimit),
    ...detectBot(options.bots),
    ...validateEmail(options.email),
  ];
}

export interface ArcjetOptions<
  Rule extends ArcjetRule<{}>,
  Characteristics extends string,
> {
  /**
   * The API key to identify the site in Arcjet.
   */
  key: string;
  /**
   * Rules to apply when protecting a request.
   */
  rules: ReadonlyArray<ReadonlyArray<Rule>>;
  /**
   * Characteristics to be used to uniquely identify clients.
   */
  characteristics?: ReadonlyArray<Characteristics>;
  /**
   * The client used to make requests to the Arcjet API. This must be set
   * when creating the SDK, such as inside @arcjet/next or mocked in tests.
   */
  client?: Client;
  /**
   * The logger used to emit useful information from the SDK.
   */
  log?: ArcjetLogger;
}

/**
 * The Arcjet client provides a public `protect()` method to
 * make a decision about how a request should be handled.
 */
export interface Arcjet<Props extends Record<string, unknown>> {
  /**
   * Make a decision about how to handle a request. This will analyze the
   * request locally where possible and call the Arcjet decision API.
   *
   * @param {ArcjetAdapterContext} ctx - Additional context for this function call.
   * @param {ArcjetRequest} request - Details about the {@link ArcjetRequest} that Arcjet needs to make a decision.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(
    ctx: ArcjetAdapterContext,
    request: ArcjetRequest<Props>,
  ): Promise<ArcjetDecision>;

  /**
   * Augments the client with another rule. Useful for varying rules based on
   * criteria in your handler—e.g. different rate limit for logged in users.
   *
   * @param rule The rule to add to this execution.
   * @returns An augmented {@link Arcjet} client.
   */
  withRule<Rule extends ArcjetRule<{}>>(
    rules: ReadonlyArray<Rule>,
  ): Arcjet<Props & UnionToIntersection<PropsForRule<Rule>>>;
}

/**
 * Create a new Arcjet client with the specified {@link ArcjetOptions}.
 *
 * @param options {ArcjetOptions} Arcjet configuration options.
 */
export default function arcjet<
  const Rule extends ArcjetRule<{}>,
  const Characteristic extends string,
>(
  options: ArcjetOptions<Rule, Characteristic>,
): Arcjet<
  UnionToIntersection<PropsForRule<Array<Rule>>> &
    CharacteristicProps<Characteristic>
> {
  // We destructure here to make the function signature neat when viewed by consumers
  const { key, rules } = options;

  const rt = runtime();

  // TODO: Separate the ArcjetOptions from the SDK Options
  // It is currently optional in the options so users can override it via an SDK
  if (typeof options.log === "undefined") {
    throw new Error("Log is required");
  }
  const log = options.log;

  const perf = new Performance(log);

  // TODO(#207): Remove this when we can default the transport so client is not required
  // It is currently optional in the options so the Next SDK can override it for the user
  if (typeof options.client === "undefined") {
    throw new Error("Client is required");
  }
  const client = options.client;

  // A local cache of block decisions. Might be emphemeral per request,
  // depending on the way the runtime works, but it's worth a try.
  // TODO(#132): Support configurable caching
  const cache = new MemoryCache<CachedResult>();

  const rootRules: ArcjetRule[] = rules
    .flat(1)
    .sort((a, b) => a.priority - b.priority);

  async function protect<Props extends Record<string, unknown>>(
    rules: ArcjetRule[],
    ctx: ArcjetAdapterContext,
    request: ArcjetRequest<Props>,
  ) {
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
      extra: unknownRequestProperties(request),
      email: typeof request.email === "string" ? request.email : undefined,
    });

    const characteristics = options.characteristics
      ? [...options.characteristics]
      : [];

    const waitUntil = lookupWaitUntil();

    const baseContext = {
      key,
      log,
      characteristics,
      waitUntil,
      ...ctx,
    };

    let fingerprint = "";

    const logFingerprintPerf = perf.measure("fingerprint");
    try {
      fingerprint = await analyze.generateFingerprint(baseContext, {
        ...details,
        headers: details.headers ? Object.fromEntries(details.headers) : {},
      });
      log.debug("fingerprint (%s): %s", rt, fingerprint);
    } catch (error) {
      log.error(
        { error },
        "Failed to build fingerprint. Please verify your Characteristics.",
      );

      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason(
          `Failed to build fingerprint - ${errorMessage(error)}`,
        ),
        // No results because we couldn't create a fingerprint
        results: [],
      });

      // TODO: Consider sending this to Report when we have an infallible fingerprint

      return decision;
    } finally {
      logFingerprintPerf();
    }

    const context: ArcjetContext = Object.freeze({
      ...baseContext,
      cache,
      fingerprint,
      runtime: rt,
    });

    if (rules.length < 1) {
      log.warn(
        "Calling `protect()` with no rules is deprecated. Did you mean to configure the Shield rule?",
      );
    }

    if (rules.length > 10) {
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
    for (let idx = 0; idx < rules.length; idx++) {
      // Default all rules to NOT_RUN/ALLOW before doing anything
      results[idx] = new ArcjetRuleResult({
        // TODO(#4030): Figure out if we can get each Rule ID before they are run
        ruleId: "",
        fingerprint,
        ttl: 0,
        state: "NOT_RUN",
        conclusion: "ALLOW",
        reason: new ArcjetReason(),
      });

      // Add top-level characteristics to all Rate Limit rules that don't already have
      // their own set of characteristics.
      const candidate_rule = rules[idx];
      if (isRateLimitRule(candidate_rule)) {
        if (typeof candidate_rule.characteristics === "undefined") {
          candidate_rule.characteristics = characteristics;
          rules[idx] = candidate_rule;
        }
      }
    }

    const logLocalPerf = perf.measure("local");
    try {
      for (const [idx, rule] of rules.entries()) {
        // This re-assignment is a workaround to a TypeScript error with
        // assertions where the name was introduced via a destructure
        const localRule: ArcjetRule = rule;

        const logRulePerf = perf.measure(rule.type);
        try {
          if (typeof localRule.validate !== "function") {
            throw new Error("rule must have a `validate` function");
          }
          localRule.validate(context, details);

          if (typeof localRule.protect !== "function") {
            throw new Error("rule must have a `protect` function");
          }
          results[idx] = await localRule.protect(context, details);

          // If a rule didn't return a rule result, we need to stub it to avoid
          // crashing. This should only happen if a user writes a custom local
          // rule incorrectly.
          if (typeof results[idx] === "undefined") {
            results[idx] = new ArcjetRuleResult({
              // TODO(#4030): If we can get the Rule ID before running rules,
              // this can use it
              ruleId: "",
              fingerprint,
              ttl: 0,
              state: "RUN",
              conclusion: "ERROR",
              reason: new ArcjetErrorReason("rule result missing"),
            });
          }

          log.debug(
            {
              id: results[idx].ruleId,
              rule: rule.type,
              fingerprint,
              path: details.path,
              runtime: rt,
              ttl: results[idx].ttl,
              conclusion: results[idx].conclusion,
              reason: results[idx].reason,
            },
            "Local rule result:",
          );
        } catch (err) {
          log.error(
            "Failure running rule: %s due to %s",
            rule.type,
            errorMessage(err),
          );

          results[idx] = new ArcjetRuleResult({
            // TODO(#4030): Figure out if we can get a Rule ID in this error case
            ruleId: "",
            fingerprint,
            ttl: 0,
            state: "RUN",
            conclusion: "ERROR",
            reason: new ArcjetErrorReason(err),
          });
        } finally {
          logRulePerf();
        }

        const result = results[idx];

        if (result.isDenied()) {
          // If the rule is not a DRY_RUN, we want to cache non-zero TTL results
          // and return a DENY decision.
          if (result.state !== "DRY_RUN") {
            const decision = new ArcjetDenyDecision({
              ttl: result.ttl,
              reason: result.reason,
              results,
            });

            // Only a DENY decision is reported to avoid creating 2 entries for
            // a request. Upon ALLOW, the `decide` call will create an entry for
            // the request.
            client.report(context, details, decision, rules);

            if (result.ttl > 0) {
              log.debug(
                {
                  fingerprint: result.fingerprint,
                  conclusion: result.conclusion,
                  reason: result.reason,
                },
                "Caching decision for %d seconds",
                decision.ttl,
              );

              cache.set(
                result.ruleId,
                result.fingerprint,
                {
                  conclusion: result.conclusion,
                  reason: result.reason,
                },
                result.ttl,
              );
            }

            return decision;
          }

          log.warn(
            `Dry run mode is enabled for "%s" rule. Overriding decision. Decision was: DENY`,
            rule.type,
          );
        }
      }
    } finally {
      logLocalPerf();
    }

    // With no cached values, we take a decision remotely. We use a timeout to
    // fail open.
    const logRemotePerf = perf.measure("remote");
    try {
      const logDediceApiPerf = perf.measure("decideApi");
      const decision = await client
        .decide(context, details, rules)
        .finally(() => {
          logDediceApiPerf();
        });

      // If the decision is to block and we have a non-zero TTL, we cache the
      // block locally
      if (decision.isDenied() && decision.ttl > 0) {
        log.debug("decide: Caching block locally for %d seconds", decision.ttl);

        for (const result of decision.results) {
          // Cache all DENY results for local cache lookups
          if (result.conclusion === "DENY") {
            cache.set(
              result.ruleId,
              result.fingerprint,
              {
                conclusion: result.conclusion,
                reason: result.reason,
              },
              result.ttl,
            );
          }
        }
      }

      return decision;
    } catch (err) {
      log.info(
        "Encountered problem getting remote decision: %s",
        errorMessage(err),
      );
      const decision = new ArcjetErrorDecision({
        ttl: 0,
        reason: new ArcjetErrorReason(err),
        results,
      });

      client.report(context, details, decision, rules);

      return decision;
    } finally {
      logRemotePerf();
    }
  }

  // This is a separate function so it can be called recursively
  function withRule<Rule extends ArcjetRule<{}>>(
    baseRules: ReadonlyArray<ArcjetRule>,
    rules: ReadonlyArray<Rule>,
  ) {
    const sortedRules = [...baseRules, ...rules].sort(
      (a, b) => a.priority - b.priority,
    );

    return Object.freeze({
      withRule(rules: ReadonlyArray<ArcjetRule<{}>>) {
        return withRule(sortedRules, rules);
      },
      async protect(
        ctx: ArcjetAdapterContext,
        request: ArcjetRequest<{}>,
      ): Promise<ArcjetDecision> {
        return protect(sortedRules, ctx, request);
      },
    });
  }

  return Object.freeze({
    withRule(rules: ReadonlyArray<ArcjetRule<{}>>) {
      return withRule(rootRules, rules);
    },
    async protect(
      ctx: ArcjetAdapterContext,
      request: ArcjetRequest<{}>,
    ): Promise<ArcjetDecision> {
      return protect(rootRules, ctx, request);
    },
  });
}
