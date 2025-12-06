import assert from "node:assert/strict";
import test from "node:test";
import { matches, parseProxy } from "../index.js";

test("matches", async function (t) {
  await t.test("should match", function () {
    assert.equal(matches("127.0.0.1", "127.0.0.1"), true);
  });

  await t.test("should not match", function () {
    assert.equal(matches("127.0.0.2", "127.0.0.1"), false);
  });

  await t.test("should match a cidr", function () {
    assert.equal(matches("131.0.75.254", "131.0.72.0/22"), true);
  });

  await t.test("should not match a cidr", function () {
    assert.equal(matches("173.245.63.254", "131.0.72.0/22"), false);
  });

  await t.test("should match a parsed cidr", function () {
    assert.equal(matches("172.71.255.254", parseProxy("172.64.0.0/13")), true);
  });

  await t.test("should not match a parsed cidr", function () {
    assert.equal(matches("173.245.63.254", parseProxy("172.64.0.0/13")), false);
  });

  await t.test("should match a list of ips and cidrs", function () {
    assert.equal(
      matches("127.0.0.1", [
        "127.0.0.1",
        "131.0.72.0/22",
        parseProxy("172.64.0.0/13"),
      ]),
      true,
    );

    assert.equal(
      matches("131.0.75.254", [
        "127.0.0.2",
        "131.0.72.0/22",
        parseProxy("172.64.0.0/13"),
      ]),
      true,
    );

    assert.equal(
      matches("172.71.255.254", [
        "127.0.0.2",
        "131.0.72.0/22",
        parseProxy("172.64.0.0/13"),
      ]),
      true,
    );
  });

  await t.test("should not match a list of ips and cidrs", function () {
    assert.equal(
      matches("127.0.0.2", [
        "127.0.0.1",
        "131.0.72.0/22",
        parseProxy("172.64.0.0/13"),
      ]),
      false,
    );

    assert.equal(
      matches("173.245.63.254", [
        "127.0.0.2",
        "131.0.72.0/22",
        parseProxy("172.64.0.0/13"),
      ]),
      false,
    );
  });
});
