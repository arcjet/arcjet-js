import assert from "node:assert/strict";
import test from "node:test";

import { rampart } from "../dist/index.js";
import { createModelRunner } from "../dist/model.js";
import type { DetectedSpan } from "../dist/recognizers.js";

// A logger that records `debug` calls so we can assert on them.
function fakeContext() {
  const debugCalls: string[] = [];
  const log = {
    debug: (message: string) => debugCalls.push(message),
    info() {},
    warn() {},
    error() {},
    time() {},
    timeEnd() {},
  };
  // The backend only needs `log`; cast to satisfy the public type.
  return { context: { log } as never, debugCalls };
}

// Mirror how the `sensitiveInfo` rule converts entity strings to the analyze
// tagged-union before handing them to a backend: the four native types use
// their tag, everything else is carried as `custom`.
function toTagged(type: string) {
  switch (type) {
    case "EMAIL":
      return { tag: "email" } as const;
    case "PHONE_NUMBER":
      return { tag: "phone-number" } as const;
    case "IP_ADDRESS":
      return { tag: "ip-address" } as const;
    case "CREDIT_CARD_NUMBER":
      return { tag: "credit-card-number" } as const;
    default:
      return { tag: "custom", val: type } as const;
  }
}

function denyEntities(types: string[]) {
  return { tag: "deny" as const, val: types.map(toTagged) };
}

function allowEntities(types: string[]) {
  return { tag: "allow" as const, val: types.map(toTagged) };
}

// A model runner stub so tests never load the ONNX model.
function stubModel(spans: DetectedSpan[]) {
  return async () => spans;
}

test("exposes the public api", async function () {
  assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), [
    "defaultRecognizers",
    "rampart",
    "rampartEntities",
  ]);
});

test("deny mode denies listed types and allows the rest", async function () {
  const { context } = fakeContext();
  const value = "x@y.com and Alex";
  const backend = rampart({
    recognizers: [],
    runModel: stubModel([{ start: 12, end: 16, type: "GIVEN_NAME" }]),
  });

  // The recognizer is disabled, but EMAIL would not be denied here anyway.
  const result = await backend.detect(context, value, denyEntities(["GIVEN_NAME"]));

  assert.equal(result.denied.length, 1);
  assert.deepEqual(result.denied[0].identifiedType, {
    tag: "custom",
    val: "GIVEN_NAME",
  });
  assert.equal(value.slice(result.denied[0].start, result.denied[0].end), "Alex");
  assert.equal(result.allowed.length, 0);
});

test("allow mode denies everything not listed", async function () {
  const { context } = fakeContext();
  const value = "Alex at HQ";
  const backend = rampart({
    recognizers: [],
    runModel: stubModel([
      { start: 0, end: 4, type: "GIVEN_NAME" },
      { start: 8, end: 10, type: "CITY" },
    ]),
  });

  const result = await backend.detect(context, value, allowEntities(["GIVEN_NAME"]));

  assert.deepEqual(
    result.allowed.map((e) => value.slice(e.start, e.end)),
    ["Alex"],
  );
  assert.deepEqual(
    result.denied.map((e) => value.slice(e.start, e.end)),
    ["HQ"],
  );
});

test("recognizer spans win over overlapping model spans", async function () {
  const { context } = fakeContext();
  const value = "card 4111 1111 1111 1111";
  // Model wrongly claims the card digits are a bank account.
  const backend = rampart({
    runModel: stubModel([{ start: 5, end: 24, type: "BANK_ACCOUNT" }]),
  });

  const result = await backend.detect(
    context,
    value,
    denyEntities(["CREDIT_CARD_NUMBER", "BANK_ACCOUNT"]),
  );

  // Only one span survives the overlap, and it is the recognizer's card.
  assert.equal(result.denied.length, 1);
  assert.deepEqual(result.denied[0].identifiedType, {
    tag: "credit-card-number",
  });
});

test("touching model tokens cannot hide two validated credit cards", async function () {
  const { context } = fakeContext();
  const value = "credit card 4111111111111111-5500000000000004";
  // These are the B-tagged WordPieces emitted by the bundled model. Its last
  // digit of the first card and the second card are mislabeled TAX_ID.
  const words = [
    ...["411", ...Array(6).fill("##11")].map((word) => ({ entity: "B-GOVERNMENT_ID", word })),
    ...["##1", "-", "550", ...Array(6).fill("##00"), "##4"].map((word) => ({
      entity: "B-TAX_ID",
      word,
    })),
  ];
  const runModel = createModelRunner({
    async classify() {
      return words.map((token, index) => ({ ...token, index, score: 0.9 }));
    },
  });
  const backend = rampart({ runModel });

  const result = await backend.detect(context, value, denyEntities(["CREDIT_CARD_NUMBER"]));
  assert.deepEqual(
    result.denied.map((span) => value.slice(span.start, span.end)),
    ["4111111111111111", "5500000000000004"],
  );
  assert.ok(result.denied.every((span) => span.identifiedType.tag === "credit-card-number"));
});

for (const { name, words, modelStart } of [
  {
    name: "I labels across both cards and their separator",
    words: [
      { entity: "B-TAX_ID", word: "411" },
      { entity: "I-TAX_ID", word: "##1111111111111" },
      { entity: "I-TAX_ID", word: "-" },
      { entity: "I-TAX_ID", word: "550" },
      { entity: "I-TAX_ID", word: "##0000000000004" },
    ],
    modelStart: 12,
  },
  {
    name: "a B-labelled separator followed by an I-labelled card",
    words: [
      { entity: "B-TAX_ID", word: "-" },
      { entity: "I-TAX_ID", word: "550" },
      { entity: "I-TAX_ID", word: "##0000000000004" },
    ],
    modelStart: 28,
  },
]) {
  test(`validated cards survive ${name}`, async function () {
    const { context } = fakeContext();
    const value = "credit card 4111111111111111-5500000000000004";
    const runModel = createModelRunner({
      async classify() {
        return words.map((token, index) => ({ ...token, index, score: 0.9 }));
      },
    });
    assert.deepEqual(await runModel(value), [
      { start: modelStart, end: value.length, type: "TAX_ID" },
    ]);

    const result = await rampart({ runModel }).detect(
      context,
      value,
      denyEntities(["CREDIT_CARD_NUMBER"]),
    );
    assert.deepEqual(
      result.denied.map((span) => ({
        start: span.start,
        end: span.end,
        type: span.identifiedType,
      })),
      [
        { start: 12, end: 28, type: { tag: "credit-card-number" } },
        { start: 29, end: 45, type: { tag: "credit-card-number" } },
      ],
    );
  });
}

test("a validated recognizer wins over a longer overlapping model entity", async function () {
  const { context } = fakeContext();
  // A custom recognizer marks the leading digit as a phone. Even though the
  // model covers a longer street span, the recognizer's chosen type is kept.
  const value = "1 Infinite Loop";
  const backend = rampart({
    recognizers: [() => [{ start: 0, end: 1, type: "PHONE_NUMBER" }]],
    runModel: stubModel([{ start: 0, end: 15, type: "STREET_NAME" }]),
  });

  const result = await backend.detect(
    context,
    value,
    denyEntities(["STREET_NAME", "PHONE_NUMBER"]),
  );

  // The recognizer's type is authoritative for its matching text.
  assert.equal(result.denied.length, 1);
  assert.deepEqual(result.denied[0].identifiedType, {
    tag: "phone-number",
  });
  assert.equal(value.slice(result.denied[0].start, result.denied[0].end), "1");
});

test("native types use their analyze tag, others are custom", async function () {
  const { context } = fakeContext();
  const value = "reach me at a@b.com";
  const backend = rampart({ runModel: stubModel([]) });

  const result = await backend.detect(context, value, denyEntities(["EMAIL"]));

  assert.deepEqual(result.denied[0].identifiedType, { tag: "email" });
});

test("maps each native type to its analyze tag", async function () {
  const { context } = fakeContext();
  const value = "192.168.1.1 +1 (415) 555-2671 a@b.com 4111 1111 1111 1111";
  const phone = "+1 (415) 555-2671";
  const phoneStart = value.indexOf(phone);
  const backend = rampart({
    runModel: stubModel([
      {
        start: phoneStart,
        end: phoneStart + phone.length,
        type: "PHONE_NUMBER",
      },
    ]),
  });

  const result = await backend.detect(
    context,
    value,
    denyEntities(["IP_ADDRESS", "PHONE_NUMBER", "EMAIL", "CREDIT_CARD_NUMBER"]),
  );

  const tags = result.denied.map((entity) =>
    entity.identifiedType.tag === "custom" ? entity.identifiedType.val : entity.identifiedType.tag,
  );
  assert.ok(tags.includes("ip-address"));
  assert.ok(tags.includes("phone-number"));
  assert.ok(tags.includes("email"));
  assert.ok(tags.includes("credit-card-number"));
});

test("the detect callback is ignored but logged", async function () {
  const { context, debugCalls } = fakeContext();
  const backend = rampart({ recognizers: [], runModel: stubModel([]) });

  await backend.detect(context, "anything", denyEntities(["GIVEN_NAME"]), {
    detect: () => [],
  });

  assert.equal(debugCalls.length, 1);
  assert.match(debugCalls[0], /detect/);
});

test("returns a result shape compatible with the rule", async function () {
  const { context } = fakeContext();
  const backend = rampart({ recognizers: [], runModel: stubModel([]) });
  const result = await backend.detect(context, "", denyEntities([]));
  assert.deepEqual(result, { allowed: [], denied: [] });
});
