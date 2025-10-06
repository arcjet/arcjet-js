// Support `?js` and such:
//
/// <reference types="./wasm.js" />

import { instantiate } from "./wasm/arcjet_analyze_js_req.component.js";
import type { ImportObject } from "./wasm/arcjet_analyze_js_req.component.js";

import { wasm as componentCoreWasm } from "./wasm/arcjet_analyze_js_req.component.core.wasm?js";
import { wasm as componentCore2Wasm } from "./wasm/arcjet_analyze_js_req.component.core2.wasm?js";
import { wasm as componentCore3Wasm } from "./wasm/arcjet_analyze_js_req.component.core3.wasm?js";

const componentCoreWasmPromise = componentCoreWasm();
const componentCore2WasmPromise = componentCore2Wasm();
const componentCore3WasmPromise = componentCore3Wasm();

async function moduleFromPath(path: string): Promise<WebAssemblyLike.Module> {
  if (path === "arcjet_analyze_js_req.component.core.wasm") {
    return componentCoreWasmPromise;
  }
  if (path === "arcjet_analyze_js_req.component.core2.wasm") {
    return componentCore2WasmPromise;
  }
  if (path === "arcjet_analyze_js_req.component.core3.wasm") {
    return componentCore3WasmPromise;
  }

  // TODO(@wooorm-arcjet): figure out a test case that makes this throw.
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
    // Await the instantiation to catch the failure
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
