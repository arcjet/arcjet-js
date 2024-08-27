import type { ArcjetLogger } from "@arcjet/protocol";

import * as core from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type {
  ImportObject,
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
  SensitiveInfoConfig,
} from "./wasm/arcjet_analyze_bindings_redact.component.js";
import type { ArcjetSensitiveInfoSensitiveInformationIdentifier } from "./wasm/interfaces/arcjet-sensitive-info-sensitive-information-identifier.js";

import componentCoreWasm from "./wasm/arcjet_analyze_bindings_redact.component.core.wasm";
import componentCore2Wasm from "./wasm/arcjet_analyze_bindings_redact.component.core2.wasm";
import componentCore3Wasm from "./wasm/arcjet_analyze_bindings_redact.component.core3.wasm";

interface AnalyzeContext {
  log: ArcjetLogger;
}

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

export { type DetectedSensitiveInfoEntity as DetectedEntity, type SensitiveInfoEntity };

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
