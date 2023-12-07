import initWasm, {
  detect_bot,
  generate_fingerprint,
  is_valid_email,
  type EmailValidationConfig,
} from "./wasm/arcjet_analyze_js_req";

export { type EmailValidationConfig };

type WasmAPI = {
  /**
   * The WASM detect_bot function. Initialized by calling `init()`. Defined at a
   * class level to avoid having to load the WASM module multiple times.
   */
  detectBot: typeof detect_bot;
  /**
   * The WASM fingerprint function. Initialized by calling `init()`. Defined at
   * a class level to avoid having to load the WASM module multiple times.
   */
  fingerprint: typeof generate_fingerprint;
  /**
   * The WASM email validation function. Initialized by calling `init()`. Defined at
   * a class level to avoid having to load the WASM module multiple times.
   */
  isValidEmail: typeof is_valid_email;
};

type WasmState = "initialized" | "uninitialized" | "unsupported" | "errored";

let state: WasmState = "uninitialized";

/**
 * Initialize the WASM module. This can be explicitly called after creating
 * the client, but it will be called automatically if it has not been called
 * when the first request is made. This uses a factory-style pattern because
 * the call must be async and the constructor cannot be async.
 */
async function init(): Promise<WasmAPI | undefined> {
  if (state === "errored" || state === "unsupported") return;

  if (typeof WebAssembly === "undefined") {
    state = "unsupported";
    return;
  }

  if (state === "uninitialized") {
    let wasmModule: WebAssembly.Module;
    // We use `NEXT_RUNTIME` env var to DCE the Node/Browser code in the `else` block
    // possible values: "edge" | "nodejs" | undefined
    if (process.env["NEXT_RUNTIME"] === "edge") {
      const mod = await import(
        // @ts-expect-error
        "./wasm/arcjet_analyze_js_req_bg.wasm?module"
      );
      wasmModule = mod.default;
    } else {
      const { wasm } = await import("./wasm/arcjet.wasm.js");
      wasmModule = await WebAssembly.compile(wasm);
    }

    try {
      await initWasm(wasmModule);
      state = "initialized";
    } catch (err) {
      state = "errored";
      return;
    }
  }

  return {
    detectBot: detect_bot,
    fingerprint: generate_fingerprint,
    isValidEmail: is_valid_email,
  };
}

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

  // We use `NEXT_RUNTIME` env var to DCE the JS fallback code in the `else` block
  // possible values: "edge" | "nodejs" | undefined
  if (process.env["NEXT_RUNTIME"] === "edge") {
    const analyze = await init();
    // We HAVE to have the WasmAPI in Edge
    const fingerprint = analyze!.fingerprint(ip);
    return fingerprint;
  } else {
    const analyze = await init();
    if (typeof analyze !== "undefined") {
      const fingerprint = analyze.fingerprint(ip);
      return fingerprint;
    } else {
      // Conditional import because it's not available in some runtimes, we know
      // it is when running on Vercel serverless functions.
      // TODO(#180): Avoid nodejs-specific import
      const createHash = await import("crypto");

      // Fingerprint v1 is just the IP address
      const fingerprintRaw = `fp_1_${ip}`;

      const fingerprint = createHash
        .createHash("sha256")
        .update(fingerprintRaw)
        .digest("hex");
      return fingerprint;
    }
  }
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

/**
 * Represents the result of the bot detection.
 *
 * @property `bot_type` - What type of bot this is. This will be one of `BotType`.
 * @property `bot_score` - A score ranging from 0 to 99 representing the degree of
 * certainty. The higher the number within the type category, the greater the
 * degree of certainty. E.g. `BotType.Automated` with a score of 1 means we are
 * sure the request was made by an automated bot. `BotType.LikelyNotABot` with a
 * score of 30 means we don't think this request was a bot, but it's lowest
 * confidence level. `BotType.LikelyNotABot` with a score of 99 means we are
 * almost certain this request was not a bot.
 */
export interface BotResult {
  bot_type: number;
  bot_score: number;
}

export async function detectBot(
  headers: string,
  patterns_add: string,
  patterns_remove: string,
): Promise<BotResult> {
  const analyze = await init();

  if (typeof analyze !== "undefined") {
    return analyze.detectBot(headers, patterns_add, patterns_remove);
  } else {
    // TODO: Fallback to JS if we don't have WASM?
    return {
      bot_type: 1, // NOT_ANALYZED
      bot_score: 0,
    };
  }
}
