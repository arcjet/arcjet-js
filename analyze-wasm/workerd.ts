import type { ArcjetLogger } from "@arcjet/protocol";

import { instantiate } from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  BotConfig,
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
  EmailValidationResult,
  BotResult,
  SensitiveInfoResult,
  EmailValidationConfig,
  SensitiveInfoEntities,
} from "./wasm/arcjet_analyze_js_req.component.js";
import type { ArcjetJsReqSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-js-req-sensitive-information-identifier.js";

import componentCoreWasm from "./wasm/arcjet_analyze_js_req.component.core.wasm";
import componentCore2Wasm from "./wasm/arcjet_analyze_js_req.component.core2.wasm";
import componentCore3Wasm from "./wasm/arcjet_analyze_js_req.component.core3.wasm";

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

export async function initializeWasm(
  context: AnalyzeContext,
  detect?: DetectSensitiveInfoFunction,
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
  type AnalyzeContext,
  type BotConfig,
  type DetectedSensitiveInfoEntity,
  type SensitiveInfoEntity,
  type EmailValidationConfig,
  type EmailValidationResult,
  type BotResult,
  type SensitiveInfoResult,
  type SensitiveInfoEntities,
  type DetectSensitiveInfoFunction,
};
