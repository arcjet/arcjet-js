import { ArcjetRateLimitStorage } from './interfaces/arcjet-rate-limit-storage.js';
import { ArcjetRateLimitTime } from './interfaces/arcjet-rate-limit-time.js';
export interface ImportObject {
  'arcjet:rate-limit/storage': typeof ArcjetRateLimitStorage,
  'arcjet:rate-limit/time': typeof ArcjetRateLimitTime,
}
export interface Root {
  tokenBucket(config: string, request: string): string,
  fixedWindow(config: string, request: string): string,
  slidingWindow(config: string, request: string): string,
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
getCoreModule: (path: string) => Promise<WebAssembly.Module>,
imports: ImportObject,
instantiateCore?: (module: WebAssembly.Module, imports: Record<string, any>) => Promise<WebAssembly.Instance>
): Promise<Root>;

