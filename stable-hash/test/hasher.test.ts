import { describe, test } from "node:test";
import * as nodeCrypto from "node:crypto";

import { expect } from "expect";
import {
  bool,
  uint32,
  string,
  stringSliceOrdered,
  makeHasher,
} from "../hasher.js";
import type { StringWriter } from "../hasher.js";

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
    expect(buf.toString()).toEqual("true:true");

    buf.reset();
    bool("false", false)(buf);
    expect(buf.toString()).toEqual("false:false");
  });

  test("uint32", () => {
    const buf = new StringBuf();

    buf.reset();
    uint32("zero", 0)(buf);
    expect(buf.toString()).toEqual("zero:0");

    buf.reset();
    uint32("max", maxUint32)(buf);
    expect(buf.toString()).toEqual("max:4294967295");

    buf.reset();
    uint32("overflow", maxUint32 + 1)(buf);
    expect(buf.toString()).toEqual("overflow:0");
  });

  test("string", () => {
    const buf = new StringBuf();

    buf.reset();
    string("empty", "")(buf);
    expect(buf.toString()).toEqual(`empty:""`);

    buf.reset();
    string("regular", "foo")(buf);
    expect(buf.toString()).toEqual(`regular:"foo"`);

    buf.reset();
    string("double-quote", `foo"bar"`)(buf);
    expect(buf.toString()).toEqual(`double-quote:"foo\\"bar\\""`);

    buf.reset();
    string("single-quote", `foo'bar'`)(buf);
    expect(buf.toString()).toEqual(`single-quote:"foo'bar'"`);

    buf.reset();
    string("both-quote", `foo"bar'baz"`)(buf);
    expect(buf.toString()).toEqual(`both-quote:"foo\\"bar'baz\\""`);

    buf.reset();
    string("escaped-double-quotes", `foo\\"bar'baz\\"`)(buf);
    expect(buf.toString()).toEqual(
      `escaped-double-quotes:"foo\\\\"bar'baz\\\\""`,
    );
  });

  test("stringSliceOrdered", () => {
    const buf = new StringBuf();

    buf.reset();
    stringSliceOrdered("empty", [])(buf);
    expect(buf.toString()).toEqual(`empty:[]`);

    buf.reset();
    stringSliceOrdered("order", ["foo", "bar", "baz"])(buf);
    expect(buf.toString()).toEqual(`order:["bar","baz","foo",]`);

    buf.reset();
    stringSliceOrdered("string-empty", [""])(buf);
    expect(buf.toString()).toEqual(`string-empty:["",]`);

    buf.reset();
    stringSliceOrdered("empty-and-non-empty-strings", ["foo", "", "bar"])(buf);
    expect(buf.toString()).toEqual(
      `empty-and-non-empty-strings:["","bar","foo",]`,
    );

    buf.reset();
    stringSliceOrdered("double-quote", [`foo"bar"`, "baz"])(buf);
    expect(buf.toString()).toEqual(`double-quote:["baz","foo\\"bar\\"",]`);

    buf.reset();
    stringSliceOrdered("single-quote", [`foo'bar'`, "baz"])(buf);
    expect(buf.toString()).toEqual(`single-quote:["baz","foo'bar'",]`);

    buf.reset();
    stringSliceOrdered("both-quote", [`foo"bar'baz"`, `foo'bar"baz'`])(buf);
    expect(buf.toString()).toEqual(
      `both-quote:["foo\\"bar'baz\\"","foo'bar\\"baz'",]`,
    );

    buf.reset();
    stringSliceOrdered("escaped-and-non-escaped-double-quotes", [
      `foo\\"bar'baz\\"`,
      `foo"bar'baz"`,
    ])(buf);
    expect(buf.toString()).toEqual(
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
    expect(await hash()).toEqual(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );

    // Smoke test
    expect(
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
    ).toEqual(
      "55f19be557bebdd8588ff2be79ccd95f7540ee7bd9600657d54508890bb968cd",
    );
  });
});
