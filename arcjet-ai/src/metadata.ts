/**
 * Security metadata vocabulary for AI SDK guard calls.
 *
 * Field names and their server-side wire keys for audit, policy decisions,
 * and integration with Arcjet's security model.
 */

/**
 * Security dimensions passed to guard evaluations.
 *
 * Values are suggestions where noted; at runtime, any string is accepted.
 * Arcjet's guard enforces server-side caps (max 20 pairs, key ≤64 bytes,
 * value ≤512 bytes) so large maps may be dropped server-side.
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
  dataClass?: "public" | "internal" | "confidential" | "regulated" | (string & {});

  /**
   * Where the result or action is sent (service, system, user, external).
   */
  destination?: string;

  /**
   * Whether the action can be reversed (suggested: reversible, compensable, irreversible).
   */
  reversibility?: "reversible" | "compensable" | "irreversible";

  /**
   * Resource identifier affected by this action.
   */
  resource?: string;
}

/**
 * Map security metadata fields to their wire keys for Arcjet guard evaluation.
 *
 * Each field's value is passed through unchanged (type unions are suggestions,
 * not runtime validation). Undefined fields are omitted entirely — no empty
 * strings contribute to the map.
 *
 * @param fields - Security metadata dimensions
 * @returns A record mapping wire keys to string values, ready for guard context
 *
 * @example
 * ```ts
 * const metadata = securityMetadata({
 *   user: "user_alice",
 *   dataClass: "confidential",
 *   destination: "audit_service",
 * });
 * // → { user: "user_alice", "data-class": "confidential", destination: "audit_service" }
 * ```
 */
export function securityMetadata(fields: SecurityMetadataFields): Record<string, string> {
  const result: Record<string, string> = {};

  // Map each field to its wire key, omitting undefined values
  if (fields.user !== undefined) {
    result.user = fields.user;
  }
  if (fields.agent !== undefined) {
    result.agent = fields.agent;
  }
  if (fields.workflow !== undefined) {
    result.workflow = fields.workflow;
  }
  if (fields.dataClass !== undefined) {
    result["data-class"] = fields.dataClass;
  }
  if (fields.destination !== undefined) {
    result.destination = fields.destination;
  }
  if (fields.reversibility !== undefined) {
    result.reversibility = fields.reversibility;
  }
  if (fields.resource !== undefined) {
    result.resource = fields.resource;
  }

  return result;
}
