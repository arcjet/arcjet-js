import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../index.js";

test("@arcjet/logger", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "Logger",
    ]);
  });

  await t.test("should fail for non-string levels", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      new Logger({ level: 1 });
    }, /Invalid log level/);
  });

  await t.test("should fail for unknown levels", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      new Logger({ level: "boom" });
    }, /Unknown log level: boom/);
  });

  await t.test("should support debug messages", async function () {
    const consoleDebug = console.debug;
    let calls = 0;

    console.debug = function (...parameters: unknown[]) {
      assert.deepEqual(parameters, ["✦Aj DEBUG hi"]);
      calls++;
    };

    assert.equal(calls, 0);

    let logger = new Logger({ level: "debug" });
    logger.debug("hi");
    assert.equal(calls, 1);

    logger = new Logger({ level: "info" });
    logger.debug("hi");
    assert.equal(calls, 1);

    logger = new Logger({ level: "warn" });
    logger.debug("hi");
    assert.equal(calls, 1);

    logger = new Logger({ level: "error" });
    logger.debug("hi");
    assert.equal(calls, 1);

    console.debug = consoleDebug;
  });

  await t.test("should support info messages", async function () {
    const consoleInfo = console.info;
    let calls = 0;

    console.info = function (...parameters: unknown[]) {
      assert.deepEqual(parameters, ["✦Aj INFO hi"]);
      calls++;
    };

    assert.equal(calls, 0);

    let logger = new Logger({ level: "debug" });
    logger.info("hi");
    assert.equal(calls, 1);

    logger = new Logger({ level: "info" });
    logger.info("hi");
    assert.equal(calls, 2);

    logger = new Logger({ level: "warn" });
    logger.info("hi");
    assert.equal(calls, 2);

    logger = new Logger({ level: "error" });
    logger.info("hi");
    assert.equal(calls, 2);

    console.info = consoleInfo;
  });

  await t.test("should support warn messages", async function () {
    const consoleWarn = console.warn;
    let calls = 0;

    console.warn = function (...parameters: unknown[]) {
      assert.deepEqual(parameters, ["✦Aj WARN hi"]);
      calls++;
    };

    assert.equal(calls, 0);

    let logger = new Logger({ level: "debug" });
    logger.warn("hi");
    assert.equal(calls, 1);

    logger = new Logger({ level: "info" });
    logger.warn("hi");
    assert.equal(calls, 2);

    logger = new Logger({ level: "warn" });
    logger.warn("hi");
    assert.equal(calls, 3);

    logger = new Logger({ level: "error" });
    logger.warn("hi");
    assert.equal(calls, 3);

    console.warn = consoleWarn;
  });

  await t.test("should support error messages", async function () {
    const consoleError = console.error;
    let calls = 0;

    console.error = function (...parameters: unknown[]) {
      assert.deepEqual(parameters, ["✦Aj ERROR hi"]);
      calls++;
    };

    assert.equal(calls, 0);

    let logger = new Logger({ level: "debug" });
    logger.error("hi");
    assert.equal(calls, 1);

    logger = new Logger({ level: "info" });
    logger.error("hi");
    assert.equal(calls, 2);

    logger = new Logger({ level: "warn" });
    logger.error("hi");
    assert.equal(calls, 3);

    logger = new Logger({ level: "error" });
    logger.error("hi");
    assert.equal(calls, 4);

    console.error = consoleError;
  });

  await t.test("should ignore a message object", async function () {
    const consoleDebug = console.debug;
    let calls = 0;

    console.debug = function () {
      calls++;
    };

    assert.equal(calls, 0);

    const logger = new Logger({ level: "debug" });
    logger.debug({ key: "value" });
    assert.equal(calls, 0);

    console.debug = consoleDebug;
  });

  await t.test(
    "should support a message object w/ `msg` field",
    async function () {
      const consoleDebug = console.debug;
      let calls = 0;

      console.debug = function (...parameters: unknown[]) {
        assert.deepEqual(parameters, [
          '✦Aj DEBUG hi\n      key: "value"\n      msg: "hi"',
        ]);
        calls++;
      };

      assert.equal(calls, 0);

      const logger = new Logger({ level: "debug" });
      logger.debug({ key: "value", msg: "hi" });
      assert.equal(calls, 1);

      console.debug = consoleDebug;
    },
  );

  await t.test(
    "should support a message object w/ a message parameter",
    async function () {
      const consoleDebug = console.debug;
      let calls = 0;

      console.debug = function (...parameters: unknown[]) {
        assert.deepEqual(parameters, ['✦Aj DEBUG hi\n      key: "value"']);
        calls++;
      };

      assert.equal(calls, 0);

      const logger = new Logger({ level: "debug" });
      logger.debug({ key: "value" }, "hi");
      assert.equal(calls, 1);

      console.debug = consoleDebug;
    },
  );

  await t.test(
    "should support a message object w/ all kinds of primitive values",
    async function () {
      const consoleDebug = console.debug;
      let calls = 0;

      console.debug = function (...parameters: unknown[]) {
        assert.deepEqual(parameters, [
          '✦Aj DEBUG hi\n      a: "value"\n      b: 1\n      c: true\n      d: null\n      e: undefined\n      f: undefined\n      g: "[BigInt]"',
        ]);
        calls++;
      };

      assert.equal(calls, 0);

      const logger = new Logger({ level: "debug" });
      logger.debug(
        {
          a: "value",
          b: 1,
          c: true,
          d: null,
          e: undefined,
          f: Symbol("symbol"),
          g: BigInt(123),
        },
        "hi",
      );
      assert.equal(calls, 1);

      console.debug = consoleDebug;
    },
  );

  await t.test(
    "should support a message object w/ object values",
    async function () {
      const consoleDebug = console.debug;
      let calls = 0;

      console.debug = function (...parameters: unknown[]) {
        assert.deepEqual(parameters, [
          '✦Aj DEBUG hi\n      a: ["value",1]\n      b: {"c":true}\n      d: [Circular]',
        ]);
        calls++;
      };

      assert.equal(calls, 0);

      const cyclical: Record<string, unknown> = {};
      cyclical.self = cyclical;

      const logger = new Logger({ level: "debug" });
      logger.debug({ a: ["value", 1], b: { c: true }, d: cyclical }, "hi");
      assert.equal(calls, 1);

      console.debug = consoleDebug;
    },
  );

  await t.test(
    "should support format codes and parameters (matching)",
    async function () {
      const consoleDebug = console.debug;
      let calls = 0;

      console.debug = function (...parameters: unknown[]) {
        assert.deepEqual(parameters, ['✦Aj DEBUG hi: value, 1, {"key":true}']);
        calls++;
      };

      assert.equal(calls, 0);

      const logger = new Logger({ level: "debug" });
      logger.debug("hi: %s, %d, %j", "value", 1, { key: true }, "more");
      assert.equal(calls, 1);

      console.debug = consoleDebug;
    },
  );

  await t.test(
    "should support format codes and parameters (non-matching)",
    async function () {
      const consoleDebug = console.debug;
      let calls = 0;

      console.debug = function (...parameters: unknown[]) {
        assert.deepEqual(parameters, ["✦Aj DEBUG hi: %s, %d"]);
        calls++;
      };

      assert.equal(calls, 0);

      const logger = new Logger({ level: "debug" });
      logger.debug("hi: %s, %d", 1, "value");
      assert.equal(calls, 1);

      console.debug = consoleDebug;
    },
  );
});
