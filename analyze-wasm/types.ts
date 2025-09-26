import type {
  BotConfig as GeneratedBotConfig,
  BotResult as GeneratedBotResult,
  DetectedSensitiveInfoEntity as GeneratedDetectedSensitiveInfoEntity,
  EmailValidationConfig as GeneratedEmailValidationConfig,
  EmailValidationResult as GeneratedEmailValidationResult,
  ImportObject as GeneratedImportObject,
  FilterResult as GeneratedFilterResult,
  SensitiveInfoEntities as GeneratedSensitiveInfoEntities,
  SensitiveInfoEntity as GeneratedSensitiveInfoEntity,
  SensitiveInfoResult as GeneratedSensitiveInfoResult,
} from "./wasm/arcjet_analyze_js_req.component.js";
import type { detect } from "./wasm/interfaces/arcjet-js-req-sensitive-information-identifier.js";

/**
 * Configuration for bot detection.
 * Generated from the WebAssembly component.
 */
export type BotConfig = GeneratedBotConfig;

/**
 * Result of bot detection.
 * Generated from the WebAssembly component.
 */
export type BotResult = GeneratedBotResult;

/**
 * Function signature for custom entity detection from JavaScript.
 *
 * Generated from the WebAssembly component.
 *
 * This signature corresponds to similar functions from `@arcjet/redact-wasm`
 * and `@arcjet/redact`.
 *
 * @param tokens
 *   Tokens to detect in.
 * @returns
 *   Array of `undefined` for tokens that are not sensitive or a `string` used as
 *   a label for sensitive info.
 */
export type DetectSensitiveInfoFunction = typeof detect;

/**
 * Span of sensitive info,
 * with `start` and `end` fields relating to the input value,
 * and an `identifiedType` tag for its kind.
 * Generated from the WebAssembly component.
 */
export type DetectedSensitiveInfoEntity = GeneratedDetectedSensitiveInfoEntity;

/**
 * Configuration for email validation.
 * Generated from the WebAssembly component.
 */
export type EmailValidationConfig = GeneratedEmailValidationConfig;

/**
 * Result of email validation.
 * Generated from the WebAssembly component.
 */
export type EmailValidationResult = GeneratedEmailValidationResult;

/**
 * Result of a filter call.
 * Generated from the WebAssembly component.
 */
export type FilterResult = GeneratedFilterResult;

/**
 * Object representing the import structure.
 * These are things that can be passed *into* the WebAssembly.
 * Generated from the WebAssembly component.
 */
export type ImportObject = GeneratedImportObject;

/**
 * Configuration for sensitive info detection.
 * Generated from the WebAssembly component.
 */
export type SensitiveInfoEntities = GeneratedSensitiveInfoEntities;

/**
 * Kind of sensitive info.
 * Consists of each of the tags that can detect be detected natively
 * and a custom tag for values detected from JavaScript.
 * Generated from the WebAssembly component.
 */
export type SensitiveInfoEntity = GeneratedSensitiveInfoEntity;

/**
 * Result of sensitive info detection.
 * Generated from the WebAssembly component.
 */
export type SensitiveInfoResult = GeneratedSensitiveInfoResult;

// Mark file as module.
export {};
