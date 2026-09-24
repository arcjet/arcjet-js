import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateTokens,
  assignOffsets,
  createModelRunner,
  normalizeWithMap,
  planWindows,
  tokenUpperBound,
} from "../dist/model.js";
import type { RawToken } from "../dist/model.js";

test("normalizeWithMap lower-cases and strips accents, mapping back", function () {
  const value = "Café 1";
  const { normalized, map } = normalizeWithMap(value);
  assert.equal(normalized, "cafe 1");
  // Each normalized character maps to its original index.
  assert.equal(map.length, normalized.length);
  // The accented "é" (index 3) maps to original index 3.
  assert.equal(map[normalized.indexOf("e")], "Café".indexOf("é"));
});

test("assignOffsets locates tokens in the original text", function () {
  const value = "My name is Alex Rivera";
  const tokens: RawToken[] = [
    { entity: "B-GIVEN_NAME", score: 0.99, word: "alex", index: 4 },
    { entity: "B-SURNAME", score: 0.99, word: "rivera", index: 5 },
  ];
  const withOffsets = assignOffsets(value, tokens);
  assert.notEqual(withOffsets[0].start, undefined);
  assert.notEqual(withOffsets[0].end, undefined);
  assert.notEqual(withOffsets[1].start, undefined);
  assert.notEqual(withOffsets[1].end, undefined);
  assert.equal(value.slice(withOffsets[0].start, withOffsets[0].end), "Alex");
  assert.equal(value.slice(withOffsets[1].start, withOffsets[1].end), "Rivera");
});

test("assignOffsets handles ## sub-word pieces and ordering", function () {
  const value = "Rivera";
  // Out-of-order, sub-word pieces.
  const tokens: RawToken[] = [
    { entity: "I-SURNAME", score: 0.9, word: "##vera", index: 2 },
    { entity: "B-SURNAME", score: 0.9, word: "ri", index: 1 },
  ];
  const withOffsets = assignOffsets(value, tokens).sort((a, b) => a.start! - b.start!);
  assert.notEqual(withOffsets[0].start, undefined);
  assert.notEqual(withOffsets[1].end, undefined);
  assert.equal(value.slice(withOffsets[0].start, withOffsets[1].end), "Rivera");
});

test("assignOffsets leaves unlocatable tokens without offsets", function () {
  const tokens: RawToken[] = [{ entity: "B-GIVEN_NAME", score: 0.9, word: "zzz", index: 1 }];
  const [token] = assignOffsets("nothing here", tokens);
  assert.equal(token.start, undefined);
});

test("assignOffsets skips empty-word tokens (e.g. a bare '##')", function () {
  const tokens: RawToken[] = [{ entity: "B-GIVEN_NAME", score: 0.9, word: "##", index: 1 }];
  const [token] = assignOffsets("Alex", tokens);
  assert.equal(token.start, undefined);
  assert.equal(token.end, undefined);
});

test("assignOffsets tolerates tokens without an index", function () {
  // Tokens missing `index` sort as 0; both should still be located.
  const value = "Alex Rivera";
  const tokens: RawToken[] = [
    { entity: "B-GIVEN_NAME", score: 0.9, word: "alex" },
    { entity: "B-SURNAME", score: 0.9, word: "rivera" },
  ];
  const located = assignOffsets(value, tokens).filter((token) => token.start !== undefined);
  assert.equal(located.length, 2);
});

test("aggregateTokens merges same-type tokens across whitespace", function () {
  const value = "Main Street";
  const tokens: RawToken[] = [
    {
      entity: "B-STREET_NAME",
      score: 0.9,
      word: "main",
      index: 1,
      start: 0,
      end: 4,
    },
    {
      entity: "I-STREET_NAME",
      score: 0.9,
      word: "street",
      index: 2,
      start: 5,
      end: 11,
    },
  ];
  const spans = aggregateTokens(value, tokens);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].type, "STREET_NAME");
  assert.equal(value.slice(spans[0].start, spans[0].end), "Main Street");
});

test("aggregateTokens does not merge same-type tokens across non-whitespace", function () {
  // A comma between two same-type tokens is not whitespace, so they stay
  // separate spans rather than merging.
  const value = "Paris, London";
  const tokens: RawToken[] = [
    { entity: "B-CITY", score: 0.9, word: "paris", index: 1, start: 0, end: 5 },
    {
      entity: "I-CITY",
      score: 0.9,
      word: "london",
      index: 2,
      start: 7,
      end: 13,
    },
  ];
  const spans = aggregateTokens(value, tokens);
  assert.equal(spans.length, 2);
});

test("aggregateTokens starts a new span on a B- tag of the same type", function () {
  const value = "Ann Bob";
  const tokens: RawToken[] = [
    {
      entity: "B-GIVEN_NAME",
      score: 0.9,
      word: "ann",
      index: 1,
      start: 0,
      end: 3,
    },
    {
      entity: "B-GIVEN_NAME",
      score: 0.9,
      word: "bob",
      index: 2,
      start: 4,
      end: 7,
    },
  ];
  const spans = aggregateTokens(value, tokens);
  assert.equal(spans.length, 2);
});

test("aggregateTokens drops O, low-score, and offset-less tokens", function () {
  const value = "abc def ghi";
  const tokens: RawToken[] = [
    { entity: "O", score: 0.99, word: "abc", index: 1, start: 0, end: 3 },
    { entity: "B-CITY", score: 0.1, word: "def", index: 2, start: 4, end: 7 },
    { entity: "B-CITY", score: 0.99, word: "ghi", index: 3 },
  ];
  assert.deepEqual(aggregateTokens(value, tokens), []);
});

test("aggregateTokens maps PHONE label to PHONE_NUMBER", function () {
  const value = "5551234";
  const tokens: RawToken[] = [
    {
      entity: "B-PHONE",
      score: 0.9,
      word: "5551234",
      index: 1,
      start: 0,
      end: 7,
    },
  ];
  assert.equal(aggregateTokens(value, tokens)[0].type, "PHONE_NUMBER");
});

test("createModelRunner classifies with `classify` instead of loading the model", async function () {
  const value = "My name is Alex";
  const seen: string[] = [];
  const runModel = createModelRunner({
    async classify(chunk) {
      seen.push(chunk);
      return [{ entity: "B-GIVEN_NAME", score: 0.99, word: "alex", index: 4 }];
    },
  });

  const spans = await runModel(value);
  assert.deepEqual(seen, [value]);
  assert.deepEqual(spans, [{ start: 11, end: 15, type: "GIVEN_NAME" }]);
});

test("createModelRunner windows long input past `classify` and rebases offsets", async function () {
  const needle = "Rivera";
  const value = "a ".repeat(1000) + needle;
  const chunks: string[] = [];
  const runModel = createModelRunner({
    async classify(chunk) {
      chunks.push(chunk);
      return chunk.includes(needle)
        ? [{ entity: "B-SURNAME", score: 0.99, word: needle.toLowerCase(), index: 1 }]
        : [];
    },
  });

  const spans = await runModel(value);
  // Every window stays within the model's input budget.
  assert.ok(chunks.every((chunk) => chunk.length <= 480));
  // The windows reach the end of the value rather than stopping at a prefix, so
  // a match in the last few characters is still reported, at absolute offsets.
  assert.ok(value.endsWith(chunks[chunks.length - 1]));
  assert.ok(spans.some((span) => value.slice(span.start, span.end) === needle));
});

test("createModelRunner does not split a surrogate pair across windows", async function () {
  const loneSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

  // An astral character on the end of the first window (480) and on the start of
  // the second (480 - 64 overlap), so both boundary adjustments are exercised.
  for (const offset of [479, 415]) {
    const value = "a".repeat(offset) + "\u{1F600}" + "b".repeat(600);
    const chunks: string[] = [];
    const runModel = createModelRunner({
      async classify(chunk) {
        chunks.push(chunk);
        return [];
      },
    });

    await runModel(value);
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(!loneSurrogate.test(chunk), `window ${offset} split a surrogate pair`);
    }
    assert.ok(chunks.some((chunk) => chunk.includes("\u{1F600}")));
  }
});

// Checks the invariants every plan must hold: bounded, complete, progressing,
// and overlapping.
function assertValidPlan(value: string, windows: Array<[number, number]>, budget = 510) {
  assert.equal(windows[0][0], 0);
  assert.equal(windows[windows.length - 1][1], value.length);
  for (const [start, end] of windows) {
    assert.ok(start < end);
    assert.ok(tokenUpperBound(value.slice(start, end)) <= budget);
  }
  for (let i = 1; i < windows.length; i++) {
    assert.ok(windows[i - 1][0] < windows[i][0], "windows progress");
    assert.ok(windows[i][0] < windows[i - 1][1], "windows overlap");
  }
}

test("tokenUpperBound counts what normalization expands", function () {
  assert.equal(tokenUpperBound(""), 0);
  assert.equal(tokenUpperBound("a b\tc\n"), 3);
  // A Hangul syllable decomposes into three Jamo, each its own token.
  assert.equal(tokenUpperBound("각"), 3);
  // A nonspacing mark is stripped, as the tokenizer does.
  assert.equal(tokenUpperBound("é"), 1);
  // NFD splits the dot off "İ" before it is stripped, leaving "i".
  assert.equal(tokenUpperBound("İ"), 1);
  // An astral code point is one token, not two UTF-16 code units.
  assert.equal(tokenUpperBound("\u{1F600}"), 1);
});

test("planWindows on empty input plans nothing", function () {
  assert.deepEqual(planWindows(""), []);
});

test("planWindows keeps exactly the token budget in one window", function () {
  const value = "각 ".repeat(170);
  assert.equal(tokenUpperBound(value), 510);
  assert.deepEqual(planWindows(value), [[0, value.length]]);
});

test("planWindows splits one token over the budget", function () {
  // The reproduction: 341 characters, 511 content tokens, 513 with specials.
  const value = "각 ".repeat(170) + "x";
  assert.equal(value.length, 341);
  assert.equal(tokenUpperBound(value), 511);
  const windows = planWindows(value);
  assert.equal(windows.length, 2);
  assertValidPlan(value, windows);
});

test("planWindows starts later windows on a word", function () {
  const value = "hello world ".repeat(200);
  const windows = planWindows(value);
  assertValidPlan(value, windows);
  for (const [start] of windows.slice(1)) {
    assert.match(value[start - 1], /\s/);
  }
});

test("planWindows progresses through a run with no whitespace", function () {
  const value = "a".repeat(5000);
  const windows = planWindows(value);
  assertValidPlan(value, windows);
  // Each window advances by most of its budget, not one character.
  assert.ok(windows.length < 20, `planned ${windows.length} windows`);
});

test("planWindows progresses when many tokens share one character", function () {
  // Three tokens per original character, and no whitespace to snap to.
  const value = "각".repeat(1000);
  const windows = planWindows(value);
  assertValidPlan(value, windows);
  assert.ok(windows.length < 20, `planned ${windows.length} windows`);
});

test("createModelRunner windows the Hangul reproduction", async function () {
  const value = "각 ".repeat(170) + "x";
  const chunks: string[] = [];
  const runModel = createModelRunner({
    async classify(chunk) {
      chunks.push(chunk);
      return [];
    },
  });

  await runModel(value);
  assert.equal(chunks.length, 2);
  assert.ok(chunks.every((chunk) => tokenUpperBound(chunk) <= 510));
  assert.ok(value.endsWith(chunks[1]));
});

test("createModelRunner keeps the 480-character windows where they fit", async function () {
  // The model's phone recall drops in windows closer to the full 512 tokens, so
  // a character window that fits is sent whole, exactly as before token
  // windowing was added.
  const value = "Please call the office about the invoice. ".repeat(40);
  const expected: string[] = [];
  for (let start = 0; start < value.length; start += 416) {
    expected.push(value.slice(start, start + 480));
  }
  const chunks: string[] = [];
  const runModel = createModelRunner({
    async classify(chunk) {
      chunks.push(chunk);
      return [];
    },
  });

  await runModel(value);
  assert.ok(expected.length > 2);
  assert.deepEqual(chunks, expected);
});

test("createModelRunner splits only the character windows that do not fit", async function () {
  // English, then dense Hangul, then English: only the Hangul windows exceed the
  // token budget, and each of their pieces fits it.
  const english = "Please call the office about the invoice. ".repeat(12);
  const value = english + "각".repeat(400) + english;
  const chunks: string[] = [];
  const runModel = createModelRunner({
    async classify(chunk) {
      chunks.push(chunk);
      return [];
    },
  });

  await runModel(value);
  assert.equal(chunks[0], value.slice(0, 480));
  assert.ok(value.endsWith(chunks[chunks.length - 1]));
  assert.ok(chunks.every((chunk) => tokenUpperBound(chunk) <= 510));
  assert.ok(chunks.length > Math.ceil((value.length - 64) / 416));
});
