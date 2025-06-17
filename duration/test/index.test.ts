import { describe, test } from "node:test";
import { expect } from "expect";
import { parse } from "../index.js";

describe("parse", () => {
  test("always returns 0 if the duration string is just 0", () => {
    expect(parse("0")).toEqual(0);
  });

  test("fails if duration string is negative", () => {
    expect(() => parse("-1s")).toThrow();
  });

  test("fails if duration string starts with a +", () => {
    expect(() => parse("+1s")).toThrow();
  });

  test("fails if duration string does not start with a number", () => {
    expect(() => parse("abc1000s")).toThrow();
  });

  test("fails if duration string is empty", () => {
    expect(() => parse("")).toThrow();
  });

  test("fails if duration string is contains a decimal", () => {
    expect(() => parse("1.5s")).toThrow();
  });

  test("fails if duration string uses unknown unit", () => {
    expect(() => parse("1y")).toThrow();
  });

  test("fails if duration is not a string or number", () => {
    expect(() => {
      //@ts-expect-error
      parse({});
    }).toThrow();
  });

  test("returns duration number directly as seconds", () => {
    expect(parse(1)).toEqual(1);
    expect(parse(10000)).toEqual(10000);
  });

  test("fails if duration number overflows", () => {
    expect(() => parse(4294967296)).toThrow();
  });

  test("fails if duration number is negative", () => {
    expect(() => parse(-1)).toThrow();
  });

  test("fails if duration number is decimal", () => {
    expect(() => parse(100.5)).toThrow();
  });

  test("parses seconds", () => {
    expect(parse("1s")).toEqual(1);
    expect(parse("1000s")).toEqual(1000);
  });

  test("fails if seconds overflow", () => {
    expect(() => parse("4294967296s")).toThrow();
  });

  test("parses minutes into seconds", () => {
    expect(parse("1m")).toEqual(60);
    expect(parse("60m")).toEqual(3600);
  });

  test("fails if minutes-to-seconds overflow", () => {
    expect(() => parse("71582789m")).toThrow();
  });

  test("parses hours into seconds", () => {
    expect(parse("1h")).toEqual(3600);
    expect(parse("24h")).toEqual(86400);
  });

  test("fails if hours-to-seconds overflow", () => {
    expect(() => parse("1193047h")).toThrow();
  });

  test("parses days into seconds", () => {
    expect(parse("1d")).toEqual(86400);
    expect(parse("3d")).toEqual(259200);
  });

  test("fails if days-to-seconds overflow", () => {
    expect(() => parse("49711d")).toThrow();
  });

  test("can combine multiple units", () => {
    expect(parse("1h10m30s")).toEqual(4230);
  });

  test("fails if multiple units overflow", () => {
    expect(() => parse("1193040h420m30s")).toThrow();
  });

  test("fails if missing unit on final value in multiple units", () => {
    expect(() => parse("1d2h30")).toThrow();
  });
});
