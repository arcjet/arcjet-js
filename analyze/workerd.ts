import type { ArcjetLogger } from "@arcjet/protocol";

import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  EmailValidationConfig,
  BotDetectionResult,
  BotType,
} from "./wasm/arcjet_analyze_js_req.component.js";

import componentCoreWasm from "./wasm/arcjet_analyze_js_req.component.core.wasm";
import componentCore2Wasm from "./wasm/arcjet_analyze_js_req.component.core2.wasm";
import componentCore3Wasm from "./wasm/arcjet_analyze_js_req.component.core3.wasm";

interface AnalyzeContext {
  log: ArcjetLogger;
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
 * @param ip - The IP address of the client.
 * @returns A SHA-256 string fingerprint.
 */
export async function generateFingerprint(
  context: AnalyzeContext,
  ip: string,
): Promise<string> {
  if (ip == "") {
    return "";
  }

  const analyze = await init(context);

  if (typeof analyze !== "undefined") {
    return analyze.generateFingerprint(ip);
  }

  if (hasSubtleCryptoDigest()) {
    // Fingerprint v1 is just the IP address
    const fingerprintRaw = `fp_1_${ip}`;

    // Based on MDN example at
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string

    // Encode the raw fingerprint into a utf-8 Uint8Array
    const fingerprintUint8 = new TextEncoder().encode(fingerprintRaw);
    // Hash the message with SHA-256
    const fingerprintArrayBuffer = await crypto.subtle.digest(
      "SHA-256",
      fingerprintUint8,
    );
    // Convert the ArrayBuffer to a byte array
    const fingerprintArray = Array.from(new Uint8Array(fingerprintArrayBuffer));
    // Convert the bytes to a hex string
    const fingerprint = fingerprintArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return fingerprint;
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

function hasSubtleCryptoDigest() {
  if (typeof crypto === "undefined") {
    return false;
  }

  if (!("subtle" in crypto)) {
    return false;
  }
  if (typeof crypto.subtle === "undefined") {
    return false;
  }
  if (!("digest" in crypto.subtle)) {
    return false;
  }
  if (typeof crypto.subtle.digest !== "function") {
    return false;
  }

  return true;
}
