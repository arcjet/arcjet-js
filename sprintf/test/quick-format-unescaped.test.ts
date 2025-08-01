import { describe, test } from "node:test";
import assert from "node:assert";
import sprintf from "../index.js";

// This translates the 2nd argument to a spread
function format(str, args) {
  return sprintf(str, ...args);
}

// Based on https://github.com/pinojs/quick-format-unescaped/blob/20ebf64c2f2e182f97923a423d468757b9a24a63/test/index.js
describe("quick-format-unescaped", () => {
  // Commented tests were either commented upstream or we don't support them
  // in the same way. This might mean either input or output format, such as
  // not converting numbers to string, printing null/undefined for strings, or
  // wrapping [Circular] in quotes.
  test("supports much of their test suite", () => {
    assert.equal(format("%d", [42.0]), "42");
    assert.equal(format("%d", [42]), "42");
    assert.equal(format("%f", [42.99]), "42.99");
    assert.equal(format("%i", [42.99]), "42");
    // assert.equal(format("%s", [42]), "42");
    assert.equal(format("%j", [42]), "42");

    assert.equal(format("%d", [undefined]), "%d");
    // assert.equal(format("%s", [undefined]), "undefined");
    assert.equal(format("%j", [undefined]), "%j");

    assert.equal(format("%d", [null]), "%d");
    assert.equal(format("%i", [null]), "%i");
    // assert.equal(format("%s", [null]), "null");
    assert.equal(format("%j", [null]), "null");

    // assert.equal(format("%d", ["42.0"]), "42");
    // assert.equal(format("%d", ["42"]), "42");
    // assert.equal(format("%i", ["42"]), "42");
    // assert.equal(format("%i", ["42.99"]), "42");
    assert.equal(format("%s %i", ["foo", 42.99]), "foo 42");
    // assert.equal(format("%d %d", ["42"]), "42 %d");
    // assert.equal(format("%i %i", ["42"]), "42 %i");
    // assert.equal(format("%i %i", ["42.99"]), "42 %i");
    // assert.equal(format("foo %d", ["42"]), "foo 42");
    assert.equal(format("%s", ["42"]), "42");
    // assert.equal(format('%j', ['42']), '"42"');

    // assert.equal(format('%%s%s', ['foo']), '%sfoo');

    assert.equal(format("%s", []), "%s");
    // assert.equal(format("%s", [undefined]), "undefined");
    assert.equal(format("%s", ["foo"]), "foo");
    assert.equal(format("%s", ['"quoted"']), '"quoted"');
    assert.equal(format("%j", [{ s: '"quoted"' }]), '{"s":"\\"quoted\\""}');
    assert.equal(format("%s:%s", []), "%s:%s");
    // assert.equal(format("%s:%s", [undefined]), "undefined:%s");
    assert.equal(format("%s:%s", ["foo"]), "foo:%s");
    assert.equal(format("%s:%s", ["foo", "bar"]), "foo:bar");
    assert.equal(format("%s:%s", ["foo", "bar", "baz"]), "foo:bar");
    assert.equal(format("%s%s", []), "%s%s");
    // assert.equal(format("%s%s", [undefined]), "undefined%s");
    assert.equal(format("%s%s", ["foo"]), "foo%s");
    assert.equal(format("%s%s", ["foo", "bar"]), "foobar");
    assert.equal(format("%s%s", ["foo", "bar", "baz"]), "foobar");

    assert.equal(format("foo %s", ["foo"]), "foo foo");

    assert.equal(format("foo %o", [{ foo: "foo" }]), 'foo {"foo":"foo"}');
    assert.equal(format("foo %O", [{ foo: "foo" }]), 'foo {"foo":"foo"}');
    assert.equal(format("foo %j", [{ foo: "foo" }]), 'foo {"foo":"foo"}');
    assert.equal(format("foo %j %j", [{ foo: "foo" }]), 'foo {"foo":"foo"} %j');
    assert.equal(format("foo %j", ["foo"]), "foo 'foo'"); // TODO: isn't this wrong?
    assert.equal(format("foo %j", [function foo() {}]), "foo foo");
    assert.equal(format("foo %j", [function () {}]), "foo <anonymous>");
    assert.equal(
      format("foo %j", [{ foo: "foo" }, "not-printed"]),
      'foo {"foo":"foo"}',
    );
    // assert.equal(
    //   format("foo %j", [{ foo: "foo" }], {
    //     stringify() {
    //       return "REPLACED";
    //     },
    //   }),
    //   "foo REPLACED",
    // );
    const circularObject = {};
    // @ts-expect-error
    circularObject.foo = circularObject;
    assert.equal(format("foo %j", [circularObject]), 'foo "[Circular]"');

    // // assert.equal(format(['%%%s%%', 'hi']), '%hi%');
    // // assert.equal(format(['%%%s%%%%', 'hi']), '%hi%%');

    // (function() {
    //   var o = {};
    //   o.o = o;
    //   assert.equal(format(['%j', o]), '[Circular]');
    // })();

    assert.equal(format("%%", ["foo"]), "%");
    assert.equal(format("foo %%", ["foo"]), "foo %");
    assert.equal(format("foo %% %s", ["bar"]), "foo % bar");

    assert.equal(format("%s - %d", ["foo", undefined]), "foo - %d");
    assert.equal(format("%s - %f", ["foo", undefined]), "foo - %f");
    assert.equal(format("%s - %i", ["foo", undefined]), "foo - %i");
    assert.equal(format("%s - %O", ["foo", undefined]), "foo - %O");
    assert.equal(format("%s - %o", ["foo", undefined]), "foo - %o");
    assert.equal(format("%s - %j", ["foo", undefined]), "foo - %j");
    // assert.equal(format("%s - %s", ["foo", undefined]), "foo - undefined");
    assert.equal(format("%s - %%", ["foo", undefined]), "foo - %");

    assert.equal(format("%s - %d", ["foo", null]), "foo - %d");
    assert.equal(format("%s - %f", ["foo", null]), "foo - %f");
    assert.equal(format("%s - %i", ["foo", null]), "foo - %i");
    assert.equal(format("%s - %O", ["foo", null]), "foo - null");
    assert.equal(format("%s - %o", ["foo", null]), "foo - null");
    assert.equal(format("%s - %j", ["foo", null]), "foo - null");
    // assert.equal(format("%s - %s", ["foo", null]), "foo - null");
    assert.equal(format("%s - %%", ["foo", null]), "foo - %");

    assert.equal(format("%d%d", [11, 22]), "1122");
    // assert.equal(format("%d%s", [11, 22]), "1122");
    assert.equal(format("%d%o", [11, { aa: 22 }]), '11{"aa":22}');
    assert.equal(format("%d%d%d", [11, 22, 33]), "112233");
    // assert.equal(format("%d%d%s", [11, 22, 33]), "112233");
    assert.equal(
      format("%d%o%d%s", [11, { aa: 22 }, 33, "sss"]),
      '11{"aa":22}33sss',
    );
    assert.equal(format("%d%%%d", [11, 22]), "11%22");
    // assert.equal(format("%d%%%s", [11, 22]), "11%22");
  });
});
