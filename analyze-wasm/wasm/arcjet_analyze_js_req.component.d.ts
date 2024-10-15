import type { SensitiveInfoEntity } from './interfaces/arcjet-js-req-sensitive-information-identifier.js';
export { SensitiveInfoEntity };
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
  blocked: Array<string>,
}
export interface EmailValidationConfig {
  requireTopLevelDomain: boolean,
  allowDomainLiteral: boolean,
  blockedEmails: Array<string>,
}
export type SensitiveInfoEntities = SensitiveInfoEntitiesAllow | SensitiveInfoEntitiesDeny;
export interface SensitiveInfoEntitiesAllow {
  tag: 'allow',
  val: Array<SensitiveInfoEntity>,
}
export interface SensitiveInfoEntitiesDeny {
  tag: 'deny',
  val: Array<SensitiveInfoEntity>,
}
export interface SensitiveInfoConfig {
  entities: SensitiveInfoEntities,
  contextWindowSize?: number,
  skipCustomDetect: boolean,
}
export interface DetectedSensitiveInfoEntity {
  start: number,
  end: number,
  identifiedType: SensitiveInfoEntity,
}
export interface SensitiveInfoResult {
  allowed: Array<DetectedSensitiveInfoEntity>,
  denied: Array<DetectedSensitiveInfoEntity>,
}
export type BotEntity = string;
export interface AllowedBotConfig {
  entities: Array<BotEntity>,
  skipCustomDetect: boolean,
}
export interface DeniedBotConfig {
  entities: Array<BotEntity>,
  skipCustomDetect: boolean,
}
export type BotConfig = BotConfigAllowedBotConfig | BotConfigDeniedBotConfig;
export interface BotConfigAllowedBotConfig {
  tag: 'allowed-bot-config',
  val: AllowedBotConfig,
}
export interface BotConfigDeniedBotConfig {
  tag: 'denied-bot-config',
  val: DeniedBotConfig,
}
export interface BotResult {
  allowed: Array<BotEntity>,
  denied: Array<BotEntity>,
}
import { ArcjetJsReqEmailValidatorOverrides } from './interfaces/arcjet-js-req-email-validator-overrides.js';
import { ArcjetJsReqLogger } from './interfaces/arcjet-js-req-logger.js';
import { ArcjetJsReqSensitiveInformationIdentifier } from './interfaces/arcjet-js-req-sensitive-information-identifier.js';
export interface ImportObject {
  'arcjet:js-req/email-validator-overrides': typeof ArcjetJsReqEmailValidatorOverrides,
  'arcjet:js-req/logger': typeof ArcjetJsReqLogger,
  'arcjet:js-req/sensitive-information-identifier': typeof ArcjetJsReqSensitiveInformationIdentifier,
}
export interface Root {
  detectBot(request: string, options: BotConfig): BotResult,
  generateFingerprint(request: string, characteristics: Array<string>): string,
  isValidEmail(candidate: string, options: EmailValidationConfig): EmailValidationResult,
  detectSensitiveInfo(content: string, options: SensitiveInfoConfig): SensitiveInfoResult,
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

