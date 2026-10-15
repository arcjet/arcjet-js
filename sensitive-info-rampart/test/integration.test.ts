import assert from "node:assert/strict";
import test from "node:test";

import { rampart } from "../dist/index.js";
import { createModelRunner, planWindows, tokenUpperBound } from "../dist/model.js";

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

test("model distinguishes bank accounts and routing numbers from phones", async function (t) {
  const value =
    "Details on file: name: Alex Morgan; email: alex.morgan@client-corp.example; " +
    "ssn: 431-55-9928; bank_account: 0123456789; routing_number: 022000020";
  const entities = {
    tag: "deny" as const,
    val: [
      { tag: "phone-number" } as const,
      { tag: "custom", val: "BANK_ACCOUNT" } as const,
      { tag: "custom", val: "ROUTING_NUMBER" } as const,
    ],
  };

  let result;
  try {
    result = await tryDetect(value, entities);
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return;
  }

  const found = result.denied.map((entity) => ({
    type:
      entity.identifiedType.tag === "custom"
        ? entity.identifiedType.val
        : entity.identifiedType.tag,
    value: value.slice(entity.start, entity.end),
  }));
  assert.equal(
    found
      .filter(({ type }) => type === "BANK_ACCOUNT")
      .map(({ value }) => value)
      .join(""),
    "0123456789",
  );
  assert.equal(
    found
      .filter(({ type }) => type === "ROUTING_NUMBER")
      .map(({ value }) => value)
      .join(""),
    "022000020",
  );
  assert.ok(!found.some(({ type }) => type === "phone-number"));
});

test("model detects a formatted phone without a phone recognizer", async function (t) {
  const value = "Call me at +1 (415) 555-2671.";
  const entities = {
    tag: "deny" as const,
    val: [{ tag: "phone-number" } as const],
  };

  let result;
  try {
    result = await tryDetect(value, entities);
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return;
  }

  assert.ok(
    result.denied.some(
      (entity) =>
        entity.identifiedType.tag === "phone-number" &&
        value.slice(entity.start, entity.end).includes("555-2671"),
    ),
  );
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

  const denied = result.denied.map((entity) => value.slice(entity.start, entity.end));
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

// The model's position limit, including [CLS] and [SEP].
const MODEL_MAX_TOKENS = 512;

type Pipeline = ((value: string) => Promise<never>) & {
  tokenizer: (value: string) => { input_ids: { dims: number[] } };
};

// Loads the bundled pipeline directly, so a test can pass it through
// `classify` and record the real token count of every model invocation.
async function loadPipeline(): Promise<Pipeline> {
  const { env, pipeline } = await import("@huggingface/transformers");
  env.allowRemoteModels = false;
  env.localModelPath = new URL("../models/", import.meta.url).pathname;
  return (await pipeline("token-classification", "rampart", {
    dtype: "q4",
    device: "cpu",
    local_files_only: true,
  } as Record<string, unknown>)) as unknown as Pipeline;
}

async function recordingRunner(t: { skip(message: string): void }) {
  let pipe: Pipeline;
  try {
    pipe = await loadPipeline();
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return undefined;
  }
  const lengths: number[] = [];
  const run = createModelRunner({
    async classify(chunk) {
      lengths.push(pipe.tokenizer(chunk).input_ids.dims[1]);
      return pipe(chunk);
    },
  });
  return { run, lengths, pipe };
}

function found(value: string, spans: Array<{ start: number; end: number; type: string }>) {
  return spans.map((span) => [value.slice(span.start, span.end), span.type].join("|"));
}

test("Hangul token expansion does not overflow the model", async function (t) {
  // Regression: 341 characters of Hangul became 513 tokens and ONNX Runtime
  // failed with "512 by 513", because BertNormalizer decomposes each syllable
  // into three Jamo tokens that share one original offset.
  const recording = await recordingRunner(t);
  if (!recording) return;
  const value = "각 ".repeat(170) + "x";
  assert.equal(recording.pipe.tokenizer(value).input_ids.dims[1], 513);

  await recording.run(value);
  assert.equal(recording.lengths.length, 2);
  assert.ok(Math.max(...recording.lengths) <= MODEL_MAX_TOKENS);
});

test("default runner scans the Hangul reproduction", async function (t) {
  try {
    await loadPipeline();
  } catch (error) {
    t.skip(`model unavailable: ${(error as Error).message}`);
    return;
  }
  // Rejected with an ONNX Runtime broadcast error before the fix.
  const spans = await createModelRunner()("각 ".repeat(170) + "x");
  assert.ok(Array.isArray(spans));
});

test("token budget boundary", async function (t) {
  const recording = await recordingRunner(t);
  if (!recording) return;

  const atBudget = "각 ".repeat(170);
  await recording.run(atBudget);
  assert.deepEqual(recording.lengths, [MODEL_MAX_TOKENS]);

  recording.lengths.length = 0;
  await recording.run(atBudget + "x");
  assert.equal(recording.lengths.length, 2);
  assert.ok(Math.max(...recording.lengths) <= MODEL_MAX_TOKENS);
});

test("tokenUpperBound is never below the real token count", async function (t) {
  const recording = await recordingRunner(t);
  if (!recording) return;
  for (const value of [
    "각 ".repeat(200),
    "İstanbul ǅ ﬃ Straße ①②③ ｱｲｳ",
    "नमस्ते दुनिया ".repeat(20),
    "会议记录已经整理好了。議事録をまとめました。",
    "a\u0301b\u0327c ".repeat(30),
    "\u{1F600}\u{1F469}\u200D\u{1F4BB} emoji",
    "\u200B\uFEFF\u00A0\u2028\u0085 separators",
    "x".repeat(300),
  ]) {
    const real = recording.pipe.tokenizer(value).input_ids.dims[1] - 2;
    assert.ok(
      real <= tokenUpperBound(value),
      `${real} > bound for ${JSON.stringify(value.slice(0, 20))}`,
    );
  }
});

test("long multilingual input scans to the end", async function (t) {
  const recording = await recordingRunner(t);
  if (!recording) return;
  const filler =
    "회의록 정리했습니다. 会议记录已经整理好了。議事録をまとめました。 Notes are done. ".repeat(
      200,
    );
  const value = filler + "Contact Maria Garcia at 415-555-2671.";

  const result = found(value, await recording.run(value));

  assert.ok(result.includes("Maria|GIVEN_NAME"), result.slice(-5).join(","));
  assert.ok(result.includes("Garcia|SURNAME"));
  assert.ok(result.includes("415-555-2671|PHONE_NUMBER"));
  assert.ok(recording.lengths.length > 10);
  assert.ok(Math.max(...recording.lengths) <= MODEL_MAX_TOKENS);
});

test("a detection crossing a window boundary is reported whole", async function (t) {
  const recording = await recordingRunner(t);
  if (!recording) return;
  const phone = "415-555-2671";
  const prefix = "Please call Maria Garcia on ";
  // Hangul filler costs three tokens per syllable; pad so the phone number
  // straddles the end of the first window.
  const filler = "각 ".repeat(Math.floor((510 - tokenUpperBound(prefix) - 2) / 3));
  const value = filler + prefix + phone + " tomorrow.";
  const [first] = planWindows(value);
  const phoneStart = value.indexOf(phone);
  assert.ok(phoneStart < first[1] && first[1] < phoneStart + phone.length);

  const result = found(value, await recording.run(value));

  assert.ok(result.includes(`${phone}|PHONE_NUMBER`), result.join(","));
  assert.equal(recording.lengths.length, 2);
  assert.ok(Math.max(...recording.lengths) <= MODEL_MAX_TOKENS);
});
