/**
 * Security metadata vocabulary for guard calls.
 *
 * Field names and their server-side wire keys for audit, policy decisions,
 * and integration with Arcjet's security model.
 */

import type { ArcjetMetadata } from "../types.ts";

/**
 * Security dimensions passed to guard evaluations.
 *
 * Optional metadata fields (key-value pairs) attached to tool calls and actions
 * for audit, policy decisions, and observability. Values are suggestions where
 * noted; at runtime, any string is accepted. Arcjet's guard enforces server-side
 * limits on the number of keys, key length, and value serialization size, so
 * large or deeply nested maps may be dropped server-side — see the Metadata
 * section of the `@arcjet/guard` README for current limits.
 *
 * Thread via `securityMetadata()` or merge directly into `ArcjetAgentContext.metadata`.
 */
export interface SecurityMetadataFields {
  /**
   * Whose authority the agent acts under (opaque ID, not PII).
   */
  user?: string;

  /**
   * Type or identity of the AI agent performing the action.
   */
  agent?: string;

  /**
   * Workflow stage or process name this request belongs to.
   */
  workflow?: string;

  /**
   * Data classification level (suggested: public, internal, confidential, regulated).
   */
  dataClass?: string;

  /**
   * Where the result or action is sent (service, system, user, external).
   */
  destination?: string;

  /**
   * Whether the action can be reversed (suggested: reversible, compensable, irreversible).
   */
  reversibility?: string;

  /**
   * Resource identifier affected by this action.
   */
  resource?: string;
}

/**
 * Maps each field to its guard wire key. Every key is its own name except
 * `dataClass`, which becomes the hyphenated `data-class`.
 */
const WIRE_KEYS = new Map<keyof SecurityMetadataFields, string>([
  ["user", "user"],
  ["agent", "agent"],
  ["workflow", "workflow"],
  ["dataClass", "data-class"],
  ["destination", "destination"],
  ["reversibility", "reversibility"],
  ["resource", "resource"],
]);

/**
 * Map security metadata fields to their wire keys for Arcjet guard evaluation.
 *
 * Each field's value is passed through unchanged (type unions are suggestions,
 * not runtime validation). Undefined fields are omitted; empty strings you pass
 * are kept.
 *
 * @param fields - Security metadata dimensions
 * @returns A record mapping wire keys to string values, ready for guard context
 *
 * @example
 * ```ts
 * import { createAgentContext, securityMetadata } from "@arcjet/guard/agents";
 *
 * const ctx = createAgentContext({
 *   correlationId: "req_12345",
 *   metadata: securityMetadata({
 *     user: "user_alice",
 *     dataClass: "confidential",
 *     destination: "audit_service",
 *   }),
 * });
 * // → context has metadata: { user: "user_alice", "data-class": "confidential", destination: "audit_service" }
 * ```
 */
export function securityMetadata(
  fields: SecurityMetadataFields,
): ArcjetMetadata {
  const result: Record<string, string> = {};

  for (const [field, wireKey] of WIRE_KEYS) {
    const value = fields[field];
    if (value !== undefined) {
      result[wireKey] = value;
    }
  }

  return result;
}
