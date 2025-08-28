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

type AnalyzeRequest = {
  ip?: string;
  method?: string;
  protocol?: string;
  host?: string;
  path?: string;
  headers?: Record<string, string>;
  cookies?: string;
  query?: string;
  extra?: Record<string, string>;
};

export {
  type EmailValidationConfig,
  type BotConfig,
  type FilterResult,
  type SensitiveInfoEntity,
  type DetectedSensitiveInfoEntity,
};

const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "aol.com",
  "hotmail.co.uk",
];

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
    return analyze.generateFingerprint(
      JSON.stringify(request),
      context.characteristics,
    );
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
    return analyze.detectSensitiveInfo(value, {
      entities,
      contextWindowSize,
      skipCustomDetect,
    });
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
 * @param expressions
 *   Filter expressions.
 * @returns
 *   Promise to whether the filter matches the request.
 */
export async function matchFilters(
  context: AnalyzeContext,
  request: AnalyzeRequest,
  expressions: ReadonlyArray<string>,
  allowIfMatch: boolean,
): Promise<FilterResult | undefined> {
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.matchFilters(
      JSON.stringify(request),
      // @ts-expect-error: WebAssembly does not support readonly values.
      expressions,
      allowIfMatch,
    );
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  context.log.debug("WebAssembly is not supported in this runtime");
  return;
}
