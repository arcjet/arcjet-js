import assert from "node:assert/strict";
import test from "node:test";
import { parseForwarded } from "../index.js";

test("parseForwarded", async function (t) {
  await t.test(
    "should throw an unexpected character before quoted value",
    function () {
      const generator = parseForwarded('a=b"c"');
      assert.throws(function () {
        generator.next();
      }, /Unexpected character before quoted field value, expected `=` or escape/);
    },
  );

  await t.test(
    "should throw an unexpected character in quoted value",
    function () {
      const generator = parseForwarded('a="b👍c"');
      assert.throws(function () {
        generator.next();
      }, /Unexpected character in quoted field value, expected tab, space, or visible ASCII character/);
    },
  );

  await t.test("should throw an unexpected character after value", function () {
    const generator = parseForwarded("a=b👍");
    assert.throws(function () {
      generator.next();
    }, /Unexpected character after field, expected `"` \(for quoted value\) or token character \(for unquoted value\)/);
  });

  await t.test(
    "should throw an unexpected character in unquoted value",
    function () {
      const generator = parseForwarded("a=b👍c");
      assert.throws(function () {
        generator.next();
      }, /Unexpected character in unquoted field value, expected token character or `=` \(note: use quotes around a value with colons such as ports and IPv6 addresses\)/);
    },
  );

  await t.test("should throw an unexpected character in name", function () {
    const generator = parseForwarded("👍a=b");
    assert.throws(function () {
      generator.next();
    }, /Unexpected character in field name, expected token character, `,`, `;`, or whitespace/);
  });

  await t.test("should throw an unexpected character before name", function () {
    const generator = parseForwarded("👍 a=b");
    assert.throws(function () {
      generator.next();
    }, /Unexpected character before field name, expected `,` or `;`/);
  });

  await t.test("should throw an final whitespace", function () {
    const generator = parseForwarded("a=b ");
    assert.throws(function () {
      generator.next();
    }, /Unexpected character after field, expected `"` \(for quoted value\) or token character \(for unquoted value\)/);
  });

  await t.test("should throw an initial whitespace", function () {
    const generator = parseForwarded(" a=b");
    assert.throws(function () {
      generator.next();
    }, /Unexpected initial whitespace before field name, expected nothing/);
  });

  await t.test("should support an escaped character", function () {
    const generator = parseForwarded('a="b\\c"');
    assert.deepEqual(generator.next().value, new Map([["a", "bc"]]));
    assert.equal(generator.next().done, true);
  });

  await t.test(
    "should support an escaped escape followed by a character",
    function () {
      const generator = parseForwarded('a="b\\\\c"');
      assert.deepEqual(generator.next().value, new Map([["a", "b\\c"]]));
      assert.equal(generator.next().done, true);
    },
  );

  await t.test(
    "should support an escaped escape followed by an escaped character",
    function () {
      const generator = parseForwarded('a="b\\\\\\c"');
      assert.deepEqual(generator.next().value, new Map([["a", "b\\c"]]));
      assert.equal(generator.next().done, true);
    },
  );

  await t.test(
    "should support two escaped escapes followed by a character",
    function () {
      const generator = parseForwarded('a="b\\\\\\\\c"');
      assert.deepEqual(generator.next().value, new Map([["a", "b\\\\c"]]));
      assert.equal(generator.next().done, true);
    },
  );

  await t.test("should support an escaped quote", function () {
    const generator = parseForwarded('a="b\\"c"');

    assert.deepEqual(generator.next().value, new Map([["a", 'b"c']]));
    assert.equal(generator.next().done, true);
  });

  await t.test(
    "should throw on an escaped escape followed by a quote",
    function () {
      const generator = parseForwarded('a="b\\\\"c"');
      assert.throws(function () {
        generator.next();
      }, /Unexpected unterminated string, expected escape/);
    },
  );

  await t.test(
    "should support an escaped escape and an escaped quote",
    function () {
      const generator = parseForwarded('a="b\\\\\\"c"');

      assert.deepEqual(generator.next().value, new Map([["a", 'b\\"c']]));
      assert.equal(generator.next().done, true);
    },
  );

  await t.test(
    "should throw on two escaped escapes followed by a quote",
    function () {
      const generator = parseForwarded('a="b\\\\\\\\"c"');
      assert.throws(function () {
        generator.next();
      }, /Unexpected unterminated string, expected escape/);
    },
  );

  await t.test("should throw on an unterminated quoted value", function () {
    const generator = parseForwarded('a="b\\"');

    assert.throws(function () {
      generator.next();
    }, /Unexpected unterminated string, expected escape/);
  });

  await t.test(
    "should support an escaped escape before final quote",
    function () {
      const generator = parseForwarded('a="b\\\\"');
      assert.deepEqual(generator.next().value, new Map([["a", "b\\"]]));
      assert.equal(generator.next().done, true);
    },
  );

  await t.test(
    "should throw on an unterminated quoted value, with escaped escape",
    function () {
      const generator = parseForwarded('a="b\\\\\\"');

      assert.throws(function () {
        generator.next();
      }, /Unexpected unterminated string, expected escape/);
    },
  );

  await t.test(
    "should support two escaped escapes before final quote",
    function () {
      const generator = parseForwarded('a="b\\\\\\\\"');
      assert.deepEqual(generator.next().value, new Map([["a", "b\\\\"]]));
      assert.equal(generator.next().done, true);
    },
  );
});
