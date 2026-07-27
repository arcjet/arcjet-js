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
  type LocalWarning,
  encodeMetadata,
  enforceMetadataBudget,
} from "./metadata.ts";
import {
  DecideService,
  GuardRequestSchema,
  type GuardResponse,
  WarningSchema,
} from "./proto/proto/decide/v2/decide_pb.js";
import { symbolArcjetInternal } from "./symbol.ts";
import type {
  Decision,
  GuardOptions,
  InternalDecision,
  InternalResult,
  RuleWithInput,
  Warning,
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

      // Metadata keys the SDK could not encode. These are reported to the server
      // as untrusted `local_warnings` and surfaced on `decision.warnings`. The
      // envelope is encoded up front so its warnings survive a local rule
      // failure; rule conversion contributes the rest below.
      const requestMetadata = encodeMetadata(opts.metadata);
      const warnings: LocalWarning[] = [];

      const startMs = performance.now();

      let protoRules;
      try {
        // Rules convert concurrently, so each one collects into its own array and
        // they are flattened in rule order afterwards. Pushing into one shared
        // array would order warnings by whichever conversion finished first.
        const converted = await Promise.all(
          opts.rules.map(async function (rule: RuleWithInput, ruleIndex: number) {
            const ruleWarnings: LocalWarning[] = [];
            const submission = await ruleToProto(rule, opts.signal, {
              ruleIndex,
              warningsOut: ruleWarnings,
            });
            return { submission, warnings: ruleWarnings };
          }),
        );
        protoRules = converted.map(function (entry) {
          return entry.submission;
        });
        warnings.push(
          ...converted.flatMap(function (entry) {
            return entry.warnings;
          }),
        );
      } catch (cause: unknown) {
        opts.signal?.throwIfAborted();
        const message = cause instanceof Error ? cause.message : "Local rule evaluation failed";
        return failOpen(message, toWarnings(requestMetadata.localWarnings));
      }

      opts.signal?.throwIfAborted();

      const localEvalDurationMs = BigInt(Math.round(performance.now() - startMs));
      const sentAtUnixMs = BigInt(Date.now());

      // Trim to the SDK ceiling across every metadata map on the request — the
      // envelope plus one per rule — so an oversized blob cannot push the request
      // past the 1 MiB protocol limit and get it rejected. A rejected request is
      // a fail open, which would let metadata affect the decision.
      warnings.push(
        ...requestMetadata.localWarnings,
        ...enforceMetadataBudget([
          requestMetadata.metadataJson,
          ...protoRules.map(function (rule) {
            return rule.metadataJson;
          }),
        ]),
      );

      const guardRequest = create(GuardRequestSchema, {
        userAgent,
        localEvalDurationMs,
        sentAtUnixMs,
        label: opts.label,
        metadataJson: requestMetadata.metadataJson,
        localWarnings: warnings.map((warning) => create(WarningSchema, warning)),
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
        return failOpen(message, toWarnings(warnings));
      }

      opts.signal?.throwIfAborted();

      try {
        return decisionFromProto(response, opts.rules, toWarnings(warnings));
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : "Failed to parse server response";
        return failOpen(message, toWarnings(warnings));
      }
    },
  };
}

/**
 * Synthesize a fail-open ALLOW decision from a transport or server error.
 *
 * Used when the server returns a `ConnectError` (e.g. validation failure,
 * timeout, network error). The decision is ALLOW (fail-open) with a single
 * error result carrying the message, plus any client-side metadata warnings so
 * a dropped key is still reported when the call itself failed.
 */
function toWarnings(localWarnings: readonly LocalWarning[]): readonly Warning[] {
  return localWarnings.map((warning) => ({
    code: warning.code,
    message: warning.message,
  }));
}

function failOpen(message: string, warnings: readonly Warning[] = []): Decision {
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
    // A transport failure is an error (the request could not be processed) and
    // is carried as the error result above, not a warning. `warnings` holds only
    // client-side metadata drops, which are independent of the failure.
    ...decisionMembers("ALLOW", results, warnings),
    [symbolArcjetInternal]: { results },
  };
  return d;
}
