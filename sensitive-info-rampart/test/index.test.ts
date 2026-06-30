import assert from "node:assert/strict";
import test from "node:test";
import { rampart } from "../index.js";
import type { DetectedSpan } from "../recognizers.js";

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
  assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
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
  const result = await backend.detect(
    context,
    value,
    denyEntities(["GIVEN_NAME"]),
  );

  assert.equal(result.denied.length, 1);
  assert.deepEqual(result.denied[0].identifiedType, {
    tag: "custom",
    val: "GIVEN_NAME",
  });
  assert.equal(
    value.slice(result.denied[0].start, result.denied[0].end),
    "Alex",
  );
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

  const result = await backend.detect(
    context,
    value,
    allowEntities(["GIVEN_NAME"]),
  );

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

test("a short recognizer span does not delete a longer overlapping entity", async function () {
  const { context } = fakeContext();
  // "1 Infinite Loop" — the model spans the whole street ([0,15)); a stray
  // recognizer match on the leading digit ([0,1)) must not suppress it.
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

  // The longer STREET_NAME span wins the overlap.
  assert.equal(result.denied.length, 1);
  assert.deepEqual(result.denied[0].identifiedType, {
    tag: "custom",
    val: "STREET_NAME",
  });
  assert.equal(
    value.slice(result.denied[0].start, result.denied[0].end),
    value,
  );
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
  // One recognizer per native type, so every native branch of the
  // string -> tagged-union conversion is exercised.
  const value = "192.168.1.1 +1 (415) 555-2671 a@b.com 4111 1111 1111 1111";
  const backend = rampart({ runModel: stubModel([]) });

  const result = await backend.detect(
    context,
    value,
    denyEntities(["IP_ADDRESS", "PHONE_NUMBER", "EMAIL", "CREDIT_CARD_NUMBER"]),
  );

  const tags = result.denied.map((entity) =>
    entity.identifiedType.tag === "custom"
      ? entity.identifiedType.val
      : entity.identifiedType.tag,
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
