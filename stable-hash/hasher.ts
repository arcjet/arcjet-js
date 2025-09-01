/**
 * Writer.
 */
export interface StringWriter {
  /**
   * Write data.
   *
   * @param data
   *   Value.
   */
  writeString(data: string): void;
}

interface SubtleCryptoLike {
  digest(
    algorithm: { name: string } | string,
    data: ArrayBufferView<ArrayBufferLike> | ArrayBufferLike,
  ): Promise<ArrayBuffer>;
}

class Sha256 implements StringWriter {
  encoder;
  subtle;

  buf: string;

  constructor(subtle: SubtleCryptoLike) {
    this.subtle = subtle;
    this.encoder = new TextEncoder();
    this.buf = "";
  }

  writeString(data: string): void {
    this.buf += data;
  }

  async digest() {
    const buf = this.encoder.encode(this.buf);
    const digest = await this.subtle.digest("SHA-256", buf);
    return new Uint8Array(digest);
  }
}

// After this, it needs to wrap to 0
const maxUint32 = 4294967295;
const fieldSeparator = ":";
const itemSeparator = ",";

/**
 * Hash a field.
 */
export type FieldHasher = (data: StringWriter) => void;

/**
 * Create a hasher for a boolean.
 *
 * @param key
 *   Key.
 * @param value
 *   Value.
 * @returns
 *   Hasher.
 */
export function bool(key: string, value: boolean): FieldHasher {
  return (data: StringWriter) => {
    data.writeString(key);
    data.writeString(fieldSeparator);
    if (value) {
      data.writeString("true");
    } else {
      data.writeString("false");
    }
  };
}

/**
 * Create a hasher for an unsigned 32-bit integer.
 *
 * @param key
 *   Key.
 * @param value
 *   Value.
 * @returns
 *   Hasher.
 */
export function uint32(key: string, value: number): FieldHasher {
  return (data: StringWriter) => {
    data.writeString(key);
    data.writeString(fieldSeparator);
    if (value > maxUint32) {
      data.writeString("0");
    } else {
      data.writeString(value.toFixed(0));
    }
  };
}

/**
 * Create a hasher for a string.
 *
 * @param key
 *   Key.
 * @param value
 *   Value.
 * @returns
 *   Hasher.
 */
export function string(key: string, value: string): FieldHasher {
  return (data: StringWriter) => {
    data.writeString(key);
    data.writeString(fieldSeparator);
    data.writeString(`"`);
    data.writeString(value.replaceAll(`"`, `\\"`));
    data.writeString(`"`);
  };
}

/**
 * Create a hasher for an array of strings.
 *
 * @param key
 *   Key.
 * @param values
 *   Values.
 * @returns
 *   Hasher.
 */
export function stringSliceOrdered(key: string, values: string[]): FieldHasher {
  return (data: StringWriter) => {
    data.writeString(key);
    data.writeString(fieldSeparator);
    data.writeString("[");
    for (const value of Array.from(values).sort()) {
      data.writeString(`"`);
      data.writeString(value.replaceAll(`"`, `\\"`));
      data.writeString(`"`);
      data.writeString(itemSeparator);
    }
    data.writeString("]");
  };
}

/**
 * Create a hasher.
 *
 * @param subtle
 *   Subtle crypto.
 * @returns
 *   Hasher.
 */
export function makeHasher(subtle: SubtleCryptoLike) {
  /**
   * Hash fields.
   *
   * @param hashers
   *   Hashers.
   * @returns
   *   Promise to a hash.
   */
  return async function hash(...hashers: FieldHasher[]): Promise<string> {
    const h = new Sha256(subtle);
    for (const hasher of hashers) {
      hasher(h);
      h.writeString(itemSeparator);
    }
    const digest = await h.digest();
    return hex(digest);
  };
}

// Hex encoding logic from https://github.com/feross/buffer but adjusted for
// our use.
//
// Licensed: The MIT License (MIT)
//
// Copyright (c) Feross Aboukhadijeh, and other contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// https://github.com/feross/buffer/blob/5857e295f4d37e3ad02c3abcbf7e8e5ef51f3be6/index.js#L2096-L2106
const hexSliceLookupTable = (function () {
  const alphabet = "0123456789abcdef";
  const table = new Array(256);
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16;
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j];
    }
  }
  return table;
})();

// https://github.com/feross/buffer/blob/5857e295f4d37e3ad02c3abcbf7e8e5ef51f3be6/index.js#L1085-L1096
function hex(buf: Uint8Array) {
  const len = buf.length;
  const start = 0;
  const end = len;

  let out = "";
  for (let i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]];
  }
  return out;
}
