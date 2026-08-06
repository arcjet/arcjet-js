/**
 * @packageDocumentation
 *
 * Vercel Eve namespace for Arcjet Guards.
 *
 * This module provides Eve-specific guard helpers plus the framework-agnostic
 * layer they build on, so an Eve agent needs one import path and no notion of
 * layering.
 *
 * **Requires the optional peer dependency `eve@>=0.30 <1`**, and Eve's own
 * Node floor of 24 — higher than `@arcjet/guard`'s. Nothing in this module
 * imports `eve` at runtime: every Eve type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls Eve in.
 *
 * **Note:** the version segment is `v0` because Eve is pre-1.0 and has never
 * published a 1.x. A `v1` namespace is added when Eve reaches 1.0; the segment
 * names the SDK's major, not this integration's iteration.
 */

export * from "../../agents/index.ts";
export { guardApproval } from "./guard-approval.ts";
export type { GuardApprovalPolicy } from "./guard-approval.ts";
