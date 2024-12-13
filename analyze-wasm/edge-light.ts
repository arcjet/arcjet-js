import type { ArcjetLogger } from "@arcjet/protocol";

import { instantiate } from "./wasm/arcjet_analyze_js_req.component.js";
import type {
  ImportObject,
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
  BotConfig,
  EmailValidationResult,
  BotResult,
  SensitiveInfoResult,
  EmailValidationConfig,
  SensitiveInfoEntities,
} from "./wasm/arcjet_analyze_js_req.component.js";
import type { ArcjetJsReqSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-js-req-sensitive-information-identifier.js";

import componentCoreWasm from "./wasm/arcjet_analyze_js_req.component.core.wasm?module";
import componentCore2Wasm from "./wasm/arcjet_analyze_js_req.component.core2.wasm?module";
import componentCore3Wasm from "./wasm/arcjet_analyze_js_req.component.core3.wasm?module";

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

export async function initializeWasm(
  context: AnalyzeContext,
  coreImports: ImportObject,
) {
  const { log } = context;

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
  type ImportObject,
};
