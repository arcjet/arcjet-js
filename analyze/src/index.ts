import { initializeWasm } from "@arcjet/analyze-wasm";
import type {
  BotConfig,
  BotResult,
  DetectedSensitiveInfoEntity,
  DetectSensitiveInfoFunction,
  EmailValidationConfig,
  EmailValidationResult,
  FilterResult,
  SensitiveInfoEntities,
  SensitiveInfoEntity,
  SensitiveInfoResult,
  ImportObject,
} from "@arcjet/analyze-wasm";
import type { ArcjetLogger } from "@arcjet/protocol";

interface AnalyzeContext {
  log: ArcjetLogger;
  characteristics: string[];
}

/**
 * Request passed as a JSON string into WebAssembly.
 *
 * This is like `ArcjetRequestDetails` from `@arcjet/protocol`,
 * but fields are often optional across the boundary.
 */
export interface AnalyzeRequest {
  /**
   * IP address (IPv4 or IPv6).
   */
  ip?: string | undefined;

  /**
   * HTTP method (such as `GET`).
   */
  method?: string | undefined;

  /**
   * Protocol (such as `"http:"`).
   */
  protocol?: string | undefined;

  /**
   * Hostname (such as `"example.com"`).
   */
  host?: string | undefined;

  /**
   * Path (such as `"/path/to/resource"`).
   */
  path?: string | undefined;

  /**
   * Headers of the request.
   */
  headers?: Record<string, string> | undefined;

  /**
   * Cookies of the request (such as `"cookie1=value1; cookie2=value2"`).
   */
  cookies?: string | undefined;

  /**
   * Query string of the request (such as `"?q=alpha"`).
   */
  query?: string | undefined;

  /**
   * Extra info.
   */
  extra?: Record<string, string> | undefined;
}

export {
  type EmailValidationConfig,
  type BotConfig,
  type FilterResult,
  type SensitiveInfoEntity,
  type SensitiveInfoEntities,
  type SensitiveInfoResult,
  type DetectedSensitiveInfoEntity,
  type DetectSensitiveInfoFunction,
};

/**
 * Number of bytes a code point occupies in UTF-8.
 *
 * @param codePoint
 *   Code point.
 * @returns
 *   Byte length.
 */
function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  // A lone surrogate has no UTF-8 encoding; it reaches Wasm as U+FFFD, which is
  // also three bytes, so the arithmetic stays aligned either way.
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Convert the UTF-8 byte offsets Wasm reports into UTF-16 code unit indices.
 *
 * `ArcjetIdentifiedEntity` documents `start`/`end` as indices into the value,
 * and the Rampart backend fills them from `RegExp` match indices, which are
 * code units. The Wasm detector counts bytes instead, so without this the two
 * backends disagree and `value.slice(start, end)` returns the wrong substring
 * for any value containing a multi-byte character.
 *
 * A span is only ever widened, never narrowed, so it still covers the entity
 * even if an offset lands inside a character.
 *
 * @param value
 *   Value the offsets refer to.
 * @param entities
 *   Detected entities carrying byte offsets.
 * @returns
 *   The same entities with code unit offsets.
 */
function toStringIndices(
  value: string,
  entities: ReadonlyArray<DetectedSensitiveInfoEntity>,
): Array<DetectedSensitiveInfoEntity> {
  if (entities.length === 0) {
    return [];
  }

  const wanted = new Set<number>();
  for (const entity of entities) {
    wanted.add(entity.start);
    wanted.add(entity.end);
  }

  const ascending = Array.from(wanted).sort((a, b) => a - b);
  const floors = new Map<number, number>();
  const ceilings = new Map<number, number>();
  let cursor = 0;
  let byteOffset = 0;
  let stringIndex = 0;

  while (cursor < ascending.length && ascending[cursor] <= 0) {
    floors.set(ascending[cursor], 0);
    ceilings.set(ascending[cursor], 0);
    cursor++;
  }

  for (const character of value) {
    if (cursor >= ascending.length) break;

    const nextByteOffset = byteOffset + utf8Length(character.codePointAt(0)!);
    const nextStringIndex = stringIndex + character.length;

    while (cursor < ascending.length && ascending[cursor] <= nextByteOffset) {
      const offset = ascending[cursor];
      floors.set(offset, offset === nextByteOffset ? nextStringIndex : stringIndex);
      ceilings.set(offset, nextStringIndex);
      cursor++;
    }

    byteOffset = nextByteOffset;
    stringIndex = nextStringIndex;
  }

  while (cursor < ascending.length) {
    floors.set(ascending[cursor], value.length);
    ceilings.set(ascending[cursor], value.length);
    cursor++;
  }

  return entities.map((entity) => {
    const start = floors.get(entity.start) ?? 0;
    const end = ceilings.get(entity.end) ?? value.length;
    return { ...entity, start, end: Math.max(start, end) };
  });
}

const FREE_EMAIL_PROVIDERS = ["gmail.com", "yahoo.com", "hotmail.com", "aol.com", "hotmail.co.uk"];

function noOpSensitiveInfoDetect(): SensitiveInfoEntity[] {
  return [];
}

function noOpBotsDetect(): string[] {
  return [];
}

function createCoreImports(detect?: DetectSensitiveInfoFunction): ImportObject {
  if (typeof detect !== "function") {
    detect = noOpSensitiveInfoDetect;
  }

  return {
    "arcjet:js-req/bot-identifier": {
      detect: noOpBotsDetect,
    },
    "arcjet:js-req/email-validator-overrides": {
      isFreeEmail(domain) {
        if (FREE_EMAIL_PROVIDERS.includes(domain)) {
          return "yes";
        }
        return "unknown";
      },
      isDisposableEmail() {
        return "unknown";
      },
      hasMxRecords() {
        return "unknown";
      },
      hasGravatar() {
        return "unknown";
      },
    },
    "arcjet:js-req/filter-overrides": {
      ipLookup() {
        return undefined;
      },
    },
    // TODO(@wooorm-arcjet): figure out a test case for this with the default `detect`.
    "arcjet:js-req/sensitive-information-identifier": {
      detect,
    },
    // TODO(@wooorm-arcjet): figure out a test case for this that calls `verify`.
    "arcjet:js-req/verify-bot": {
      verify() {
        return "unverifiable";
      },
    },
  };
}

/**
 * Generate a fingerprint.
 *
 * Fingerprints can be used to identify the client across multiple requests.
 *
 * This considers different things on the `request` based on the passed
 * `context.characteristics`.
 *
 * See [*Fingerprints* on
 * `docs.arcjet.com`](https://docs.arcjet.com/fingerprints/) for more info.
 *
 * @param context
 *   Context.
 * @param request
 *   Request.
 * @returns
 *   Promise for a SHA-256 fingerprint.
 */
export async function generateFingerprint(
  context: AnalyzeContext,
  request: AnalyzeRequest,
): Promise<string> {
  const { log } = context;
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.generateFingerprint(JSON.stringify(request), context.characteristics);
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  log.debug("WebAssembly is not supported in this runtime");
  return "";
}

/**
 * Check whether an email is valid.
 *
 * @param context
 *   Context.
 * @param value
 *   Value.
 * @param options
 *   Configuration.
 * @returns
 *   Promise for a result.
 */
export async function isValidEmail(
  context: AnalyzeContext,
  value: string,
  options: EmailValidationConfig,
): Promise<EmailValidationResult> {
  const { log } = context;
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.isValidEmail(value, options);
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  log.debug("WebAssembly is not supported in this runtime");
  return { blocked: [], validity: "valid" };
}

/**
 * Detect whether a request is by a bot.
 *
 * @param context
 *   Context.
 * @param request
 *   Request.
 * @param options
 *   Configuration.
 * @returns
 *   Promise for a result.
 */
export async function detectBot(
  context: AnalyzeContext,
  request: AnalyzeRequest,
  options: BotConfig,
): Promise<BotResult> {
  const { log } = context;
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.detectBot(JSON.stringify(request), options);
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  log.debug("WebAssembly is not supported in this runtime");
  return { allowed: [], denied: [], spoofed: false, verified: false };
}

/**
 * Detect sensitive info in a value.
 *
 * @param context
 *   Context.
 * @param value
 *   Value.
 * @param entities
 *   Strategy to use for detecting sensitive info;
 *   either by denying everything and allowing certain tags or by allowing
 *   everything and denying certain tags.
 * @param contextWindowSize
 *   Number of tokens to pass to `detect`.
 * @param detect
 *   Function to detect sensitive info (optional).
 * @returns
 *   Promise for a result.
 */
export async function detectSensitiveInfo(
  context: AnalyzeContext,
  value: string,
  entities: SensitiveInfoEntities,
  contextWindowSize: number,
  detect?: DetectSensitiveInfoFunction,
): Promise<SensitiveInfoResult> {
  const { log } = context;
  const coreImports = createCoreImports(detect);
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    const skipCustomDetect = typeof detect !== "function";
    const result = analyze.detectSensitiveInfo(value, {
      entities,
      contextWindowSize,
      skipCustomDetect,
    });
    // Wasm reports UTF-8 byte offsets; the protocol type is documented in code
    // units and the Rampart backend fills it that way.
    return {
      ...result,
      allowed: toStringIndices(value, result.allowed),
      denied: toStringIndices(value, result.denied),
    };
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  log.debug("WebAssembly is not supported in this runtime");
  throw new Error(
    "SENSITIVE_INFO rule failed to run because Wasm is not supported in this environment.",
  );
}

/**
 * Check if a filter matches a request.
 *
 * @param context
 *   Arcjet context.
 * @param request
 *   Request.
 * @param localFields
 *   Fields to use as `local` in the expressions, as serialized JSON.
 * @param expressions
 *   Filter expressions.
 * @returns
 *   Promise to whether the filter matches the request.
 */
export async function matchFilters(
  context: AnalyzeContext,
  request: AnalyzeRequest,
  localFields: string,
  expressions: ReadonlyArray<string>,
  allowIfMatch: boolean,
): Promise<FilterResult> {
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.matchFilters(
      JSON.stringify(request),
      localFields,
      // @ts-expect-error: WebAssembly does not support readonly values.
      expressions,
      allowIfMatch,
    );
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  context.log.debug("WebAssembly is not supported in this runtime");
  throw new Error("FILTER rule failed to run because Wasm is not supported in this environment.");
}
