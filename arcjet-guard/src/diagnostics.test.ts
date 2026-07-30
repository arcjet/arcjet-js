import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createDiagnosticHandler } from "./diagnostics.ts";

describe("createDiagnosticHandler", () => {
  test("the default logger reports each code once", (context) => {
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
      warn(fields, message): void {
        if (typeof fields !== "string" && typeof message === "string") {
          calls.push({ fields, message });
        }
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
      warn(): void {
        throw new Error("broken logger");
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
});
