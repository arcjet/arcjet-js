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

import {
  createCaptureDelivery,
  type CaptureDeliveryOptions,
  type WaitUntil,
} from "./capture-delivery.ts";
import { ruleToProto, decisionFromProto, decisionMembers } from "./convert.ts";
import { createDiagnosticHandler, type DiagnosticLogger } from "./diagnostics.ts";
import {
  type ArcjetMetadata,
  type LocalWarning,
  encodeMetadata,
  enforceMetadataBudget,
} from "./metadata.ts";
import {
  DecideService,
  CaptureEventSchema,
  CaptureRequestSchema,
  GuardRequestSchema,
  type GuardResponse,
  WarningSchema,
} from "./proto/proto/decide/v2/decide_pb.js";
import { symbolArcjetInternal } from "./symbol.ts";
import type {
  CaptureOptions,
  Decision,
  GuardOptions,
  InternalDecision,
  InternalResult,
  RuleWithInput,
  Warning,
} from "./types.ts";
import { userAgent as defaultUserAgent } from "./version.ts";

/**
 * The `source` set on every event this SDK produces from an explicit
 * `capture()` call, recording where the event came from.
 *
 * An open string on the wire rather than an enum, because the set of producers
 * isn't fixed — a future span-conversion path sends `"otlp"`. The server never
 * substitutes a default, so an SDK that sends nothing leaves the origin
 * unknown, which is deliberately distinct from `"sdk"`.
 */
const CAPTURE_SOURCE_SDK = "sdk";

/** Options for creating a guard client. */
export interface GuardClientOptions {
  /** Arcjet key. */
  key: string;
  /** Connect RPC transport. */
  transport: Transport;
  /** User-agent product token (e.g. `"arcjet-guard-js/0.1.0"`). */
  userAgent?: string;
  /** Local diagnostics sink. */
  logger?: DiagnosticLogger;
  /** @internal Capture delivery controls used by deterministic tests. */
  captureDelivery?: Omit<CaptureDeliveryOptions, "send" | "diagnose">;
}

/**
 * Create a guard client that calls the Guard and Capture RPCs.
 *
 * The client can be shared across requests.
 */
export function createGuardClient(options: GuardClientOptions): {
  guard(opts: GuardOptions): Promise<Decision>;
  capture(opts: CaptureOptions): void;
  flush(timeoutMs?: number): Promise<void>;
} {
  const { key, transport, userAgent = defaultUserAgent() } = options;

  const client = createConnectClient(DecideService, transport);
  // Spread rather than `{ logger: options.logger }`: under
  // `exactOptionalPropertyTypes` an explicit `undefined` is not assignable to an
  // optional property.
  const diagnose = createDiagnosticHandler(
    options.logger === undefined ? {} : { logger: options.logger },
  );
  const delivery = createCaptureDelivery({
    ...options.captureDelivery,
    diagnose,
    async send(events, signal): Promise<void> {
      const captureRequest = create(CaptureRequestSchema, {
        userAgent,
        sentAtUnixMs: BigInt(Date.now()),
        events: [...events],
      });
      await client.capture(captureRequest, {
        headers: { Authorization: `Bearer ${key}` },
        timeoutMs: 1000,
        signal,
      });
    },
  });

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

    /** Record a fact about what the application did. */
    capture(opts: CaptureOptions): void {
      // Capture is a never-throw, best-effort API. Plain JavaScript callers can
      // bypass the TypeScript types, and proxies/getters can throw while values
      // are inspected, so the entire normalization path stays inside this
      // boundary.
      try {
        const normalized = normalizeCaptureOptions(opts);
        if (normalized === undefined) {
          diagnose({
            code: "AJ3000",
            message: "Capture input was invalid; the event was dropped",
            count: 1,
          });
          return;
        }

        const occurredAtUnixMs =
          normalized.occurredAt === undefined
            ? BigInt(Date.now())
            : BigInt(normalized.occurredAt.getTime());
        const encoded = encodeMetadata(normalized.metadata);
        const warnings = [
          ...normalized.localWarnings,
          ...encoded.localWarnings,
          ...enforceMetadataBudget([encoded.metadataJson]),
        ];
        for (const warning of warnings) {
          diagnose(warning);
        }

        const event = create(CaptureEventSchema, {
          occurredAtUnixMs,
          correlationId: normalized.correlationId ?? "",
          decisionId: normalized.decisionId ?? "",
          action: normalized.action,
          metadataJson: encoded.metadataJson,
          localWarnings: warnings.map((warning) => create(WarningSchema, warning)),
          // Where the event came from. This method is the explicit-call path, so
          // it is always "sdk"; a future span-conversion path sets "otlp". Not a
          // caller option on purpose — the producer decides, not the caller.
          //
          // The server never defaults this, so sending nothing would leave the
          // event's origin unknown rather than merely unstated.
          source: CAPTURE_SOURCE_SDK,
        });

        // Read outside the normalization above so a throwing getter costs the
        // delivery hint rather than the whole event.
        delivery.capture(event, readWaitUntil(opts));
      } catch {
        diagnose({
          code: "AJ3000",
          message: "Capture input was invalid; the event was dropped",
          count: 1,
        });
      }
    },

    /** Drain buffered capture events within a deadline. */
    async flush(timeoutMs?: number): Promise<void> {
      await delivery.flush(timeoutMs);
      // Release counts the diagnostics channel is holding back. Without this a
      // burst of drops that stops reports only its first event.
      diagnose.drain();
    },
  };
}

/**
 * Normalize a capture envelope without letting one invalid optional field drop
 * the whole event.
 *
 * Metadata values are validated by `encodeMetadata`: a value that cannot be
 * represented as JSON drops only that key and becomes a per-event warning.
 */
function normalizeCaptureOptions(value: unknown):
  | {
      action: string;
      correlationId?: string;
      decisionId?: string;
      occurredAt?: Date;
      metadata?: ArcjetMetadata;
      localWarnings: LocalWarning[];
    }
  | undefined {
  if (!isPlainObject(value)) {
    return;
  }

  const action = readProperty(value, "action");
  if (!action.ok || typeof action.value !== "string" || action.value.length === 0) {
    return;
  }

  const normalized: {
    action: string;
    correlationId?: string;
    decisionId?: string;
    occurredAt?: Date;
    metadata?: ArcjetMetadata;
    localWarnings: LocalWarning[];
  } = {
    action: action.value,
    localWarnings: [],
  };

  const correlationId = readProperty(value, "correlationId");
  if (correlationId.ok && typeof correlationId.value === "string") {
    normalized.correlationId = correlationId.value;
  } else if (!correlationId.ok || correlationId.value !== undefined) {
    normalized.localWarnings.push(captureOptionDropped("correlationId"));
  }

  const decisionId = readProperty(value, "decisionId");
  if (decisionId.ok && typeof decisionId.value === "string") {
    normalized.decisionId = decisionId.value;
  } else if (!decisionId.ok || decisionId.value !== undefined) {
    normalized.localWarnings.push(captureOptionDropped("decisionId"));
  }

  const occurredAt = readProperty(value, "occurredAt");
  // Pre-epoch dates are rejected because the wire field is unsigned: a negative
  // millisecond value can't be represented and would wrap to an enormous
  // timestamp. Dropping the field and warning beats sending a wrong one.
  if (
    occurredAt.ok &&
    occurredAt.value instanceof Date &&
    Number.isFinite(occurredAt.value.getTime()) &&
    occurredAt.value.getTime() >= 0
  ) {
    normalized.occurredAt = occurredAt.value;
  } else if (!occurredAt.ok || occurredAt.value !== undefined) {
    normalized.localWarnings.push(captureOptionDropped("occurredAt"));
  }

  const metadata = readProperty(value, "metadata");
  if (metadata.ok && isPlainObject(metadata.value)) {
    normalized.metadata = metadata.value;
  } else if (!metadata.ok || metadata.value !== undefined) {
    normalized.localWarnings.push(captureOptionDropped("metadata"));
  }

  return normalized;
}

/** Read one capture option without allowing a throwing getter to hide siblings. */
function readProperty(
  value: Record<string, unknown>,
  property: string,
): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: value[property] };
  } catch {
    return { ok: false };
  }
}

/**
 * Read a caller-supplied `waitUntil` without trusting the input.
 *
 * A missing or non-callable value is treated as absent rather than warned
 * about. Unlike the fields that reach the server, this one only selects a
 * delivery path, and falling back to batching is what omitting it does anyway.
 */
function readWaitUntil(opts: unknown): WaitUntil | undefined {
  if (!isPlainObject(opts)) {
    return undefined;
  }
  const waitUntil = readProperty(opts, "waitUntil");
  if (waitUntil.ok && isWaitUntil(waitUntil.value)) {
    return waitUntil.value;
  }
  return undefined;
}

/**
 * Whether a value can be called as a `waitUntil` hook.
 *
 * A predicate rather than an assertion: narrowing `unknown` to a function type
 * is all we can check at runtime, and writing it as a guard keeps the claim
 * where the check is instead of asserting past it at the call site.
 */
function isWaitUntil(value: unknown): value is WaitUntil {
  return typeof value === "function";
}

/** Describe an optional capture field dropped by client-side normalization. */
function captureOptionDropped(property: string): LocalWarning {
  return {
    code: "AJ1001",
    message: `capture.${property} was invalid and was dropped by the SDK`,
  };
}

/** Whether a value is a plain object whose properties can be inspected. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
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
