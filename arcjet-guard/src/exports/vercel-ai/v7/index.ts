/**
 * `@arcjet/guard/vercel-ai/v7` — everything this entrypoint publishes, named.
 *
 * The modules under `src/` are implementation. They export whatever suits
 * them; only what this file lists reaches anyone who installs the package, so
 * adding to the public API is a deliberate act rather than a side effect.
 *
 * @packageDocumentation
 */

export {
  ArcjetDeniedError,
  ArcjetGuardUnavailableError,
  aiToolsContext,
  captureAction,
  createAgentContext,
  guardAction,
  guardTool,
  securityMetadata,
} from "../../../vercel-ai/v7/index.ts";

export type {
  ArcjetAgentClient,
  ArcjetAgentContext,
  ArcjetDenialResult,
  CaptureActionOptions,
  CaptureOptions,
  GuardActionPolicy,
  GuardToolPolicy,
  OnGuardError,
  SecurityMetadataFields,
} from "../../../vercel-ai/v7/index.ts";
