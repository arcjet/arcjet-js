import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createDiagnosticHandler } from "./diagnostics.ts";

describe("createDiagnosticHandler", () => {
  test("the default logger reports each code once per quiet period", (context) => {
    const messages: string[] = [];
    context.mock.method(console, "warn", (message: string) => {
      messages.push(message);
    });
    const diagnose = createDiagnosticHandler();

    diagnose({
      code: "AJ3001",
      message: "Capture queue is full; newest events were dropped",
      count: 1,
    });
    diagnose({
      code: "AJ3001",
      message: "Capture queue is full; newest events were dropped",
      count: 2,
    });
    diagnose({
      code: "AJ3002",
      message: "Capture batch send failed; events were dropped without retry",
      count: 3,
    });

    assert.equal(messages.length, 2);
    // Rendered by `@arcjet/logger`, so the line carries the shared `✦Aj WARN`
    // prefix and the code and count arrive as structured fields rather than
    // being interpolated into the message text.
    assert.match(messages[0], /^✦Aj WARN Capture queue is full/);
    assert.match(messages[0], /code: "AJ3001"/);
    assert.match(messages[0], /count: 1/);
    assert.match(messages[1], /^✦Aj WARN Capture batch send failed/);
    assert.match(messages[1], /code: "AJ3002"/);
    assert.match(messages[1], /count: 3/);
  });

  test("sends every diagnostic to a caller-provided logger", () => {
    const calls: Array<{ fields: Record<string, unknown>; message: string }> = [];
    const diagnose = createDiagnosticHandler({
      logger: {
        warn(fields, message): void {
          if (typeof fields !== "string" && typeof message === "string") {
            calls.push({ fields, message });
          }
        },
      },
    });
    const diagnostic = {
      code: "AJ3001" as const,
      message: "Capture queue is full; newest events were dropped",
      count: 2,
    };

    diagnose(diagnostic);
    diagnose(diagnostic);

    assert.deepEqual(calls, [
      {
        fields: { code: "AJ3001", count: 2 },
        message: "Capture queue is full; newest events were dropped",
      },
      {
        fields: { code: "AJ3001", count: 2 },
        message: "Capture queue is full; newest events were dropped",
      },
    ]);
  });

  test("swallows exceptions from the logger", () => {
    const diagnose = createDiagnosticHandler({
      logger: {
        warn(): void {
          throw new Error("broken logger");
        },
      },
    });

    assert.doesNotThrow(() => {
      diagnose({
        code: "AJ3000",
        message: "Capture input was invalid; the event was dropped",
        count: 1,
      });
    });
  });

  test("a supplied logger is never coalesced", () => {
    // The caller does the filtering, and anything keeping a metric of dropped
    // events needs every diagnostic rather than one line per quiet period.
    const seen: number[] = [];
    const diagnose = createDiagnosticHandler({
      logger: {
        warn(fields): void {
          if (typeof fields !== "string" && typeof fields.count === "number") {
            seen.push(fields.count);
          }
        },
      },
    });

    for (let index = 0; index < 1000; index++) {
      diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    }

    assert.equal(seen.length, 1000);
  });

  test("the default sink accumulates suppressed counts, and drain releases them", (context) => {
    // The defect this exists for: suppressing without accumulating reported one
    // event out of a thousand, understating the burst by three orders of
    // magnitude.
    const messages: string[] = [];
    context.mock.method(console, "warn", (message: string) => {
      messages.push(message);
    });
    const diagnose = createDiagnosticHandler({ coalesceMs: 60_000, now: () => 0 });

    for (let index = 0; index < 1000; index++) {
      diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    }

    // Only the first is reported; the other 999 are held.
    assert.equal(messages.length, 1);
    assert.match(messages[0], /count: 1$/m);

    diagnose.drain();

    assert.equal(messages.length, 2);
    assert.match(messages[1], /count: 999$/m);
  });

  test("the quiet period expiring releases the accumulated total", (context) => {
    const messages: string[] = [];
    context.mock.method(console, "warn", (message: string) => {
      messages.push(message);
    });
    let clock = 0;
    const diagnose = createDiagnosticHandler({
      coalesceMs: 60_000,
      now: () => clock,
    });

    diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    for (let index = 0; index < 9; index++) {
      diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    }
    clock = 61_000;
    diagnose({ code: "AJ3001", message: "queue full", count: 1 });

    assert.equal(messages.length, 2);
    assert.match(messages[0], /count: 1$/m);
    // The nine held, plus the one that reopened the window.
    assert.match(messages[1], /count: 10$/m);
  });

  test("codes coalesce independently", (context) => {
    const messages: string[] = [];
    context.mock.method(console, "warn", (message: string) => {
      messages.push(message);
    });
    const diagnose = createDiagnosticHandler({ coalesceMs: 60_000, now: () => 0 });

    diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    diagnose({ code: "AJ3002", message: "send failed", count: 2 });
    diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    diagnose.drain();

    const codes = messages.map((line) => /code: "(AJ\d+)"/.exec(line)?.[1]);
    assert.deepEqual(codes, ["AJ3001", "AJ3002", "AJ3001"]);
  });

  test("draining with nothing held back is silent", (context) => {
    const messages: string[] = [];
    context.mock.method(console, "warn", (message: string) => {
      messages.push(message);
    });
    const diagnose = createDiagnosticHandler({ coalesceMs: 60_000, now: () => 0 });

    diagnose({ code: "AJ3001", message: "queue full", count: 1 });
    const before = messages.length;
    diagnose.drain();
    diagnose.drain();

    assert.equal(messages.length, before);
  });

  test("a diagnostic with no count keeps it absent", () => {
    const fields: Array<Record<string, unknown>> = [];
    const diagnose = createDiagnosticHandler({
      logger: {
        warn(first): void {
          if (typeof first !== "string") {
            fields.push(first);
          }
        },
      },
    });

    diagnose({ code: "AJ1001", message: "field dropped" });

    assert.deepEqual(fields, [{ code: "AJ1001" }]);
  });

  test("drain never throws when the sink does", () => {
    const diagnose = createDiagnosticHandler({
      logger: {
        warn(): void {
          throw new Error("sink exploded");
        },
      },
      coalesceMs: 60_000,
      now: () => 0,
    });

    diagnose({ code: "AJ3001", message: "queue full", count: 1 });

    assert.doesNotThrow(() => {
      diagnose.drain();
    });
  });
});
