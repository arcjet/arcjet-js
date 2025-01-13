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

import { wasm as componentCoreWasm } from "./wasm/arcjet_analyze_js_req.component.core.wasm?js";
import { wasm as componentCore2Wasm } from "./wasm/arcjet_analyze_js_req.component.core2.wasm?js";
import { wasm as componentCore3Wasm } from "./wasm/arcjet_analyze_js_req.component.core3.wasm?js";

type DetectSensitiveInfoFunction =
  typeof ArcjetJsReqSensitiveInformationIdentifier.detect;

const wasmCache = new Map<string, WebAssembly.Module>();

const componentCoreWasmPromise = componentCoreWasm();
const componentCore2WasmPromise = componentCore2Wasm();
const componentCore3WasmPromise = componentCore3Wasm();

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  const cachedModule = wasmCache.get(path);
  if (typeof cachedModule !== "undefined") {
    return cachedModule;
  }

  if (path === "arcjet_analyze_js_req.component.core.wasm") {
    const mod = await componentCoreWasmPromise;
    wasmCache.set(path, mod);
    return mod;
  }
  if (path === "arcjet_analyze_js_req.component.core2.wasm") {
    const mod = await componentCore2WasmPromise;
    wasmCache.set(path, mod);
    return mod;
  }
  if (path === "arcjet_analyze_js_req.component.core3.wasm") {
    const mod = await componentCore3WasmPromise;
    wasmCache.set(path, mod);
    return mod;
  }

  throw new Error(`Unknown path: ${path}`);
}

export async function initializeWasm(coreImports: ImportObject) {
  try {
    // Await the instantiation to catch the failure
    return instantiate(moduleFromPath, coreImports);
  } catch {
    return undefined;
  }
}

export {
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
