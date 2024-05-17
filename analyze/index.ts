import logger from "@arcjet/logger";

import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  EmailValidationConfig,
  BotDetectionResult,
  BotType,
} from "./wasm/arcjet_analyze_js_req.component.js";

// TODO: Do we actually need this wasmCache or does `import` cache correctly?
const wasmCache = new Map<string, WebAssembly.Module>();

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  const cachedModule = wasmCache.get(path);
  if (typeof cachedModule !== "undefined") {
    return cachedModule;
  }

  if (process.env["NEXT_RUNTIME"] === "edge") {
    const wasmPrefix = "arcjet_analyze_js_req.component";
    if (path === "arcjet_analyze_js_req.component.core.wasm") {
      const mod = await import(
        /* @vite-ignore */
        `./wasm/${wasmPrefix}.core.wasm?module`
      );
      wasmCache.set(path, mod.default);
      return mod.default;
    }
    if (path === "arcjet_analyze_js_req.component.core2.wasm") {
      const mod = await import(
        /* @vite-ignore */
        `./wasm/${wasmPrefix}.core2.wasm?module`
      );
      wasmCache.set(path, mod.default);
      return mod.default;
    }
    if (path === "arcjet_analyze_js_req.component.core3.wasm") {
      const mod = await import(
        /* @vite-ignore */
        `./wasm/${wasmPrefix}.core3.wasm?module`
      );
      wasmCache.set(path, mod.default);
      return mod.default;
    }
  } else {
    if (path === "arcjet_analyze_js_req.component.core.wasm") {
      const { wasm } = await import(
        "./wasm/arcjet_analyze_js_req.component.core.wasm"
      );
      const mod = await wasm();
      wasmCache.set(path, mod);
      return mod;
    }
    if (path === "arcjet_analyze_js_req.component.core2.wasm") {
      const { wasm } = await import(
        "./wasm/arcjet_analyze_js_req.component.core2.wasm"
      );
      const mod = await wasm();
      wasmCache.set(path, mod);
      return mod;
    }
    if (path === "arcjet_analyze_js_req.component.core3.wasm") {
      const { wasm } = await import(
        "./wasm/arcjet_analyze_js_req.component.core3.wasm"
      );
      const mod = await wasm();
      wasmCache.set(path, mod);
      return mod;
    }
  }

  throw new Error(`Unknown path: ${path}`);
}

const coreImports: ImportObject = {
  "arcjet:js-req/logger": {
    debug(msg) {
      logger.debug(msg);
    },
    error(msg) {
      logger.error(msg);
    },
  },
};

async function init() {
  try {
    return core.instantiate(moduleFromPath, coreImports);
  } catch {
    logger.debug("WebAssembly is not supported in this runtime");
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
export async function generateFingerprint(ip: string): Promise<string> {
  if (ip == "") {
    return "";
  }

  const analyze = await init();

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
  candidate: string,
  options?: EmailValidationConfig,
) {
  const analyze = await init();

  if (typeof analyze !== "undefined") {
    return analyze.isValidEmail(candidate, options);
  } else {
    // TODO: Fallback to JS if we don't have WASM?
    return true;
  }
}

export async function detectBot(
  headers: string,
  patterns_add: string,
  patterns_remove: string,
): Promise<BotDetectionResult> {
  const analyze = await init();

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
