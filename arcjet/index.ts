import type {
  ArcjetContext,
  ArcjetEmailRule,
  ArcjetBotRule,
  ArcjetRule,
  ArcjetLocalRule,
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
} from "@arcjet/protocol";
import {
  ArcjetBotReason,
  ArcjetEmailReason,
  ArcjetEmailType,
  ArcjetErrorReason,
  ArcjetMode,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetSensitiveInfoType,
  ArcjetSensitiveInfoReason,
  ArcjetDecision,
  ArcjetDenyDecision,
  ArcjetErrorDecision,
} from "@arcjet/protocol";
import { isRateLimitRule } from "@arcjet/protocol/convert.js";
import type { Client } from "@arcjet/protocol/client.js";
import * as analyze from "@arcjet/analyze";
import type {
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
  BotConfig,
} from "@arcjet/analyze";
import * as duration from "@arcjet/duration";
import ArcjetHeaders from "@arcjet/headers";
import { runtime } from "@arcjet/runtime";

export * from "@arcjet/protocol";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
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

function isEmailType(type: string): type is ArcjetEmailType {
  return (
    type === "FREE" ||
    type === "DISPOSABLE" ||
    type === "NO_MX_RECORDS" ||
    type === "NO_GRAVATAR" ||
    type === "INVALID"
  );
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

function toAnalyzeRequest(request: Partial<ArcjetRequestDetails>) {
  const headers: Record<string, string> = {};
  if (typeof request.headers !== "undefined") {
    for (const [key, value] of request.headers.entries()) {
      headers[key] = value;
    }
  }

  return {
    ...request,
    headers,
  };
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

function createValueValidator(...values: string[]): Validator {
  return (key, value) => {
    // We cast the values to unknown because the optionValue isn't known but
    // we only want to use `values` on string enumerations
    if (!(values as unknown[]).includes(value)) {
      if (values.length === 1) {
        throw new Error(`invalid value for \`${key}\` - expected ${values[0]}`);
      } else {
        throw new Error(
          `invalid value for \`${key}\` - expected one of ${values.map((value) => `'${value}'`).join(", ")}`,
        );
      }
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
          if (err instanceof Error) {
            throw new Error(`\`${rule}\` options error: ${err.message}`);
          } else {
            throw new Error(`\`${rule}\` options error: unknown failure`);
          }
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

type TokenBucketRateLimitOptions<Characteristics extends readonly string[]> = {
  mode?: ArcjetMode;
  characteristics?: Characteristics;
  refillRate: number;
  interval: string | number;
  capacity: number;
};

type FixedWindowRateLimitOptions<Characteristics extends readonly string[]> = {
  mode?: ArcjetMode;
  characteristics?: Characteristics;
  window: string | number;
  max: number;
};

type SlidingWindowRateLimitOptions<Characteristics extends readonly string[]> =
  {
    mode?: ArcjetMode;
    characteristics?: Characteristics;
    interval: string | number;
    max: number;
  };

type BotOptionsAllow = {
  mode?: ArcjetMode;
  allow: Array<ArcjetWellKnownBot | ArcjetBotCategory>;
  deny?: never;
};

type BotOptionsDeny = {
  mode?: ArcjetMode;
  allow?: never;
  deny: Array<ArcjetWellKnownBot | ArcjetBotCategory>;
};

export type BotOptions = BotOptionsAllow | BotOptionsDeny;

export type EmailOptions = {
  mode?: ArcjetMode;
  block?: ArcjetEmailType[];
  requireTopLevelDomain?: boolean;
  allowDomainLiteral?: boolean;
};

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

type SensitiveInfoOptionsAllow<Detect> = {
  allow: ValidEntities<Detect>;
  deny?: never;
  contextWindowSize?: number;
  mode?: ArcjetMode;
  detect?: Detect;
};

type SensitiveInfoOptionsDeny<Detect> = {
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

type PlainObject = { [key: string]: unknown };

// Primitives and Products external names for Rules even though they are defined
// the same.
// See ExtraProps below for further explanation on why we define them like this.
export type Primitive<Props extends PlainObject = {}> = [ArcjetRule<Props>];
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
export type CharacteristicProps<Characteristics extends readonly string[]> =
  UnionToIntersection<PropsForCharacteristic<Characteristics[number]>>;
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
 * Additional context that can be provided by adapters.
 *
 * Among other things, this could include the Arcjet API Key if it were only
 * available in a runtime handler or IP details provided by a platform.
 */
export type ArcjetAdapterContext = {
  [key: string]: unknown;
  getBody(): Promise<string | undefined>;
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
  options: TokenBucketRateLimitOptions<Characteristics>,
): Primitive<
  Simplify<
    UnionToIntersection<
      { requested: number } | CharacteristicProps<Characteristics>
    >
  >
> {
  validateTokenBucketOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const characteristics = options.characteristics;

  const refillRate = options.refillRate;
  const interval = duration.parse(options.interval);
  const capacity = options.capacity;

  return [
    <ArcjetTokenBucketRateLimitRule<{ requested: number }>>{
      type: "RATE_LIMIT",
      priority: Priority.RateLimit,
      mode,
      characteristics,
      algorithm: "TOKEN_BUCKET",
      refillRate,
      interval,
      capacity,
    },
  ];
}

export function fixedWindow<
  const Characteristics extends readonly string[] = [],
>(
  options: FixedWindowRateLimitOptions<Characteristics>,
): Primitive<Simplify<CharacteristicProps<Characteristics>>> {
  validateFixedWindowOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const characteristics = Array.isArray(options.characteristics)
    ? options.characteristics
    : undefined;

  const max = options.max;
  const window = duration.parse(options.window);

  return [
    <ArcjetFixedWindowRateLimitRule<{}>>{
      type: "RATE_LIMIT",
      priority: Priority.RateLimit,
      mode,
      characteristics,
      algorithm: "FIXED_WINDOW",
      max,
      window,
    },
  ];
}

export function slidingWindow<
  const Characteristics extends readonly string[] = [],
>(
  options: SlidingWindowRateLimitOptions<Characteristics>,
): Primitive<Simplify<CharacteristicProps<Characteristics>>> {
  validateSlidingWindowOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const characteristics = Array.isArray(options.characteristics)
    ? options.characteristics
    : undefined;

  const max = options.max;
  const interval = duration.parse(options.interval);

  return [
    <ArcjetSlidingWindowRateLimitRule<{}>>{
      type: "RATE_LIMIT",
      priority: Priority.RateLimit,
      mode,
      characteristics,
      algorithm: "SLIDING_WINDOW",
      max,
      interval,
    },
  ];
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

export function sensitiveInfo<
  const Detect extends DetectSensitiveInfoEntities<CustomEntities> | undefined,
  const CustomEntities extends string,
>(options: SensitiveInfoOptions<Detect>): Primitive<{}> {
  validateSensitiveInfoOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
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

  return [
    <ArcjetSensitiveInfoRule<{}>>{
      type: "SENSITIVE_INFO",
      priority: Priority.SensitiveInfo,
      mode,
      allow: options.allow || [],
      deny: options.deny || [],

      validate(
        context: ArcjetContext,
        details: ArcjetRequestDetails,
      ): asserts details is ArcjetRequestDetails {},

      async protect(
        context: ArcjetContext,
        details: ArcjetRequestDetails,
      ): Promise<ArcjetRuleResult> {
        const body = await context.getBody();
        if (typeof body === "undefined") {
          return new ArcjetRuleResult({
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

        const reason = new ArcjetSensitiveInfoReason({
          denied: convertAnalyzeDetectedSensitiveInfoEntity(result.denied),
          allowed: convertAnalyzeDetectedSensitiveInfoEntity(result.allowed),
        });

        if (result.denied.length === 0) {
          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason,
          });
        } else {
          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "DENY",
            reason,
          });
        }
      },
    },
  ];
}

export function validateEmail(
  options: EmailOptions,
): Primitive<{ email: string }> {
  validateEmailOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  const block = options.block ?? [];
  const requireTopLevelDomain = options.requireTopLevelDomain ?? true;
  const allowDomainLiteral = options.allowDomainLiteral ?? false;

  const emailOpts = {
    requireTopLevelDomain,
    allowDomainLiteral,
    blockedEmails: block,
  };

  return [
    <ArcjetEmailRule<{ email: string }>>{
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
        const result = await analyze.isValidEmail(context, email, emailOpts);
        if (result.validity === "valid") {
          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetEmailReason({ emailTypes: [] }),
          });
        } else {
          const typedEmailTypes = result.blocked.filter(isEmailType);

          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetEmailReason({
              emailTypes: typedEmailTypes,
            }),
          });
        }
      },
    },
  ];
}

export function detectBot(options: BotOptions): Primitive<{}> {
  validateBotOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
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

  return [
    <ArcjetBotRule<{}>>{
      type: "BOT",
      priority: Priority.BotDetection,
      mode,
      allow: options.allow ?? [],
      deny: options.deny ?? [],

      validate(
        context: ArcjetContext,
        details: Partial<ArcjetRequestDetails>,
      ): asserts details is ArcjetRequestDetails {
        if (typeof details.headers === "undefined") {
          throw new Error("bot detection requires `headers` to be set");
        }
        if (typeof details.headers.has !== "function") {
          throw new Error(
            "bot detection requires `headers` to extend `Headers`",
          );
        }
        if (!details.headers.has("user-agent")) {
          throw new Error("bot detection requires user-agent header");
        }
      },

      /**
       * Attempts to call the bot detection on the headers.
       */
      async protect(
        context: ArcjetContext,
        request: ArcjetRequestDetails,
      ): Promise<ArcjetRuleResult> {
        const result = await analyze.detectBot(
          context,
          toAnalyzeRequest(request),
          config,
        );

        // If this is a bot and of a type that we want to block, then block!
        if (result.denied.length > 0) {
          return new ArcjetRuleResult({
            ttl: 60,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetBotReason({
              allowed: result.allowed,
              denied: result.denied,
            }),
          });
        } else {
          return new ArcjetRuleResult({
            ttl: 0,
            state: "RUN",
            conclusion: "ALLOW",
            reason: new ArcjetBotReason({
              allowed: result.allowed,
              denied: result.denied,
            }),
          });
        }
      },
    },
  ];
}

export type ShieldOptions = {
  mode?: ArcjetMode;
};

export function shield(options: ShieldOptions): Primitive<{}> {
  validateShieldOptions(options);

  const mode = options.mode === "LIVE" ? "LIVE" : "DRY_RUN";
  return [
    <ArcjetShieldRule<{}>>{
      type: "SHIELD",
      priority: Priority.Shield,
      mode,
    },
  ];
}

export type ProtectSignupOptions<Characteristics extends string[]> = {
  rateLimit: SlidingWindowRateLimitOptions<Characteristics>;
  bots: BotOptions;
  email: EmailOptions;
};

export function protectSignup<const Characteristics extends string[] = []>(
  options: ProtectSignupOptions<Characteristics>,
): Product<
  Simplify<
    UnionToIntersection<
      { email: string } | CharacteristicProps<Characteristics>
    >
  >
> {
  return [
    ...slidingWindow(options.rateLimit),
    ...detectBot(options.bots),
    ...validateEmail(options.email),
  ];
}

export interface ArcjetOptions<
  Rules extends [...(Primitive | Product)[]],
  Characteristics extends readonly string[],
> {
  /**
   * The API key to identify the site in Arcjet.
   */
  key: string;
  /**
   * Rules to apply when protecting a request.
   */
  rules: readonly [...Rules];
  /**
   * Characteristics to be used to uniquely identify clients.
   */
  characteristics?: Characteristics;
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
export interface Arcjet<Props extends PlainObject> {
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
  withRule<Rule extends Primitive | Product>(
    rule: Rule,
  ): Arcjet<Simplify<Props & ExtraProps<Rule>>>;
}

/**
 * Create a new Arcjet client with the specified {@link ArcjetOptions}.
 *
 * @param options {ArcjetOptions} Arcjet configuration options.
 */
export default function arcjet<
  const Rules extends [...(Primitive | Product)[]] = [],
  const Characteristics extends readonly string[] = [],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): Arcjet<Simplify<ExtraProps<Rules> & CharacteristicProps<Characteristics>>> {
  // We destructure here to make the function signature neat when viewed by consumers
  const { key, rules } = options;

  const rt = runtime();

  // TODO: Separate the ArcjetOptions from the SDK Options
  // It is currently optional in the options so users can override it via an SDK
  if (typeof options.log === "undefined") {
    throw new Error("Log is required");
  }
  const log = options.log;

  // TODO(#207): Remove this when we can default the transport so client is not required
  // It is currently optional in the options so the Next SDK can override it for the user
  if (typeof options.client === "undefined") {
    throw new Error("Client is required");
  }
  const client = options.client;

  // A local cache of block decisions. Might be emphemeral per request,
  // depending on the way the runtime works, but it's worth a try.
  // TODO(#132): Support configurable caching
  const blockCache = new Cache<ArcjetReason>();

  const rootRules: ArcjetRule[] = rules
    .flat(1)
    .sort((a, b) => a.priority - b.priority);

  async function protect<Props extends PlainObject>(
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
      // TODO(#208): Re-add body
      // body: request.body,
      extra: extraProps(request),
      email: typeof request.email === "string" ? request.email : undefined,
    });

    const characteristics = options.characteristics
      ? [...options.characteristics]
      : [];

    const baseContext = {
      key,
      log,
      characteristics,
      ...ctx,
    };

    log.time?.("fingerprint");
    const fingerprint = await analyze.generateFingerprint(
      baseContext,
      toAnalyzeRequest(details),
    );
    log.debug("fingerprint (%s): %s", rt, fingerprint);
    log.timeEnd?.("fingerprint");

    const context: ArcjetContext = Object.freeze({
      ...baseContext,
      fingerprint,
      runtime: rt,
    });

    if (rules.length < 1) {
      // TODO(#607): Error if no rules configured after deprecation period
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

    try {
      log.time?.("local");

      // We have our own local cache which we check first. This doesn't work in
      // serverless environments where every request is isolated, but there may be
      // some instances where the instance is not recycled immediately. If so, we
      // can take advantage of that.
      log.time?.("cache");
      const existingBlockReason = blockCache.get(fingerprint);
      log.timeEnd?.("cache");

      // If already blocked then we can async log to the API and return the
      // decision immediately.
      if (existingBlockReason) {
        const decision = new ArcjetDenyDecision({
          ttl: blockCache.ttl(fingerprint),
          reason: existingBlockReason,
          // All results will be NOT_RUN because we used a cached decision
          results,
        });

        client.report(context, details, decision, rules);

        log.debug(
          {
            id: decision.id,
            conclusion: decision.conclusion,
            fingerprint,
            reason: existingBlockReason,
            runtime: rt,
          },
          "decide: already blocked",
        );

        return decision;
      }

      for (const [idx, rule] of rules.entries()) {
        // This re-assignment is a workaround to a TypeScript error with
        // assertions where the name was introduced via a destructure
        let localRule: ArcjetLocalRule;
        if (isLocalRule(rule)) {
          localRule = rule;
        } else {
          continue;
        }

        try {
          log.time?.(rule.type);

          localRule.validate(context, details);
          results[idx] = await localRule.protect(context, details);

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
            ttl: 0,
            state: "RUN",
            conclusion: "ERROR",
            reason: new ArcjetErrorReason(err),
          });
        } finally {
          log.timeEnd?.(rule.type);
        }

        if (results[idx].isDenied()) {
          const decision = new ArcjetDenyDecision({
            ttl: results[idx].ttl,
            reason: results[idx].reason,
            results,
          });

          // Only a DENY decision is reported to avoid creating 2 entries for a
          // request. Upon ALLOW, the `decide` call will create an entry for the
          // request.
          client.report(context, details, decision, rules);

          // If we're not in DRY_RUN mode, we want to cache non-zero TTL results
          // and return this DENY decision.
          if (rule.mode !== "DRY_RUN") {
            if (results[idx].ttl > 0) {
              log.debug(
                {
                  fingerprint,
                  conclusion: decision.conclusion,
                  reason: decision.reason,
                },
                "Caching decision for %d seconds",
                decision.ttl,
              );

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
    } finally {
      log.timeEnd?.("local");
    }

    // With no cached values, we take a decision remotely. We use a timeout to
    // fail open.
    try {
      log.time?.("remote");

      log.time?.("decideApi");
      const decision = await client
        .decide(context, details, rules)
        .finally(() => {
          log.timeEnd?.("decideApi");
        });

      // If the decision is to block and we have a non-zero TTL, we cache the
      // block locally
      if (decision.isDenied() && decision.ttl > 0) {
        log.debug("decide: Caching block locally for %d seconds", decision.ttl);

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

      client.report(context, details, decision, rules);

      return decision;
    } finally {
      log.timeEnd?.("remote");
    }
  }

  // This is a separate function so it can be called recursively
  function withRule<Rule extends Primitive | Product>(
    baseRules: ArcjetRule[],
    rule: Rule,
  ) {
    const rules = [...baseRules, ...rule].sort(
      (a, b) => a.priority - b.priority,
    );

    return Object.freeze({
      withRule(rule: Primitive | Product) {
        return withRule(rules, rule);
      },
      async protect(
        ctx: ArcjetAdapterContext,
        request: ArcjetRequest<ExtraProps<typeof rules>>,
      ): Promise<ArcjetDecision> {
        return protect(rules, ctx, request);
      },
    });
  }

  return Object.freeze({
    withRule(rule: Primitive | Product) {
      return withRule(rootRules, rule);
    },
    async protect(
      ctx: ArcjetAdapterContext,
      request: ArcjetRequest<ExtraProps<typeof rootRules>>,
    ): Promise<ArcjetDecision> {
      return protect(rootRules, ctx, request);
    },
  });
}
