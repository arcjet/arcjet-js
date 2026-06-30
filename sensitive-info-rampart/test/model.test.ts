import assert from "node:assert/strict";
import test from "node:test";

import { aggregateTokens, assignOffsets, normalizeWithMap } from "../dist/model.js";
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
  assert.equal(value.slice(withOffsets[0].start!, withOffsets[0].end!), "Alex");
  assert.equal(value.slice(withOffsets[1].start!, withOffsets[1].end!), "Rivera");
});

test("assignOffsets handles ## sub-word pieces and ordering", function () {
  const value = "Rivera";
  // Out-of-order, sub-word pieces.
  const tokens: RawToken[] = [
    { entity: "I-SURNAME", score: 0.9, word: "##vera", index: 2 },
    { entity: "B-SURNAME", score: 0.9, word: "ri", index: 1 },
  ];
  const withOffsets = assignOffsets(value, tokens).sort((a, b) => a.start! - b.start!);
  assert.equal(value.slice(withOffsets[0].start!, withOffsets[1].end!), "Rivera");
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
