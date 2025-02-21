import { initializeWasm } from "@arcjet/analyze-wasm";
import type {
  BotConfig,
  BotResult,
  DetectBotsFunction,
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

function noOpDetectSensitiveInfo(): SensitiveInfoEntity[] {
  return [];
}

function noOpDetectBots(): string[] {
  return [];
}

function createCoreImports(
  detectSensitiveInfo: DetectSensitiveInfoFunction = noOpDetectSensitiveInfo,
  detectBots: DetectBotsFunction = noOpDetectBots,
): ImportObject {
  return {
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
    "arcjet:js-req/bot-identifier": {
      detect: detectBots,
    },
    "arcjet:js-req/sensitive-information-identifier": {
      detect: detectSensitiveInfo,
    },
    "arcjet:js-req/verify-bot": {
      verify() {
        return "unverifiable";
      },
    },
  };
}

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
  } else {
    log.debug("WebAssembly is not supported in this runtime");
  }

  return "";
}

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
  } else {
    log.debug("WebAssembly is not supported in this runtime");
    // Skip the local evaluation of the rule if WASM is not available
    return {
      validity: "valid",
      blocked: [],
    };
  }
}

type RequestDetectBotsFunction = (request: AnalyzeRequest) => Array<string>;

export async function detectBot(
  context: AnalyzeContext,
  request: AnalyzeRequest,
  options: BotConfig,
  detect?: RequestDetectBotsFunction,
): Promise<BotResult> {
  const { log } = context;
  let convertedDetect;
  if (typeof detect === "function") {
    convertedDetect = (req: string) => {
      let request: AnalyzeRequest;
      try {
        request = JSON.parse(req);
      } catch {
        throw new Error("object sent for detection was not a request");
      }
      return detect(request);
    };
  }

  const coreImports = createCoreImports(
    noOpDetectSensitiveInfo,
    convertedDetect || noOpDetectBots,
  );
  const analyze = await initializeWasm(coreImports);

  if (typeof analyze !== "undefined") {
    return analyze.detectBot(JSON.stringify(request), options);
  } else {
    log.debug("WebAssembly is not supported in this runtime");
    // Skip the local evaluation of the rule if Wasm is not available
    return {
      allowed: [],
      denied: [],
      spoofed: false,
      verified: false,
    };
  }
}

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
  } else {
    log.debug("WebAssembly is not supported in this runtime");
    throw new Error(
      "SENSITIVE_INFO rule failed to run because Wasm is not supported in this environment.",
    );
  }
}
