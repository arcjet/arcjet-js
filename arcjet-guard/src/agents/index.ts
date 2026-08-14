/**
 * @packageDocumentation
 *
 * Framework-agnostic guard helpers: context, metadata vocabulary, and
 * guard/capture functions that never reach an AI SDK.
 *
 * @internal This barrel has no export map entry. Every symbol below reaches
 * users re-exported from a vendor namespace — `@arcjet/guard/vercel-ai/v7`,
 * `@arcjet/guard/vercel-eve/v0`, and `@arcjet/guard/mastra/v1`. The layer
 * stays agnostic so multiple vendor namespaces can share the same code. A
 * public `@arcjet/guard/agents` path is still a follow-up with its own ADR.
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
