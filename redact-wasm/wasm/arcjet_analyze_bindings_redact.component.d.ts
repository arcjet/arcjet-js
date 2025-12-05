// world root:component/root
export type SensitiveInfoEntity = import('./interfaces/arcjet-redact-custom-redact.js').SensitiveInfoEntity;
export interface RedactSensitiveInfoConfig {
  entities?: Array<SensitiveInfoEntity>,
  contextWindowSize?: number,
  skipCustomDetect: boolean,
  skipCustomRedact: boolean,
}
export interface RedactedSensitiveInfoEntity {
  original: string,
  redacted: string,
  start: number,
  end: number,
  identifiedType: SensitiveInfoEntity,
}
import type * as ArcjetRedactCustomRedact from './interfaces/arcjet-redact-custom-redact.js'; // arcjet:redact/custom-redact
export interface ImportObject {
  'arcjet:redact/custom-redact': typeof ArcjetRedactCustomRedact,
}
export interface Root {
  redact(content: string, options: RedactSensitiveInfoConfig): Array<RedactedSensitiveInfoEntity>,
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
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => WebAssembly.Instance
): Root;
export function instantiate(
getCoreModule: (path: string) => WebAssembly.Module | Promise<WebAssembly.Module>,
imports: ImportObject,
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => WebAssembly.Instance | Promise<WebAssembly.Instance>
): Root | Promise<Root>;

