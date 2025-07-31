import { initializeWasm } from "@arcjet/analyze-wasm";
import type {
  // TODO(@wooorm-arcjet): rename to `DetectBotOptions`.
  BotConfig,
  // TODO(@wooorm-arcjet): expose, rename to `DetectBotResult`.
  BotResult,
  DetectedSensitiveInfoEntity,
  DetectSensitiveInfoFunction,
  // TODO(@wooorm-arcjet): rename to `ValidateEmailOptions`.
  EmailValidationConfig,
  // TODO(@wooorm-arcjet): expose, rename to `ValidateEmailResult`.
  EmailValidationResult,
  SensitiveInfoEntities,
  SensitiveInfoEntity,
  SensitiveInfoResult,
  ImportObject,
} from "@arcjet/analyze-wasm";
import type { ArcjetLogger } from "@arcjet/protocol";

/// TODO(@wooorm-arcjet): expose, as `Context`.
interface AnalyzeContext {
  log: ArcjetLogger;
  characteristics: string[];
}

/// TODO(@wooorm-arcjet): expose, as `Request`.
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
 * @param context
 *   Context.
 * @param request
 *   Request.
 * @returns
 *   Promise to a SHA-256 fingerprint.
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
 *   Promise to a result.
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
 *   Promise to a result.
 */
/// TODO(@wooorm-arcjet): expose `BotEntity`, `BotResult`.
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
 *   Entities to detect.
 * @param contextWindowSize
 *   Number of tokens to pass to `detect`.
 * @param detect
 *   Function to detect sensitive info (optional).
 * @returns
 *   Promise to a result.
 */
// TODO(@wooorm-arcjet): expose `DetectSensitiveInfoFunction`, `SensitiveInfoEntities`, `SensitiveInfoResult`.
// TODO(@wooorm-arcjet): less parameters, `5` is a lot.
export async function detectSensitiveInfo(
  context: AnalyzeContext,
  value: string,
  entities: SensitiveInfoEntities,
  contextWindowSize: number,
  // TODO(@wooorm-arcjet): allow `null`, `undefined`.
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
