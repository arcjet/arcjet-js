import { instantiate } from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type {
  ImportObject,
  RedactedSensitiveInfoEntity,
  RedactSensitiveInfoConfig,
  SensitiveInfoEntity,
} from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type { ArcjetRedactCustomRedact } from "./wasm/interfaces/arcjet-redact-custom-redact.js";

import { wasm as componentCoreWasm } from "./wasm/arcjet_analyze_bindings_redact.component.core.wasm?js";
import { wasm as componentCore2Wasm } from "./wasm/arcjet_analyze_bindings_redact.component.core2.wasm?js";
import { wasm as componentCore3Wasm } from "./wasm/arcjet_analyze_bindings_redact.component.core3.wasm?js";

const componentCoreWasmPromise = componentCoreWasm();
const componentCore2WasmPromise = componentCore2Wasm();
const componentCore3WasmPromise = componentCore3Wasm();

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  if (path === "arcjet_analyze_bindings_redact.component.core.wasm") {
    return componentCoreWasmPromise;
  }
  if (path === "arcjet_analyze_bindings_redact.component.core2.wasm") {
    return componentCore2WasmPromise;
  }
  if (path === "arcjet_analyze_bindings_redact.component.core3.wasm") {
    return componentCore3WasmPromise;
  }

  throw new Error(`Unknown path: ${path}`);
}

/**
 * Initialize the WebAssembly.
 *
 * @param detect
 *   Custom detection function.
 * @param replace
 *   Custom replacement function.
 * @returns
 *   Promise to the initialized WebAssembly instance.
 */
export async function initializeWasm(
  detect: CustomDetect,
  replace: CustomRedact,
) {
  const coreImports: ImportObject = {
    "arcjet:redact/custom-redact": {
      detectSensitiveInfo: detect,
      redactSensitiveInfo: replace,
    },
  };

  try {
    // Await the instantiation to catch the failure
    return await instantiate(moduleFromPath, coreImports);
  } catch {
    console.debug("WebAssembly is not supported in this runtime");
  }
}

/**
 * Detect sensitive info.
 *
 * @param tokens
 *   Tokens to detect in.
 * @returns
 *   Array of detected entities.
 */
export type CustomDetect = typeof ArcjetRedactCustomRedact.detectSensitiveInfo;

/**
 * Redact sensitive info.
 *
 * @param entityType
 *   Entity to redact.
 * @param plaintext
 *   The plaintext string to redact.
 * @returns
 *   Redacted string.
 */
export type CustomRedact = typeof ArcjetRedactCustomRedact.redactSensitiveInfo;

export {
  type RedactedSensitiveInfoEntity,
  type RedactSensitiveInfoConfig,
  type SensitiveInfoEntity,
};
