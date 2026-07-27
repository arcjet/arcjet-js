import type { DiagnosticHandler } from "./diagnostics.ts";
import type { CaptureEvent } from "./proto/proto/decide/v2/decide_pb.js";

/** A platform hook that extends the current invocation for background work. */
export type WaitUntil = (promise: Promise<unknown>) => void;

/** Internal tuning controls, exposed for deterministic tests. */
export type CaptureDeliveryOptions = {
  /** Send one batch exactly once. */
  send: (events: readonly CaptureEvent[], signal: AbortSignal) => Promise<void>;
  /** Report a local failure that cannot travel over the wire. */
  diagnose: DiagnosticHandler;
  /**
   * Discover a platform `waitUntil` hook for this call, used only when the
   * caller did not supply one.
   *
   * Defaults to Vercel's request-context lookup, the only hook discoverable
   * without help. Platforms whose `waitUntil` is per invocation — Cloudflare's
   * `ExecutionContext` above all — cannot be discovered from a module-scoped
   * client and must supply it per call instead.
   */
  getWaitUntil?: () => WaitUntil | undefined;
  /** Most queued and in-flight events held in memory. */
  queueSize?: number;
  /** Most events in one Capture request. */
  batchSize?: number;
  /** Longest an event waits for a batch to fill. */
  batchDelayMs?: number;
};

/** Bounded, send-once delivery for best-effort capture events. */
export type CaptureDelivery = {
  /**
   * Enqueue or hand off one event without blocking the caller.
   *
   * A caller-supplied `waitUntil` takes precedence over discovery, matching how
   * `report()` prefers `ArcjetContext.waitUntil` over its own lookup.
   */
  capture(event: CaptureEvent, waitUntil?: WaitUntil): void;
  /** Drain queued and in-flight events within a deadline. */
  flush(timeoutMs?: number): Promise<void>;
};

type PendingBatch = {
  readonly count: number;
  readonly controller: AbortController;
  promise: Promise<void>;
  droppedByFlush: boolean;
};

const DEFAULT_QUEUE_SIZE = 1000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_BATCH_DELAY_MS = 100;

/**
 * Create bounded, send-once delivery for best-effort capture events.
 *
 * The design follows the small bounded-buffer pattern used by telemetry SDKs:
 * one event queue, one pending-send set, and one unref'd batch timer. A full
 * buffer drops instead of blocking, and failed sends are never retried.
 */
export function createCaptureDelivery(options: CaptureDeliveryOptions): CaptureDelivery {
  const queueSize = positiveInteger(options.queueSize, DEFAULT_QUEUE_SIZE);
  const batchSize = positiveInteger(options.batchSize, DEFAULT_BATCH_SIZE);
  const batchDelayMs = nonnegativeInteger(options.batchDelayMs, DEFAULT_BATCH_DELAY_MS);
  const getWaitUntil = options.getWaitUntil ?? lookupWaitUntil;
  const queue: CaptureEvent[] = [];
  const pending = new Set<PendingBatch>();
  let buffered = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function diagnoseDrop(code: "AJ3001" | "AJ3002" | "AJ3003", count: number): void {
    const messages = {
      AJ3001: "Capture queue is full; newest events were dropped",
      AJ3002: "Capture batch send failed; events were dropped without retry",
      AJ3003: "Capture flush deadline expired; remaining events were dropped",
    } as const;
    options.diagnose({ code, message: messages[code], count });
  }

  function startBatch(events: readonly CaptureEvent[]): PendingBatch {
    const controller = new AbortController();
    let batch: PendingBatch;
    const promise = Promise.resolve()
      .then(() => options.send(events, controller.signal))
      .catch(() => {
        if (!batch.droppedByFlush) {
          diagnoseDrop("AJ3002", batch.count);
        }
      })
      .finally(() => {
        if (pending.delete(batch)) {
          buffered -= batch.count;
        }
      });
    batch = {
      count: events.length,
      controller,
      promise,
      droppedByFlush: false,
    };
    pending.add(batch);
    return batch;
  }

  function drainQueue(): void {
    clearTimer();
    while (queue.length > 0) {
      startBatch(queue.splice(0, batchSize));
    }
  }

  function schedule(): void {
    if (timer !== undefined) {
      return;
    }
    timer = setTimeout(() => {
      timer = undefined;
      drainQueue();
    }, batchDelayMs);
    unrefTimer(timer);
  }

  return {
    capture(event: CaptureEvent, callWaitUntil?: WaitUntil): void {
      if (buffered >= queueSize) {
        diagnoseDrop("AJ3001", 1);
        return;
      }
      buffered += 1;

      const waitUntil =
        typeof callWaitUntil === "function" ? callWaitUntil : safeWaitUntil(getWaitUntil);
      if (waitUntil !== undefined) {
        const promise = startBatch([event]).promise;
        try {
          waitUntil(promise);
        } catch {
          // The send already started. A broken platform hook must not make the
          // event send twice or throw into application code.
        }
        return;
      }

      queue.push(event);
      if (queue.length >= batchSize) {
        drainQueue();
      } else {
        schedule();
      }
    },

    async flush(timeoutMs = 1000): Promise<void> {
      drainQueue();
      const batches = [...pending];
      if (batches.length === 0) {
        return;
      }

      const deadline = nonnegativeInteger(timeoutMs, 1000);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const expired = new Promise<"expired">((resolve) => {
        timeout = setTimeout(() => {
          resolve("expired");
        }, deadline);
      });
      const drained = Promise.all(batches.map((batch) => batch.promise)).then(
        () => "drained" as const,
      );

      const result = await Promise.race([drained, expired]);
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      if (result === "drained") {
        return;
      }

      let dropped = 0;
      for (const batch of batches) {
        if (pending.delete(batch)) {
          batch.droppedByFlush = true;
          buffered -= batch.count;
          dropped += batch.count;
          batch.controller.abort();
        }
      }
      if (dropped > 0) {
        diagnoseDrop("AJ3003", dropped);
      }
    },
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && value !== undefined && value > 0 ? value : fallback;
}

function nonnegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && value !== undefined && value >= 0 ? value : fallback;
}

function safeWaitUntil(getWaitUntil: () => WaitUntil | undefined): WaitUntil | undefined {
  try {
    return getWaitUntil();
  } catch {
    // A platform context lookup is observational.
    return undefined;
  }
}

function unrefTimer(timer: ReturnType<typeof setTimeout>): void {
  if (hasUnref(timer)) {
    timer.unref();
  }
}

const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context");

/** Discover Vercel's request-scoped `waitUntil` without a hard dependency. */
function lookupWaitUntil(): WaitUntil | undefined {
  const globalWithContext: typeof globalThis & {
    [VERCEL_REQUEST_CONTEXT]?: unknown;
  } = globalThis;
  const provider = globalWithContext[VERCEL_REQUEST_CONTEXT];
  if (!isContextProvider(provider)) {
    return;
  }
  const context: unknown = provider.get();
  if (isWaitUntilContext(context)) {
    return (promise) => {
      context.waitUntil(promise);
    };
  }
  return undefined;
}

function hasUnref(value: unknown): value is { unref(): void } {
  return (
    value !== null &&
    typeof value === "object" &&
    "unref" in value &&
    typeof value.unref === "function"
  );
}

function isContextProvider(value: unknown): value is { get(): unknown } {
  return (
    value !== null && typeof value === "object" && "get" in value && typeof value.get === "function"
  );
}

function isWaitUntilContext(value: unknown): value is { waitUntil: WaitUntil } {
  return (
    value !== null &&
    typeof value === "object" &&
    "waitUntil" in value &&
    typeof value.waitUntil === "function"
  );
}
