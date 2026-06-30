import assert from "node:assert/strict";
import test from "node:test";

import { rampart } from "../dist/index.js";
import { runRecognizers } from "../dist/recognizers.js";

const log = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  time() {},
  timeEnd() {},
};
const context = { log } as never;

const denyName = {
  tag: "deny" as const,
  val: [{ tag: "custom", val: "GIVEN_NAME" } as const],
};

const SAMPLE = "My name is Alex Rivera and I live at 123 Main Street.";

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

// The pure recognizer path always runs and must stay cheap.
test("recognizers process text quickly", function () {
  const value = SAMPLE.repeat(20);
  const iterations = 1000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    runRecognizers(value);
  }
  const perCall = (performance.now() - start) / iterations;
  // Generous bound: this is regex work and should be well under a millisecond.
  assert.ok(perCall < 5, `recognizers too slow: ${perCall.toFixed(3)}ms/call`);
});

test("model loads once and warm inference is fast", async function (t) {
  const backend = rampart();

  // Cold call includes one-time model load.
  const coldStart = performance.now();
  try {
    await backend.detect(context, SAMPLE, denyName);
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return;
  }
  const cold = performance.now() - coldStart;

  // Warm calls reuse the loaded model.
  const warm: number[] = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await backend.detect(context, SAMPLE, denyName);
    warm.push(performance.now() - start);
  }
  const p50 = percentile(warm, 50);

  t.diagnostic(`cold ${cold.toFixed(1)}ms, warm p50 ${p50.toFixed(2)}ms`);

  // The model is loaded once: warm calls are far cheaper than the cold call,
  // proving the pipeline was reused rather than reloaded. We deliberately avoid
  // an absolute millisecond bound here — wall-clock inference time is too
  // dependent on the (often shared, throttled) CI runner to assert reliably.
  assert.ok(p50 < cold, `warm p50 (${p50.toFixed(2)}ms) should beat cold (${cold.toFixed(1)}ms)`);
});
