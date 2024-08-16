import type { ArcjetLogger, ArcjetRequestDetails } from "@arcjet/protocol";

import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  EmailValidationConfig,
  BotDetectionResult,
  BotType,
  EmailValidationResult,
} from "./wasm/arcjet_analyze_js_req.component.js";

import componentCoreWasm from "./wasm/arcjet_analyze_js_req.component.core.wasm";
import componentCore2Wasm from "./wasm/arcjet_analyze_js_req.component.core2.wasm";
import componentCore3Wasm from "./wasm/arcjet_analyze_js_req.component.core3.wasm";
import { ArcjetJsReqSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-js-req-sensitive-information-identifier.js";

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

async function init(
  context: AnalyzeContext,
  detect?: typeof ArcjetJsReqSensitiveInformationIdentifier.detect,
) {
  const { log } = context;

  let detectOrDefault = detect;
  if (detectOrDefault === undefined) {
    detectOrDefault = () => [];
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
      detect: detectOrDefault,
    },
  };

  try {
    return core.instantiate(moduleFromPath, coreImports);
  } catch {
    log.debug("WebAssembly is not supported in this runtime");
  }
}

export {
  type EmailValidationConfig,
  type BotType,
  /**
   * Represents the result of the bot detection.
   *
   * @property `botType` - What type of bot this is. This will be one of `BotType`.
   * @property `botScore` - A score ranging from 0 to 99 representing the degree of
   * certainty. The higher the number within the type category, the greater the
   * degree of certainty. E.g. `BotType.Automated` with a score of 1 means we are
   * sure the request was made by an automated bot. `BotType.LikelyNotABot` with a
   * score of 30 means we don't think this request was a bot, but it's lowest
   * confidence level. `BotType.LikelyNotABot` with a score of 99 means we are
   * almost certain this request was not a bot.
   */
  type BotDetectionResult,
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
  request: Partial<ArcjetRequestDetails>,
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
  headers: string,
  patterns_add: string,
  patterns_remove: string,
): Promise<BotDetectionResult> {
  const analyze = await init(context);

  if (typeof analyze !== "undefined") {
    return analyze.detectBot(headers, patterns_add, patterns_remove);
  } else {
    // TODO: Fallback to JS if we don't have WASM?
    return {
      botType: "not-analyzed",
      botScore: 0,
    };
  }
}

export async function detectSensitiveInfo(
  context: AnalyzeContext,
  candidate: string,
  entities: core.Entities,
  contextWindowSize: number,
  detect?: typeof ArcjetJsReqSensitiveInformationIdentifier.detect,
): Promise<core.SensitiveInfoResult> {
  const analyze = await init(context, detect);
  const skipCustomDetect = detect === undefined;

  const options: core.DetectConfig = {
    entities,
    contextWindowSize,
    skipCustomDetect,
  };

  if (typeof analyze !== "undefined") {
    return analyze.detectSensitiveInfo(candidate, options);
  } else {
    // Skip the local evaluation of the rule if WASM is not available
    return {
      allowed: [],
      denied: [],
    };
  }
}

export type SensitiveInfoEntity = core.SensitiveInfoEntity;
export type Entities = core.Entities;
export type DetectedEntitiy = core.DetectedEntity;
