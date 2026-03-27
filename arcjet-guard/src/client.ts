/**
 * Guard RPC client for `@arcjet/guard`.
 *
 * Converts SDK rule objects to proto, calls the Guard RPC, and converts
 * the response back to SDK types.
 *
 * @packageDocumentation
 */

import { create } from "@bufbuild/protobuf";
import { type Transport, createClient as createConnectClient } from "@connectrpc/connect";

import { ruleToProto, decisionFromProto } from "./convert.ts";
import { DecideService, GuardRequestSchema } from "./proto/proto/decide/v2/decide_pb.js";
import type { Decision, GuardOptions, RuleWithInput } from "./types.ts";

/** Options for creating a guard client. */
export interface GuardClientOptions {
  /** Arcjet API key. */
  key: string;
  /** Connect RPC transport. */
  transport: Transport;
  /** User-agent product token (e.g. `"arcjet-guard-js/0.1.0"`). */
  userAgent?: string;
}

/**
 * Create a guard client that calls the Guard RPC.
 *
 * Returns an object with a single `guard()` method. The client is
 * stateless — it can be shared across requests.
 */
export function createGuardClient(options: GuardClientOptions): {
  guard(opts: GuardOptions): Promise<Decision>;
} {
  const { key, transport, userAgent = "arcjet-guard-js/0.1.0" } = options;

  const client = createConnectClient(DecideService, transport);

  return {
    /**
     * Evaluate a set of guard rules and return a decision.
     *
     * @throws {Error} If `rules` is empty.
     */
    async guard(opts: GuardOptions): Promise<Decision> {
      if (opts.rules.length === 0) {
        throw new Error("guard() requires at least one rule");
      }

      const startMs = performance.now();

      const protoRules = await Promise.all(
        opts.rules.map((rule: RuleWithInput) => ruleToProto(rule)),
      );

      const localEvalMs = BigInt(Math.round(performance.now() - startMs));
      const sentAtMs = BigInt(Date.now());

      const guardRequest = create(GuardRequestSchema, {
        userAgent,
        localEvalMs,
        sentAtMs,
        label: opts.label,
        metadata: opts.metadata ?? {},
        ruleSubmissions: protoRules,
      });

      const timeoutMs =
        opts.timeoutSeconds !== undefined && opts.timeoutSeconds !== 0
          ? opts.timeoutSeconds * 1000
          : 1000;

      const callOptions: {
        headers: Record<string, string>;
        timeoutMs: number;
        signal?: AbortSignal;
      } = {
        headers: { Authorization: `Bearer ${key}` },
        timeoutMs: timeoutMs,
      };

      if (opts.signal) {
        callOptions.signal = opts.signal;
      }

      const response = await client.guard(guardRequest, callOptions);

      return decisionFromProto(response, opts.rules);
    },
  };
}
