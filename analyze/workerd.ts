import type { ArcjetLogger } from "@arcjet/protocol";

import { instantiate } from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  EmailValidationConfig,
  EmailValidationResult,
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntities,
  SensitiveInfoEntity,
  SensitiveInfoResult,
  BotConfig,
  BotResult,
} from "./wasm/arcjet_analyze_js_req.component.js";
import type { ArcjetJsReqSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-js-req-sensitive-information-identifier.js";

import componentCoreWasm from "./wasm/arcjet_analyze_js_req.component.core.wasm";
import componentCore2Wasm from "./wasm/arcjet_analyze_js_req.component.core2.wasm";
import componentCore3Wasm from "./wasm/arcjet_analyze_js_req.component.core3.wasm";

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

const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "aol.com",
  "hotmail.co.uk",
];

interface AnalyzeContext {
  log: ArcjetLogger;
  characteristics: string[];
}

type DetectSensitiveInfoFunction =
  typeof ArcjetJsReqSensitiveInformationIdentifier.detect;

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  if (path === "arcjet_analyze_js_req.component.core.wasm") {
    return componentCoreWasm;
  }
  if (path === "arcjet_analyze_js_req.component.core2.wasm") {
    return componentCore2Wasm;
  }
  if (path === "arcjet_analyze_js_req.component.core3.wasm") {
    return componentCore3Wasm;
  }

  throw new Error(`Unknown path: ${path}`);
}

function noOpDetect(): SensitiveInfoEntity[] {
  return [];
}

async function init(
  context: AnalyzeContext,
  detectSensitiveInfo?: DetectSensitiveInfoFunction,
) {
  const { log } = context;

  if (typeof detectSensitiveInfo !== "function") {
    detectSensitiveInfo = noOpDetect;
  }

  const coreImports: ImportObject = {
    "arcjet:js-req/logger": {
      debug(msg) {
        log.debug(msg);
      },
      error(msg) {
        log.error(msg);
      },
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
    "arcjet:js-req/sensitive-information-identifier": {
      detect: detectSensitiveInfo,
    },
  };

  try {
    // Await the instantiation to catch the failure
    return await instantiate(moduleFromPath, coreImports);
  } catch {
    log.debug("WebAssembly is not supported in this runtime");
  }
}

export {
  type EmailValidationConfig,
  type BotConfig,
  type DetectedSensitiveInfoEntity,
  type SensitiveInfoEntity,
  type DetectSensitiveInfoFunction,
};

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
  const analyze = await init(context);

  if (typeof analyze !== "undefined") {
    return analyze.generateFingerprint(
      JSON.stringify(request),
      context.characteristics,
    );
  }

  return "";
}

export async function isValidEmail(
  context: AnalyzeContext,
  candidate: string,
  options?: EmailValidationConfig,
): Promise<EmailValidationResult> {
  const analyze = await init(context);
  const optionsOrDefault = {
    requireTopLevelDomain: true,
    allowDomainLiteral: false,
    blockedEmails: [],
    ...options,
  };

  if (typeof analyze !== "undefined") {
    return analyze.isValidEmail(candidate, optionsOrDefault);
  } else {
    // Skip the local evaluation of the rule if WASM is not available
    return {
      validity: "valid",
      blocked: [],
    };
  }
}

export async function detectBot(
  context: AnalyzeContext,
  request: AnalyzeRequest,
  options: BotConfig,
): Promise<BotResult> {
  const analyze = await init(context);

  if (typeof analyze !== "undefined") {
    return analyze.detectBot(JSON.stringify(request), options);
  } else {
    // Skip the local evaluation of the rule if Wasm is not available
    return {
      allowed: [],
      denied: [],
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
  const analyze = await init(context, detect);

  if (typeof analyze !== "undefined") {
    const skipCustomDetect = typeof detect !== "function";
    return analyze.detectSensitiveInfo(candidate, {
      entities,
      contextWindowSize,
      skipCustomDetect,
    });
  } else {
    throw new Error(
      "SENSITIVE_INFO rule failed to run because Wasm is not supported in this environment.",
    );
  }
}
