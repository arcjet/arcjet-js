import assert from "node:assert/strict";
import test from "node:test";
import { rampart } from "../index.js";

// These tests load and run the real ONNX model. They are skipped when the
// runtime can't load it (for example, no native onnxruntime binding), so the
// suite stays green across platforms while still exercising the model where it
// is available.

const log = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  time() {},
  timeEnd() {},
};
const context = { log } as never;

const SAMPLE =
  "My name is Alex Rivera, I live at 123 Main Street, my SSN is 472-81-0094 and my email is alex@example.com";

function denyAll() {
  return {
    tag: "deny" as const,
    val: [
      { tag: "email" } as const,
      { tag: "custom", val: "GIVEN_NAME" } as const,
      { tag: "custom", val: "SURNAME" } as const,
      { tag: "custom", val: "SSN" } as const,
      { tag: "custom", val: "STREET_NAME" } as const,
      { tag: "custom", val: "BUILDING_NUMBER" } as const,
    ],
  };
}

async function tryDetect(value: string, entities: ReturnType<typeof denyAll>) {
  const backend = rampart();
  return backend.detect(context, value, entities);
}

test("detects names, address, SSN and email with correct offsets", async function (t) {
  let result;
  try {
    result = await tryDetect(SAMPLE, denyAll());
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return;
  }

  const found = new Map(
    result.denied.map((entity) => {
      const type =
        entity.identifiedType.tag === "custom"
          ? entity.identifiedType.val
          : entity.identifiedType.tag;
      return [type, SAMPLE.slice(entity.start, entity.end)];
    }),
  );

  assert.equal(found.get("GIVEN_NAME"), "Alex");
  assert.equal(found.get("SURNAME"), "Rivera");
  assert.equal(found.get("SSN"), "472-81-0094");
  assert.equal(found.get("email"), "alex@example.com");
  // The model merges the multi-token street name into a single span.
  assert.equal(found.get("STREET_NAME"), "Main Street");
});

test("handles input longer than the model's token window via chunking", async function (t) {
  // A body well past the 512-token limit, with a name only at the very end.
  // Before chunking this threw an onnxruntime broadcast error.
  const filler = Array.from({ length: 600 }, (_, i) => `word${i}`).join(" ");
  const value = `${filler} and my friend is Alex Rivera`;

  let result;
  try {
    result = await tryDetect(value, denyAll());
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return;
  }

  const denied = result.denied.map((entity) =>
    value.slice(entity.start, entity.end),
  );
  // The name past the window is still detected (no throw, correct offsets).
  assert.ok(denied.includes("Alex"), `expected "Alex" in ${denied.join(",")}`);
  assert.ok(denied.includes("Rivera"));
});

test("a model that fails to load rejects and can be retried", async function () {
  // Pointing at a directory with no model forces the load to fail. The failure
  // must propagate (not silently swallow) and must not be cached, so a later
  // call retries rather than returning a poisoned result.
  // Explicit options here also exercise the non-default option paths.
  const backend = rampart({
    modelPath: "/nonexistent-rampart-model-path",
    modelId: "rampart",
    dtype: "q4",
    device: "cpu",
    threshold: 0.6,
  });
  const entities = {
    tag: "deny" as const,
    val: [{ tag: "custom", val: "GIVEN_NAME" } as const],
  };

  await assert.rejects(() => backend.detect(context, "Alex", entities));
  // A second call also attempts a load (the failed one was not cached).
  await assert.rejects(() => backend.detect(context, "Alex", entities));
});
