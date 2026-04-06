/**
 * Guard RPC client for `@arcjet/guard`.
 *
 * Converts SDK rule objects to proto, calls the Guard RPC, and converts
 * the response back to SDK types.
 *
 * @packageDocumentation
 */

import { create } from "@bufbuild/protobuf";
import {
  ConnectError,
  type Transport,
  createClient as createConnectClient,
} from "@connectrpc/connect";

import { ruleToProto, decisionFromProto } from "./convert.ts";
import {
  DecideService,
  GuardRequestSchema,
  type GuardResponse,
} from "./proto/proto/decide/v2/decide_pb.js";
import { symbolArcjetInternal } from "./symbol.ts";
import type {
  Decision,
  GuardOptions,
  InternalDecision,
  InternalResult,
  RuleWithInput,
} from "./types.ts";
import { userAgent as defaultUserAgent } from "./version.ts";

/** Options for creating a guard client. */
export interface GuardClientOptions {
  /** Arcjet key. */
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
  const { key, transport, userAgent = defaultUserAgent() } = options;

  const client = createConnectClient(DecideService, transport);

  return {
    /**
     * Evaluate a set of guard rules and return a decision.
     *
     */
    async guard(opts: GuardOptions): Promise<Decision> {
      if (opts.rules.length === 0) {
        return failOpen("guard() requires at least one rule");
      }

      opts.signal?.throwIfAborted();

      const startMs = performance.now();

      let protoRules;
      try {
        protoRules = await Promise.all(opts.rules.map((rule: RuleWithInput) => ruleToProto(rule)));
      } catch (cause: unknown) {
        opts.signal?.throwIfAborted();
        const message = cause instanceof Error ? cause.message : "Local rule evaluation failed";
        return failOpen(message);
      }

      opts.signal?.throwIfAborted();

      const localEvalDurationMs = BigInt(Math.round(performance.now() - startMs));
      const sentAtUnixMs = BigInt(Date.now());

      const guardRequest = create(GuardRequestSchema, {
        userAgent,
        localEvalDurationMs,
        sentAtUnixMs,
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

      let response: GuardResponse;
      try {
        response = await client.guard(guardRequest, callOptions);
      } catch (cause: unknown) {
        opts.signal?.throwIfAborted();

        const message =
          cause instanceof ConnectError
            ? `[${cause.code}] ${cause.message}`
            : cause instanceof Error
              ? cause.message
              : "Unknown error";
        return failOpen(message);
      }

      opts.signal?.throwIfAborted();

      try {
        return decisionFromProto(response, opts.rules);
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : "Failed to parse server response";
        return failOpen(message);
      }
    },
  };
}

/**
 * Synthesize a fail-open ALLOW decision from a transport or server error.
 *
 * Used when the server returns a `ConnectError` (e.g. validation failure,
 * timeout, network error). The decision is ALLOW (fail-open) with a single
 * error result carrying the message.
 */
function failOpen(message: string): Decision {
  const errorResult: InternalResult = {
    conclusion: "ALLOW",
    reason: "ERROR",
    type: "RULE_ERROR",
    message,
    code: "TRANSPORT_ERROR",
    [symbolArcjetInternal]: { configId: "", inputId: "" },
  };
  const d: InternalDecision = {
    conclusion: "ALLOW" as const,
    id: "",
    results: [errorResult],
    hasError: () => true,
    [symbolArcjetInternal]: { results: [errorResult] },
  };
  return d;
}
