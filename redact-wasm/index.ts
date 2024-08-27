import type { ArcjetLogger } from "@arcjet/protocol";

import * as core from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type {
  ImportObject,
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
  SensitiveInfoConfig,
} from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type { ArcjetSensitiveInfoSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-sensitive-info-sensitive-information-identifier.js";

import { wasm as componentCoreWasm } from "./wasm/arcjet_analyze_bindings_redact.component.core.wasm?js";
import { wasm as componentCore2Wasm } from "./wasm/arcjet_analyze_bindings_redact.component.core2.wasm?js";
import { wasm as componentCore3Wasm } from "./wasm/arcjet_analyze_bindings_redact.component.core3.wasm?js";

interface AnalyzeContext {
  log: ArcjetLogger;
}

// TODO: Do we actually need this wasmCache or does `import` cache correctly?
const wasmCache = new Map<string, WebAssembly.Module>();

async function moduleFromPath(path: string): Promise<WebAssembly.Module> {
  const cachedModule = wasmCache.get(path);
  if (typeof cachedModule !== "undefined") {
    return cachedModule;
  }

  if (path === "arcjet_analyze_bindings_redact.component.core.wasm") {
    const mod = await componentCoreWasm();
    wasmCache.set(path, mod);
    return mod;
  }
  if (path === "arcjet_analyze_bindings_redact.component.core2.wasm") {
    const mod = await componentCore2Wasm();
    wasmCache.set(path, mod);
    return mod;
  }
  if (path === "arcjet_analyze_bindings_redact.component.core3.wasm") {
    const mod = await componentCore3Wasm();
    wasmCache.set(path, mod);
    return mod;
  }

  throw new Error(`Unknown path: ${path}`);
}

async function init(
  context: AnalyzeContext,
  detect?: typeof ArcjetSensitiveInfoSensitiveInformationIdentifier.detect,
) {
  const { log } = context;

  let detectOrDefault = detect;
  if (typeof detectOrDefault === "undefined") {
    detectOrDefault = () => [];
  }

  const coreImports: ImportObject = {
    "arcjet:sensitive-info/logger": {
      debug(msg) {
        log.debug(msg);
      },
    },
    "arcjet:sensitive-info/sensitive-information-identifier": {
      detect: detectOrDefault,
    },
  };

  try {
    return core.instantiate(moduleFromPath, coreImports);
  } catch {
    log.debug("WebAssembly is not supported in this runtime");
  }
}

export {
  type DetectedSensitiveInfoEntity as DetectedEntity,
  type SensitiveInfoEntity,
};

export async function detectSensitiveInfo(
  context: AnalyzeContext,
  candidate: string,
  entities: core.SensitiveInfoEntity[],
  contextWindowSize: number,
  detect?: typeof ArcjetSensitiveInfoSensitiveInformationIdentifier.detect,
): Promise<DetectedSensitiveInfoEntity[]> {
  const analyze = await init(context, detect);
  const skipCustomDetect = detect === undefined;

  const options: SensitiveInfoConfig = {
    entities,
    contextWindowSize,
    skipCustomDetect,
  };

  if (typeof analyze !== "undefined") {
    return analyze.detectSensitiveInfo(candidate, options);
  } else {
    throw new Error(
      "detectSensitiveInfo failed to run because wasm is not supported in this enviornment",
    );
  }
}
