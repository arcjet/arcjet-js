import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parse } from "@arcjet/duration";

test("@arcjet/duration", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("@arcjet/duration")).sort(), [
      "parse",
    ]);
  });
});

describe("parse", () => {
  test("always returns 0 if the duration string is just 0", () => {
    assert.equal(parse("0"), 0);
  });

  test("fails if duration string is negative", () => {
    assert.throws(() => parse("-1s"));
  });

  test("fails if duration string starts with a +", () => {
    assert.throws(() => parse("+1s"));
  });

  test("fails if duration string does not start with a number", () => {
    assert.throws(() => parse("abc1000s"));
  });

  test("fails if duration string is empty", () => {
    assert.throws(() => parse(""));
  });

  test("fails if duration string is contains a decimal", () => {
    assert.throws(() => parse("1.5s"));
  });

  test("fails if duration string uses unknown unit", () => {
    assert.throws(() => parse("1y"));
  });

  test("fails if duration is not a string or number", () => {
    assert.throws(() => {
      //@ts-expect-error
      parse({});
    });
  });

  test("returns duration number directly as seconds", () => {
    assert.equal(parse(1), 1);
    assert.equal(parse(10000), 10000);
  });

  test("fails if duration number overflows", () => {
    assert.throws(() => parse(4294967296));
  });

  test("fails if duration number is negative", () => {
    assert.throws(() => parse(-1));
  });

  test("fails if duration number is decimal", () => {
    assert.throws(() => parse(100.5));
  });

  test("parses seconds", () => {
    assert.equal(parse("1s"), 1);
    assert.equal(parse("1000s"), 1000);
  });

  test("fails if seconds overflow", () => {
    assert.throws(() => parse("4294967296s"));
  });

  test("parses minutes into seconds", () => {
    assert.equal(parse("1m"), 60);
    assert.equal(parse("60m"), 3600);
  });

  test("fails if minutes-to-seconds overflow", () => {
    assert.throws(() => parse("71582789m"));
  });

  test("parses hours into seconds", () => {
    assert.equal(parse("1h"), 3600);
    assert.equal(parse("24h"), 86400);
  });

  test("fails if hours-to-seconds overflow", () => {
    assert.throws(() => parse("1193047h"));
  });

  test("parses days into seconds", () => {
    assert.equal(parse("1d"), 86400);
    assert.equal(parse("3d"), 259200);
  });

  test("fails if days-to-seconds overflow", () => {
    assert.throws(() => parse("49711d"));
  });

  test("can combine multiple units", () => {
    assert.equal(parse("1h10m30s"), 4230);
  });

  test("fails if multiple units overflow", () => {
    assert.throws(() => parse("1193040h420m30s"));
  });

  test("fails if missing unit on final value in multiple units", () => {
    assert.throws(() => parse("1d2h30"));
  });
});
