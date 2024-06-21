import type { ArcjetLogger, ArcjetRequestDetails } from "@arcjet/protocol";

import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  EmailValidationConfig,
  BotDetectionResult,
  BotType,
} from "./wasm/arcjet_analyze_js_req.component.js";

import { wasm as componentCoreWasm } from "./wasm/arcjet_analyze_js_req.component.core.wasm?js";
import { wasm as componentCore2Wasm } from "./wasm/arcjet_analyze_js_req.component.core2.wasm?js";
import { wasm as componentCore3Wasm } from "./wasm/arcjet_analyze_js_req.component.core3.wasm?js";

interface AnalyzeContext {
  log: ArcjetLogger;
  characteristics: string[];
}

// TODO: Do we actually need this wasmCache or does `import` cache correctly?
const wasmCache = new Map<string, WebAssembly.Module>();

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  const cachedModule = wasmCache.get(path);
  if (typeof cachedModule !== "undefined") {
    return cachedModule;
  }

  if (path === "arcjet_analyze_js_req.component.core.wasm") {
    const mod = await componentCoreWasm();
    wasmCache.set(path, mod);
    return mod;
  }
  if (path === "arcjet_analyze_js_req.component.core2.wasm") {
    const mod = await componentCore2Wasm();
    wasmCache.set(path, mod);
    return mod;
  }
  if (path === "arcjet_analyze_js_req.component.core3.wasm") {
    const mod = await componentCore3Wasm();
    wasmCache.set(path, mod);
    return mod;
  }

  throw new Error(`Unknown path: ${path}`);
}

async function init(context: AnalyzeContext) {
  const { log } = context;

  const coreImports: ImportObject = {
    "arcjet:js-req/logger": {
      debug(msg) {
        log.debug(msg);
      },
      error(msg) {
        log.error(msg);
      },
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
) {
  const analyze = await init(context);

  if (typeof analyze !== "undefined") {
    return analyze.isValidEmail(candidate, options);
  } else {
    // TODO: Fallback to JS if we don't have WASM?
    return true;
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
