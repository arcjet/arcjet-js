/**
 * @packageDocumentation
 *
 * Framework-agnostic guard helpers: context, metadata vocabulary, and
 * guard/capture functions that never reach an AI SDK.
 *
 * @internal This barrel has no export map entry. Every symbol below reaches
 * users re-exported from a vendor namespace — today only
 * `@arcjet/guard/vercel-ai/v7`. The layer stays agnostic so that a second
 * vendor namespace costs nothing, and so it can be promoted into the root
 * export once more than one SDK has exercised it; until then a public
 * `@arcjet/guard/agents` would be a surface with one caller and no evidence
 * behind it.
 */

export { createAgentContext } from "./context.ts";
export type { ArcjetAgentContext } from "./context.ts";
export { securityMetadata } from "./vocabulary.ts";
export type { SecurityMetadataFields } from "./vocabulary.ts";
export {
  ArcjetDeniedError,
  ArcjetGuardUnavailableError,
  captureAction,
  guardAction,
} from "./guard-action.ts";
export type {
  CaptureActionOptions,
  GuardActionPolicy,
  OnGuardError,
} from "./guard-action.ts";
export type { ArcjetAgentClient } from "./capture.ts";
// Re-exported from the root so a caller building a `captureAction()` payload
// does not need a second import.
export type { CaptureOptions } from "../types.ts";
