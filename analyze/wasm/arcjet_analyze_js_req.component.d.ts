/**
* # Variants
* 
* ## `"unspecified"`
* 
* ## `"not-analyzed"`
* 
* ## `"automated"`
* 
* ## `"likely-automated"`
* 
* ## `"likely-not-a-bot"`
* 
* ## `"verified-bot"`
*/
export type BotType = 'unspecified' | 'not-analyzed' | 'automated' | 'likely-automated' | 'likely-not-a-bot' | 'verified-bot';
export interface BotDetectionResult {
  botType: BotType,
  botScore: number,
}
/**
* # Variants
* 
* ## `"valid"`
* 
* ## `"invalid"`
*/
export type EmailValidity = 'valid' | 'invalid';
export interface EmailValidationResult {
  validity: EmailValidity,
  blocked: string[],
}
export interface EmailValidationConfig {
  requireTopLevelDomain: boolean,
  allowDomainLiteral: boolean,
  blockedEmails: string[],
}
import { ArcjetJsReqEmailValidatorOverrides } from './interfaces/arcjet-js-req-email-validator-overrides.js';
import { ArcjetJsReqLogger } from './interfaces/arcjet-js-req-logger.js';
export interface ImportObject {
  'arcjet:js-req/email-validator-overrides': typeof ArcjetJsReqEmailValidatorOverrides,
  'arcjet:js-req/logger': typeof ArcjetJsReqLogger,
}
export interface Root {
  detectBot(headers: string, patternsAdd: string, patternsRemove: string): BotDetectionResult,
  generateFingerprint(request: string, characteristics: string[]): string,
  isValidEmail(candidate: string, options: EmailValidationConfig): EmailValidationResult,
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

