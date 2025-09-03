import { instantiate } from "./wasm/arcjet_analyze_js_req.component.js";
import type { ImportObject } from "./wasm/arcjet_analyze_js_req.component.js";

import componentCoreWasm from "./wasm/arcjet_analyze_js_req.component.core.wasm?module";
import componentCore2Wasm from "./wasm/arcjet_analyze_js_req.component.core2.wasm?module";
import componentCore3Wasm from "./wasm/arcjet_analyze_js_req.component.core3.wasm?module";

async function moduleFromPath(path: string): Promise<WebAssemblyLike.Module> {
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

/**
 * Initialize the generated WebAssembly component.
 *
 * @param coreImports
 *   Things, typically functions, to pass into the component.
 * @returns
 *   Promise that resolves to the initialized component.
 */
export async function initializeWasm(coreImports: ImportObject) {
  try {
    return instantiate(moduleFromPath, coreImports);
  } catch {
    return undefined;
  }
}

export type {
  BotConfig,
  BotResult,
  DetectSensitiveInfoFunction,
  DetectedSensitiveInfoEntity,
  EmailValidationConfig,
  EmailValidationResult,
  ImportObject,
  FilterResult,
  SensitiveInfoEntities,
  SensitiveInfoEntity,
  SensitiveInfoResult,
} from "./types.js";
