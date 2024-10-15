import { initializeWasm } from "@arcjet/analyze-wasm";
import type {
  AnalyzeContext,
  BotConfig,
  BotResult,
  DetectedSensitiveInfoEntity,
  DetectSensitiveInfoFunction,
  EmailValidationConfig,
  EmailValidationResult,
  SensitiveInfoEntities,
  SensitiveInfoEntity,
  SensitiveInfoResult,
} from "@arcjet/analyze-wasm";

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
  const analyze = await initializeWasm(context);

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
  const analyze = await initializeWasm(context);
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
  const analyze = await initializeWasm(context);

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
  const analyze = await initializeWasm(context, detect);

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
