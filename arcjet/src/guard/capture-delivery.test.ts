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

  test("uses waitUntil for an immediate send instead of queueing", async () => {
    const sent: string[][] = [];
    const pending: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 60_000,
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

    delivery.capture(event("immediate"));
    assert.equal(pending.length, 1);
    await pending[0];

    assert.deepEqual(sent, [["immediate"]]);
    assert.deepEqual(local.values, []);
  });

  test("prefers a caller-supplied waitUntil over discovery", async () => {
    const sent: string[][] = [];
    const discovered: Promise<unknown>[] = [];
    const supplied: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 60_000,
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
    await supplied[0];

    assert.deepEqual(sent, [["supplied"]]);
    assert.deepEqual(local.values, []);
  });

  test("sends immediately with a supplied waitUntil when none is discoverable", async () => {
    const sent: string[][] = [];
    const pending: Promise<unknown>[] = [];
    const local = diagnostics();
    const delivery = createCaptureDelivery({
      batchDelayMs: 60_000,
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
    await pending[0];

    assert.deepEqual(sent, [["worker"]]);
    assert.deepEqual(local.values, []);
  });
});
