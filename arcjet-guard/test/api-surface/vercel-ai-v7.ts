/**
 * Every name `@arcjet/guard/vercel-ai/v7` exports, listed so that `tsc` fails if one is removed,
 * renamed, or changes between a value and a type.
 *
 * Type-only exports are erased before anything runs, so the sibling
 * `exports.test.ts` cannot see them; a re-export names them without
 * instantiating them, which keeps generic exports out of the way.
 *
 * This file is type checked and never executed.
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
} from "../../src/vercel-ai/v7/index";

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
} from "../../src/vercel-ai/v7/index";
