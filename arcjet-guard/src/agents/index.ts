/**
 * @packageDocumentation
 *
 * Framework-agnostic guard helpers: context, metadata vocabulary, and
 * guard/capture functions that never reach an AI SDK.
 *
 * @internal This barrel has no export map entry. Every symbol below reaches
 * users re-exported from a vendor namespace — `@arcjet/guard/vercel-ai/v7`
 * and `@arcjet/guard/vercel-eve/v0`. The layer stays agnostic so multiple
 * vendor namespaces can share the same code. A second vendor namespace now
 * exists, which was the evidence the subpath-namespaces ADR wanted before
 * promoting the layer to the root export; making that change is a follow-up
 * with its own ADR, so until then there is no public `@arcjet/guard/agents`.
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
