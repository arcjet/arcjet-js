/**
 * @packageDocumentation
 *
 * Framework-agnostic guard helpers: context, metadata vocabulary, and guard/capture
 * functions usable with no AI SDK installed. For AI SDK–specific wrappers
 * (Vercel AI SDK), see `@arcjet/guard/vercel-ai/v7`.
 *
 * Import from `@arcjet/guard/agents`:
 *
 * ```ts
 * import {
 *   createAgentContext,
 *   guardAction,
 *   captureAction,
 *   ArcjetDeniedError,
 * } from "@arcjet/guard/agents";
 * ```
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
export type { ArcjetAgentClient, CaptureOptions } from "./capture.ts";
