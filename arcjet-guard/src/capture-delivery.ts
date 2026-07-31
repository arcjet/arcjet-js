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
   * Enqueue one event without blocking the caller.
   *
   * A `waitUntil` — supplied here, or discovered — is handed a promise that
   * settles when the queue has drained. It extends how long the invocation may
   * run; it does not make the event skip batching.
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
  let settledWaiters: Array<() => void> = [];

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
        notifyIfSettled();
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

  /**
   * Resolve once nothing is queued and nothing is in flight.
   *
   * This is what a platform `waitUntil` is handed: it keeps the invocation alive
   * until the events captured during it have actually been sent, without forcing
   * them to be sent one request at a time.
   *
   * Implemented by waking waiters from the drain path rather than by polling.
   * Re-checking through a resolved promise would build an unbroken microtask
   * chain while the queue waits out its batch window, and macrotasks — including
   * the batch timer that would have drained it — never get to run. That deadlocks
   * rather than waits.
   */
  function whenSettled(): Promise<void> {
    if (queue.length === 0 && pending.size === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      settledWaiters.push(resolve);
    });
  }

  /** Wake anything waiting on `whenSettled` once the pipeline is empty. */
  function notifyIfSettled(): void {
    if (queue.length > 0 || pending.size > 0 || settledWaiters.length === 0) {
      return;
    }
    const waiters = settledWaiters;
    settledWaiters = [];
    for (const resolve of waiters) {
      resolve();
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

      queue.push(event);
      if (queue.length >= batchSize) {
        drainQueue();
      } else {
        schedule();
      }

      // A platform `waitUntil` extends how long this invocation may run. That is
      // a lifetime concern, not a batching one, and conflating the two is a
      // mistake worth naming: sending each event as its own request — which this
      // used to do whenever a hook was present — costs one HTTP request per
      // event on exactly the platforms that generate the most events. A single
      // agent turn with thirty tool calls became thirty requests, against a
      // Worker's subrequest budget.
      //
      // Handing over a promise that settles when the pipeline drains keeps both
      // properties: events still batch, and the platform still keeps the
      // invocation alive until they have actually been sent.
      const waitUntil =
        typeof callWaitUntil === "function" ? callWaitUntil : safeWaitUntil(getWaitUntil);
      if (waitUntil !== undefined) {
        try {
          waitUntil(whenSettled());
        } catch {
          // A broken platform hook must not throw into application code. The
          // event stays queued and is still sent by the batch timer, or by a
          // later `flush()`.
        }
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

function hasUnref(value: unknown): value is { unref(): void } {
  return (
    value !== null &&
    typeof value === "object" &&
    "unref" in value &&
    typeof value.unref === "function"
  );
}

// The Symbol Vercel defines in their infrastructure to reach the request
// Context, which can carry `waitUntil`.
// https://github.com/vercel/vercel/blob/930d7fb892dc26f240f2b950d963931c45e1e661/packages/functions/src/get-context.ts#L6
const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");

/**
 * Discover Vercel's request-scoped `waitUntil` without a hard dependency.
 *
 * Same logic as `lookupWaitUntil` in the `arcjet` package, which `report()`
 * uses. It is duplicated rather than shared because that copy is private and
 * `arcjet` is not a dependency of this package; moving this package under
 * `arcjet` puts both in one module graph, which is the point to delete one.
 *
 * The two predicates below look like ceremony next to that copy's inline
 * `typeof` checks, but they are load-bearing here: inline narrowing leaves
 * `waitUntil` typed as `Function`, and this package's lint runs the type-aware
 * rules, so calling it trips `no-unsafe-call`. The predicates are how this stays
 * free of an unchecked cast on a value that came off `globalThis`.
 */
function lookupWaitUntil(): WaitUntil | undefined {
  const fromSymbol: typeof globalThis & {
    [SYMBOL_FOR_REQ_CONTEXT]?: unknown;
  } = globalThis;
  const provider = fromSymbol[SYMBOL_FOR_REQ_CONTEXT];
  if (!isContextProvider(provider)) {
    return undefined;
  }
  const vercelCtx: unknown = provider.get();
  if (isWaitUntilContext(vercelCtx)) {
    return (promise) => {
      vercelCtx.waitUntil(promise);
    };
  }
  return undefined;
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
