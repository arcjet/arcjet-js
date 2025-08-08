import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as nodeCrypto from "node:crypto";
import {
  type StringWriter,
  bool,
  uint32,
  string,
  stringSliceOrdered,
  makeHasher,
} from "@arcjet/stable-hash";

describe("hasher", () => {
  const maxUint32 = 4294967295;

  class StringBuf implements StringWriter {
    buf: string;

    constructor() {
      this.buf = "";
    }

    writeString(value: string) {
      this.buf += value;
    }

    reset() {
      this.buf = "";
    }

    toString() {
      return this.buf;
    }
  }

  test("bool", () => {
    const buf = new StringBuf();

    buf.reset();
    bool("true", true)(buf);
    assert.equal(buf.toString(), "true:true");

    buf.reset();
    bool("false", false)(buf);
    assert.equal(buf.toString(), "false:false");
  });

  test("uint32", () => {
    const buf = new StringBuf();

    buf.reset();
    uint32("zero", 0)(buf);
    assert.equal(buf.toString(), "zero:0");

    buf.reset();
    uint32("max", maxUint32)(buf);
    assert.equal(buf.toString(), "max:4294967295");

    buf.reset();
    uint32("overflow", maxUint32 + 1)(buf);
    assert.equal(buf.toString(), "overflow:0");
  });

  test("string", () => {
    const buf = new StringBuf();

    buf.reset();
    string("empty", "")(buf);
    assert.equal(buf.toString(), `empty:""`);

    buf.reset();
    string("regular", "foo")(buf);
    assert.equal(buf.toString(), `regular:"foo"`);

    buf.reset();
    string("double-quote", `foo"bar"`)(buf);
    assert.equal(buf.toString(), `double-quote:"foo\\"bar\\""`);

    buf.reset();
    string("single-quote", `foo'bar'`)(buf);
    assert.equal(buf.toString(), `single-quote:"foo'bar'"`);

    buf.reset();
    string("both-quote", `foo"bar'baz"`)(buf);
    assert.equal(buf.toString(), `both-quote:"foo\\"bar'baz\\""`);

    buf.reset();
    string("escaped-double-quotes", `foo\\"bar'baz\\"`)(buf);
    assert.equal(
      buf.toString(),
      `escaped-double-quotes:"foo\\\\"bar'baz\\\\""`,
    );
  });

  test("stringSliceOrdered", () => {
    const buf = new StringBuf();

    buf.reset();
    stringSliceOrdered("empty", [])(buf);
    assert.equal(buf.toString(), `empty:[]`);

    buf.reset();
    stringSliceOrdered("order", ["foo", "bar", "baz"])(buf);
    assert.equal(buf.toString(), `order:["bar","baz","foo",]`);

    buf.reset();
    stringSliceOrdered("string-empty", [""])(buf);
    assert.equal(buf.toString(), `string-empty:["",]`);

    buf.reset();
    stringSliceOrdered("empty-and-non-empty-strings", ["foo", "", "bar"])(buf);
    assert.equal(
      buf.toString(),
      `empty-and-non-empty-strings:["","bar","foo",]`,
    );

    buf.reset();
    stringSliceOrdered("double-quote", [`foo"bar"`, "baz"])(buf);
    assert.equal(buf.toString(), `double-quote:["baz","foo\\"bar\\"",]`);

    buf.reset();
    stringSliceOrdered("single-quote", [`foo'bar'`, "baz"])(buf);
    assert.equal(buf.toString(), `single-quote:["baz","foo'bar'",]`);

    buf.reset();
    stringSliceOrdered("both-quote", [`foo"bar'baz"`, `foo'bar"baz'`])(buf);
    assert.equal(
      buf.toString(),
      `both-quote:["foo\\"bar'baz\\"","foo'bar\\"baz'",]`,
    );

    buf.reset();
    stringSliceOrdered("escaped-and-non-escaped-double-quotes", [
      `foo\\"bar'baz\\"`,
      `foo"bar'baz"`,
    ])(buf);
    assert.equal(
      buf.toString(),
      `escaped-and-non-escaped-double-quotes:["foo\\"bar'baz\\"","foo\\\\"bar'baz\\\\"",]`,
    );
  });

  test("hash", async () => {
    let subtle;
    if ("crypto" in globalThis) {
      subtle = crypto.subtle;
    } else {
      subtle = nodeCrypto.subtle;
    }
    const hash = makeHasher(subtle);

    // Empty
    assert.equal(
      await hash(),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );

    // Smoke test
    assert.equal(
      await hash(
        bool("true", true),
        bool("false", false),
        uint32("zero", 0),
        uint32("max", maxUint32),
        string("empty", ""),
        string("not-empty", "foo"),
        string("quotes", `a"b"c"`),
        string("escaped-quotes", `a\\"b\\"c\\"`),
        stringSliceOrdered("empty", []),
        stringSliceOrdered("not-empty", ["bar", "baz"]),
        stringSliceOrdered("quotes", [`a"b"c"`]),
        stringSliceOrdered("escaped-quotes", [`a\\"b\\"c\\"`]),
      ),
      "55f19be557bebdd8588ff2be79ccd95f7540ee7bd9600657d54508890bb968cd",
    );
  });
});
