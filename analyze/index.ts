import type { ArcjetLogger } from "@arcjet/protocol";

import { instantiate } from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  BotType,
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
} from "./wasm/arcjet_analyze_js_req.component.js";
import type { ArcjetJsReqSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-js-req-sensitive-information-identifier.js";

import { wasm as componentCoreWasm } from "./wasm/arcjet_analyze_js_req.component.core.wasm?js";
import { wasm as componentCore2Wasm } from "./wasm/arcjet_analyze_js_req.component.core2.wasm?js";
import { wasm as componentCore3Wasm } from "./wasm/arcjet_analyze_js_req.component.core3.wasm?js";

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

type CustomDetect = typeof ArcjetJsReqSensitiveInformationIdentifier.detect;

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

function noOpDetect(): SensitiveInfoEntity[] {
  return [];
}

export async function initializeWasm(
  context: AnalyzeContext,
  detect?: CustomDetect,
) {
  const { log } = context;

  if (typeof detect !== "function") {
    detect = noOpDetect;
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
      detect,
    },
  };

  try {
    // Await the instantiation to catch the failure
    return instantiate(moduleFromPath, coreImports);
  } catch {
    log.debug("WebAssembly is not supported in this runtime");
  }
}

export {
  type BotType,
  type DetectedSensitiveInfoEntity,
  type SensitiveInfoEntity,
};
