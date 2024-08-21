import type { SensitiveInfoEntity } from "./interfaces/arcjet-sensitive-info-sensitive-information-identifier.js";
export { SensitiveInfoEntity };
export interface DetectConfig {
  entities: Array<SensitiveInfoEntity>;
  contextWindowSize?: number;
  skipCustomDetect: boolean;
}
export interface DetectedEntity {
  start: number;
  end: number;
  identifiedType: SensitiveInfoEntity;
}
import { ArcjetSensitiveInfoLogger } from "./interfaces/arcjet-sensitive-info-logger.js";
import { ArcjetSensitiveInfoSensitiveInformationIdentifier } from "./interfaces/arcjet-sensitive-info-sensitive-information-identifier.js";
export interface ImportObject {
  "arcjet:sensitive-info/logger": typeof ArcjetSensitiveInfoLogger;
  "arcjet:sensitive-info/sensitive-information-identifier": typeof ArcjetSensitiveInfoSensitiveInformationIdentifier;
}
export interface Root {
  detectSensitiveInfo(
    content: string,
    options: DetectConfig,
  ): Array<DetectedEntity>;
}

/**
 * Instantiates this component with the provided imports and
 * returns a map of all the exports of the component.
 *
 * This function is intended to be similar to the
 * `WebAssembly.instantiate` function. The second `imports`
 * argument is the "import object" for wasm, except here it
 * uses component-model-layer types instead of core wasm
 * integers/numbers/etc.
 *
 * The first argument to this function, `getCoreModule`, is
 * used to compile core wasm modules within the component.
 * Components are composed of core wasm modules and this callback
 * will be invoked per core wasm module. The caller of this
 * function is responsible for reading the core wasm module
 * identified by `path` and returning its compiled
 * `WebAssembly.Module` object. This would use `compileStreaming`
 * on the web, for example.
 */
export function instantiate(
  getCoreModule: (path: string) => WebAssembly.Module,
  imports: ImportObject,
  instantiateCore?: (
    module: WebAssembly.Module,
    imports: Record<string, any>,
  ) => WebAssembly.Instance,
): Root;
export function instantiate(
  getCoreModule: (
    path: string,
  ) => WebAssembly.Module | Promise<WebAssembly.Module>,
  imports: ImportObject,
  instantiateCore?: (
    module: WebAssembly.Module,
    imports: Record<string, any>,
  ) => WebAssembly.Instance | Promise<WebAssembly.Instance>,
): Root | Promise<Root>;