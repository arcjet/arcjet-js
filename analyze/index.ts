import { initializeWasm } from "@arcjet/analyze-wasm";
import type {
  BotConfig,
  BotResult,
  DetectedSensitiveInfoEntity,
  DetectSensitiveInfoFunction,
  EmailValidationConfig,
  EmailValidationResult,
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

export async function NewBotRule() {
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);
  if (typeof analyze !== "undefined") {
    return new analyze.rule.BotRule();
  }
}

// TODO(@wooorm-arcjet): document what is used to fingerprint.
/**
 * Generate a fingerprint for the client. This is used to identify the client
 * across multiple requests.
 * @param context - The Arcjet Analyze context.
 * @param request - The request to fingerprint.
 * @returns A SHA-256 string fingerprint.
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

// TODO(@wooorm-arcjet): docs.
export async function isValidEmail(
  context: AnalyzeContext,
  candidate: string,
  options: EmailValidationConfig,
): Promise<EmailValidationResult> {
  const { log } = context;
  const coreImports = createCoreImports();
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.isValidEmail(candidate, options);
    // Ignore the `else` branch as we test in places that have WebAssembly.
    /* node:coverage ignore next 4 */
  }

  log.debug("WebAssembly is not supported in this runtime");
  return { blocked: [], validity: "valid" };
}

// TODO(@wooorm-arcjet): docs.
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

// TODO(@wooorm-arcjet): docs.
export async function detectSensitiveInfo(
  context: AnalyzeContext,
  candidate: string,
  entities: SensitiveInfoEntities,
  contextWindowSize: number,
  detect?: DetectSensitiveInfoFunction,
): Promise<SensitiveInfoResult> {
  const { log } = context;
  const coreImports = createCoreImports(detect);
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    const skipCustomDetect = typeof detect !== "function";
    return analyze.detectSensitiveInfo(candidate, {
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
