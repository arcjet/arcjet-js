import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { create } from "@bufbuild/protobuf";

import { createCaptureDelivery } from "./capture-delivery.ts";
import type { ArcjetDiagnostic } from "./diagnostics.ts";
import { CaptureEventSchema, type CaptureEvent } from "./proto/proto/decide/v2/decide_pb.js";

function event(action: string): CaptureEvent {
  return create(CaptureEventSchema, {
    action,
    occurredAtUnixMs: 1n,
  });
}

function diagnostics(): {
  values: ArcjetDiagnostic[];
  diagnose: (diagnostic: ArcjetDiagnostic) => void;
} {
  const values: ArcjetDiagnostic[] = [];
  return {
    values,
    diagnose: (diagnostic): void => {
      values.push(diagnostic);
    },
  };
}

describe("createCaptureDelivery", () => {
  test("batches on size and sends each event once", async () => {
    const sent: string[][] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchSize: 2,
      batchDelayMs: 60_000,
      diagnose: local.diagnose,
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    delivery.capture(event("first"));
    delivery.capture(event("second"));
    await delivery.flush();

    assert.deepEqual(sent, [["first", "second"]]);
    assert.deepEqual(local.values, []);
  });

  test("batches on delay", async () => {
    const sent: string[][] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchSize: 10,
      batchDelayMs: 1,
      diagnose: local.diagnose,
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    delivery.capture(event("delayed"));
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 10);
    });

    assert.deepEqual(sent, [["delayed"]]);
    assert.deepEqual(local.values, []);
  });

  test("drops the newest event when the queue is full", async () => {
    const sent: string[][] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      queueSize: 2,
      batchSize: 10,
      batchDelayMs: 60_000,
      diagnose: local.diagnose,
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    delivery.capture(event("first"));
    delivery.capture(event("second"));
    delivery.capture(event("dropped"));
    await delivery.flush();

    assert.deepEqual(sent, [["first", "second"]]);
    assert.deepEqual(local.values, [
      {
        code: "AJ3001",
        message: "Capture queue is full; newest events were dropped",
        count: 1,
      },
    ]);
  });

  test("does not retry a failed batch", async () => {
    let sends = 0;
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchSize: 1,
      diagnose: local.diagnose,
      send(): Promise<void> {
        sends += 1;
        return Promise.reject(new Error("unavailable"));
      },
    });

    delivery.capture(event("failed"));
    await delivery.flush();

    assert.equal(sends, 1);
    assert.deepEqual(local.values, [
      {
        code: "AJ3002",
        message: "Capture batch send failed; events were dropped without retry",
        count: 1,
      },
    ]);
  });

  test("flush is repeatable and leaves the delivery worker usable", async () => {
    const sent: string[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 60_000,
      diagnose: local.diagnose,
      send(events): Promise<void> {
        sent.push(...events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    await delivery.flush();
    delivery.capture(event("first"));
    await delivery.flush();
    await delivery.flush();
    delivery.capture(event("second"));
    await delivery.flush();

    assert.deepEqual(sent, ["first", "second"]);
    assert.deepEqual(local.values, []);
  });

  test("flush expiry aborts in-flight sends and diagnoses their count", async () => {
    const local = diagnostics();
    let aborted = false;
    const delivery = createCaptureDelivery({
      batchSize: 1,
      diagnose: local.diagnose,
      send(_events, signal): Promise<void> {
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        });
      },
    });

    delivery.capture(event("slow"));
    await delivery.flush(1);

    assert.equal(aborted, true);
    assert.deepEqual(local.values, [
      {
        code: "AJ3003",
        message: "Capture flush deadline expired; remaining events were dropped",
        count: 1,
      },
    ]);
  });

  test("hands waitUntil a promise that settles once the batch is sent", async () => {
    const sent: string[][] = [];
    const pending: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 5,
      diagnose: local.diagnose,
      getWaitUntil(): (promise: Promise<unknown>) => void {
        return (promise) => {
          pending.push(promise);
        };
      },
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    delivery.capture(event("kept-alive"));

    // The hook is handed the promise synchronously, but the send has not
    // happened yet — the event is batching.
    assert.equal(pending.length, 1);
    assert.deepEqual(sent, []);

        // Drain via flush() rather than waiting on the batch timer. The timer is
    // unref'd so it cannot hold the process open, which means on Node 22 the
    // event loop can drain before it fires — the promise then never settles and
    // the test dies with "Promise resolution is still pending". flush() makes
    // the drain deterministic while still proving the handed promise settles
    // once the pipeline is empty.
    await delivery.flush(1000);
    await pending[0];

    assert.deepEqual(sent, [["kept-alive"]]);
    assert.deepEqual(local.values, []);
  });

  test("waitUntil does not turn a burst into one request per event", async () => {
    // The point of handing over a drain promise rather than a per-event send:
    // on the platforms that supply a waitUntil, an agent turn with many tool
    // calls used to cost one HTTP request each, against a subrequest budget.
    const sent: string[][] = [];
    const pending: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 5,
      batchSize: 50,
      diagnose: local.diagnose,
      getWaitUntil(): (promise: Promise<unknown>) => void {
        return (promise) => {
          pending.push(promise);
        };
      },
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    for (let index = 0; index < 30; index++) {
      delivery.capture(event(`tool.${index}`));
    }

        // Drain via flush() rather than waiting on the batch timer. The timer is
    // unref'd so it cannot hold the process open, which means on Node 22 the
    // event loop can drain before it fires — the promise then never settles and
    // the test dies with "Promise resolution is still pending". flush() makes
    // the drain deterministic while still proving the handed promise settles
    // once the pipeline is empty.
    await delivery.flush(1000);
    await Promise.all(pending);

    assert.equal(sent.length, 1, `expected one request, got ${sent.length}`);
    assert.equal(sent[0].length, 30);
    assert.deepEqual(local.values, []);
  });

  test("prefers a caller-supplied waitUntil over discovery", async () => {
    const sent: string[][] = [];
    const discovered: Promise<unknown>[] = [];
    const supplied: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 5,
      diagnose: local.diagnose,
      getWaitUntil(): (promise: Promise<unknown>) => void {
        return (promise) => {
          discovered.push(promise);
        };
      },
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    delivery.capture(event("supplied"), (promise) => {
      supplied.push(promise);
    });

    assert.equal(supplied.length, 1);
    assert.equal(discovered.length, 0);
        // Drain via flush() rather than waiting on the batch timer. The timer is
    // unref'd so it cannot hold the process open, which means on Node 22 the
    // event loop can drain before it fires — the promise then never settles and
    // the test dies with "Promise resolution is still pending". flush() makes
    // the drain deterministic while still proving the handed promise settles
    // once the pipeline is empty.
    await delivery.flush(1000);
    await supplied[0];

    assert.deepEqual(sent, [["supplied"]]);
    assert.deepEqual(local.values, []);
  });

  test("uses a supplied waitUntil when none is discoverable", async () => {
    const sent: string[][] = [];
    const pending: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 5,
      diagnose: local.diagnose,
      getWaitUntil: (): undefined => undefined,
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    delivery.capture(event("worker"), (promise) => {
      pending.push(promise);
    });

    assert.equal(pending.length, 1);
        // Drain via flush() rather than waiting on the batch timer. The timer is
    // unref'd so it cannot hold the process open, which means on Node 22 the
    // event loop can drain before it fires — the promise then never settles and
    // the test dies with "Promise resolution is still pending". flush() makes
    // the drain deterministic while still proving the handed promise settles
    // once the pipeline is empty.
    await delivery.flush(1000);
    await pending[0];

    assert.deepEqual(sent, [["worker"]]);
    assert.deepEqual(local.values, []);
  });

  test("a broken waitUntil hook does not lose the event or throw", async () => {
    const sent: string[][] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 5,
      diagnose: local.diagnose,
      getWaitUntil(): (promise: Promise<unknown>) => void {
        return () => {
          throw new Error("platform hook exploded");
        };
      },
      send(events): Promise<void> {
        sent.push(events.map((item) => item.action));
        return Promise.resolve();
      },
    });

    // Must not throw into the caller, and the event must still be delivered by
    // the ordinary batching path.
    delivery.capture(event("survives"));
    await delivery.flush(1000);

    assert.deepEqual(sent, [["survives"]]);
  });

  describe("Vercel request-context discovery", () => {
    const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");

    function withGlobalContext<T>(value: unknown, body: () => T): T {
      // Widened by declaration rather than by assertion, matching how the
      // source reaches the same symbol — an assertion here trips the
      // type-aware lint rules this package runs.
      const target: typeof globalThis & {
        [SYMBOL_FOR_REQ_CONTEXT]?: unknown;
      } = globalThis;
      const had = SYMBOL_FOR_REQ_CONTEXT in target;
      const previous = target[SYMBOL_FOR_REQ_CONTEXT];
      target[SYMBOL_FOR_REQ_CONTEXT] = value;
      try {
        return body();
      } finally {
        if (had) {
          target[SYMBOL_FOR_REQ_CONTEXT] = previous;
        } else {
          delete target[SYMBOL_FOR_REQ_CONTEXT];
        }
      }
    }

    test("discovers waitUntil and hands it the send promise", async () => {
      const local = diagnostics();
      const sent: string[][] = [];
      const handed: Array<Promise<unknown>> = [];

      await withGlobalContext(
        {
          get(): unknown {
            return {
              waitUntil(promise: Promise<unknown>): void {
                handed.push(promise);
              },
            };
          },
        },
        async () => {
          const delivery = createCaptureDelivery({
            batchDelayMs: 5,
            diagnose: local.diagnose,
            send(events): Promise<void> {
              sent.push(events.map((item) => item.action));
              return Promise.resolve();
            },
          });

          delivery.capture(event("vercel"));

          assert.equal(handed.length, 1, "the platform hook should receive one promise");
          // See the note above: drained via flush() so an unref'd timer cannot
          // leave this pending when the loop drains on Node 22.
          await delivery.flush(1000);
          await handed[0];
        },
      );

      assert.deepEqual(sent, [["vercel"]]);
      assert.deepEqual(local.values, []);
    });

    test("falls back to batching when the context has no waitUntil", async () => {
      const local = diagnostics();
      const sent: string[][] = [];

      await withGlobalContext(
        {
          get(): unknown {
            return {};
          },
        },
        async () => {
          const delivery = createCaptureDelivery({
            batchDelayMs: 0,
            diagnose: local.diagnose,
            send(events): Promise<void> {
              sent.push(events.map((item) => item.action));
              return Promise.resolve();
            },
          });

          delivery.capture(event("no-hook"));
          await delivery.flush(1000);
        },
      );

      assert.deepEqual(sent, [["no-hook"]]);
    });

    test("ignores a context provider that is not shaped as expected", async () => {
      const local = diagnostics();
      const sent: string[][] = [];

      // A non-object, and an object whose `get` is not callable, must both be
      // rejected without throwing into the caller.
      for (const provider of [42, { get: "nope" }]) {
        await withGlobalContext(provider, async () => {
          const delivery = createCaptureDelivery({
            batchDelayMs: 0,
            diagnose: local.diagnose,
            send(events): Promise<void> {
              sent.push(events.map((item) => item.action));
              return Promise.resolve();
            },
          });

          delivery.capture(event("bad-provider"));
          await delivery.flush(1000);
        });
      }

      assert.deepEqual(sent, [["bad-provider"], ["bad-provider"]]);
      assert.deepEqual(local.values, []);
    });

    test("a throwing context lookup does not reach the caller", async () => {
      const local = diagnostics();
      const sent: string[][] = [];

      await withGlobalContext(
        {
          get(): unknown {
            throw new Error("context exploded");
          },
        },
        async () => {
          const delivery = createCaptureDelivery({
            batchDelayMs: 0,
            diagnose: local.diagnose,
            send(events): Promise<void> {
              sent.push(events.map((item) => item.action));
              return Promise.resolve();
            },
          });

          // Must not throw: a platform context lookup is observational.
          delivery.capture(event("throwing-context"));
          await delivery.flush(1000);
        },
      );

      assert.deepEqual(sent, [["throwing-context"]]);
    });
  });
});
