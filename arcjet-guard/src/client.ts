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

import { ruleToProto, decisionFromProto, decisionMembers } from "./convert.ts";
import {
  DecideService,
  CaptureEventSchema,
  CaptureRequestSchema,
  GuardRequestSchema,
  type GuardResponse,
} from "./proto/proto/decide/v2/decide_pb.js";
import { symbolArcjetInternal } from "./symbol.ts";
import type {
  CaptureOptions,
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
 * Create a guard client that calls the Guard and Capture RPCs.
 *
 * Returns an object with `guard()` and `capture()` methods. The client is
 * stateless — it can be shared across requests.
 */
export function createGuardClient(options: GuardClientOptions): {
  guard(opts: GuardOptions): Promise<Decision>;
  capture(opts: CaptureOptions): void;
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
        protoRules = await Promise.all(
          opts.rules.map((rule: RuleWithInput) => ruleToProto(rule, opts.signal)),
        );
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
        correlationId: opts.correlationId ?? "",
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

    /** Record a fact about what the application did. */
    capture(opts: CaptureOptions): void {
      // Fire-and-forget, like report() in the request SDK: capture() never
      // awaits or throws into caller code — a failure of any kind (bad
      // input, transport error, server rejection) silently drops the event.
      // Capture is best-effort by contract (the ack means "received", not
      // "durably recorded" — see the capture ADR); while it is experimental
      // the SDK has no logger to report drops through, so they are silent.
      // Event IDs are authored by the server on receipt, not minted here.
      try {
        const sentAtUnixMs = BigInt(Date.now());

        const event = create(CaptureEventSchema, {
          occurredAtUnixMs: sentAtUnixMs,
          correlationId: opts.correlationId ?? "",
          decisionId: opts.decisionId ?? "",
          action: opts.action,
          metadata: opts.metadata ?? {},
        });

        const captureRequest = create(CaptureRequestSchema, {
          userAgent,
          sentAtUnixMs,
          events: [event],
        });

        client
          .capture(captureRequest, {
            headers: { Authorization: `Bearer ${key}` },
            timeoutMs: 1000,
          })
          // oxlint-disable-next-line promise/always-return
          .then(() => {})
          .catch(() => {
            // Dropped silently — see above.
          });
      } catch {
        // Dropped silently — see above.
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
    warnings: [],
    message,
    code: "TRANSPORT_ERROR",
    [symbolArcjetInternal]: { configId: "", inputId: "" },
  };
  const results = [errorResult];
  const d: InternalDecision = {
    conclusion: "ALLOW" as const,
    id: "",
    results,
    // A transport failure is an error (the request could not be processed),
    // carried as the error result above — not a warning.
    ...decisionMembers("ALLOW", results, []),
    [symbolArcjetInternal]: { results },
  };
  return d;
}
