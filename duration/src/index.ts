// This Parser is a TypeScript implementation of similar code in the Go stdlib
// with deviations made to support usage in the Arcjet SDK.
//
// Parser source:
// https://github.com/golang/go/blob/c18ddc84e1ec6406b26f7e9d0e1ee3d1908d7c27/src/time/format.go#L1589-L1686
//
// Licensed: BSD 3-Clause "New" or "Revised" License
// Copyright (c) 2009 The Go Authors. All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//    * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//    * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//    * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

const second = 1;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;

const maxUint32 = 4294967295;

const units = new Map([
  ["s", second],
  ["m", minute],
  ["h", hour],
  ["d", day],
]);

const integers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// leadingInt consumes the leading [0-9]* from s.
function leadingInt(s: string): [number, string] {
  let i = 0;
  let x = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (!integers.includes(c)) {
      break;
    }
    x = x * 10 + parseInt(c, 10);
    if (x > maxUint32) {
      // overflow
      throw new Error("bad [0-9]*"); // never printed
    }
  }
  return [x, s.slice(i)];
}

/**
 * Parse a duration into a number representing seconds while ensuring the value
 * fits within an unsigned 32-bit integer.
 *
 * If a number is passed it is validated and returned.
 *
 * If a string is passed it must be in the form of digits followed by a unit.
 * Supported units are `s` (seconds),
 * `m` (minutes),
 * `h` (hours),
 * and `d` (days).
 *
 * @example
 *   ```ts
 *   console.log(parse("1s")) // => 1
 *   console.log(parse("1m")) // => 60
 *   console.log(parse("1h")) // => 3600
 *   console.log(parse("1d")) // => 86400
 *   ```
 * @param value
 *   Value to parse.
 * @returns
 *   Parsed seconds.
 */
export function parse(value: number | string): number {
  const original = value;

  if (typeof value === "number") {
    if (value > maxUint32) {
      throw new Error(`invalid duration: ${original}`);
    }

    if (value < 0) {
      throw new Error(`invalid duration: ${original}`);
    }

    if (!Number.isInteger(value)) {
      throw new Error(`invalid duration: ${original}`);
    }

    return value;
  }

  if (typeof value !== "string") {
    throw new Error("can only parse a duration string");
  }

  let d = 0;

  // Special case: if all that is left is "0", this is zero.
  if (value === "0") {
    return 0;
  }
  if (value === "") {
    throw new Error(`invalid duration: ${original}`);
  }

  while (value !== "") {
    let v = 0;

    // The next character must be [0-9]
    if (!integers.includes(value[0])) {
      throw new Error(`invalid duration: ${original}`);
    }
    // Consume [0-9]*
    [v, value] = leadingInt(value);
    // Error on decimal (\.[0-9]*)?
    if (value !== "" && value[0] == ".") {
      // TODO: We could support decimals that turn into non-decimal seconds—e.g.
      // 1.5hours becomes 5400 seconds
      throw new Error(`unsupported decimal duration: ${original}`);
    }

    // Consume unit.
    let i = 0;
    for (; i < value.length; i++) {
      const c = value[i];
      if (integers.includes(c)) {
        break;
      }
    }
    if (i == 0) {
      throw new Error(`missing unit in duration: ${original}`);
    }
    const u = value.slice(0, i);
    value = value.slice(i);
    const unit = units.get(u);
    if (typeof unit === "undefined") {
      throw new Error(`unknown unit "${u}" in duration ${original}`);
    }
    if (v > maxUint32 / unit) {
      // overflow
      throw new Error(`invalid duration ${original}`);
    }
    v *= unit;
    d += v;
    if (d > maxUint32) {
      throw new Error(`invalid duration ${original}`);
    }
  }

  return d;
}
