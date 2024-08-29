import * as core from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type {
  ImportObject,
  RedactedSensitiveInfoEntity,
  RedactSensitiveInfoConfig,
  SensitiveInfoEntity,
} from "./wasm/arcjet_analyze_bindings_redact.component.js";
import componentCoreWasm from "./wasm/arcjet_analyze_bindings_redact.component.core.wasm";
import componentCore2Wasm from "./wasm/arcjet_analyze_bindings_redact.component.core2.wasm";
import componentCore3Wasm from "./wasm/arcjet_analyze_bindings_redact.component.core3.wasm";
import type { ArcjetRedactCustomRedact } from "./wasm/interfaces/arcjet-redact-custom-redact.js";

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  if (path === "arcjet_analyze_bindings_redact.component.core.wasm") {
    return componentCoreWasm;
  }
  if (path === "arcjet_analyze_bindings_redact.component.core2.wasm") {
    return componentCore2Wasm;
  }
  if (path === "arcjet_analyze_bindings_redact.component.core3.wasm") {
    return componentCore3Wasm;
  }

  throw new Error(`Unknown path: ${path}`);
}

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
    return core.instantiate(moduleFromPath, coreImports);
  } catch {
    console.debug("WebAssembly is not supported in this runtime");
  }
}

type CustomDetect = typeof ArcjetRedactCustomRedact.detectSensitiveInfo;
type CustomRedact = typeof ArcjetRedactCustomRedact.redactSensitiveInfo;

export {
  type CustomDetect,
  type CustomRedact,
  type RedactedSensitiveInfoEntity,
  type RedactSensitiveInfoConfig,
  type SensitiveInfoEntity,
};
