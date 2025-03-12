function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return "[BigInt]";
  }

  return value;
}

// TODO: Deduplicate this and logger implementation
function tryStringify(o: unknown) {
  try {
    return JSON.stringify(o, bigintReplacer);
  } catch {
    return `"[Circular]"`;
  }
}

const PERCENT_CODE = 37; /* % */
const LOWERCASE_D_CODE = 100; /* d */
const LOWERCASE_F_CODE = 102; /* f */
const LOWERCASE_I_CODE = 105; /* i */
const UPPERCASE_O_CODE = 79; /* O */
const LOWERCASE_O_CODE = 111; /* o */
const LOWERCASE_J_CODE = 106; /* j */
const LOWERCASE_S_CODE = 115; /* s */

// Heavily based on https://github.com/pinojs/quick-format-unescaped
//
// The MIT License (MIT)
//
// Copyright (c) 2016-2019 David Mark Clements
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
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
export default function sprintf(str: string, ...args: unknown[]): string {
  if (typeof str !== "string") {
    throw new TypeError("First argument must be a string");
  }

  const argsLength = args.length;
  if (argsLength === 0) {
    return str;
  }

  let output = "";
  let argIdx = 0;
  let lastPosition = -1;
  const strLength = str.length;
  for (let i = 0; i < strLength; ) {
    if (str.charCodeAt(i) === PERCENT_CODE && i + 1 < strLength) {
      lastPosition = lastPosition > -1 ? lastPosition : 0;
      switch (str.charCodeAt(i + 1)) {
        case LOWERCASE_D_CODE:
        case LOWERCASE_F_CODE: {
          if (argIdx >= argsLength) {
            break;
          }
          const arg = args[argIdx];
          if (typeof arg !== "number") {
            break;
          }
          if (lastPosition < i) {
            output += str.slice(lastPosition, i);
          }
          output += arg;
          lastPosition = i + 2;
          i++;
          break;
        }
        case LOWERCASE_I_CODE: {
          if (argIdx >= argsLength) {
            break;
          }
          const arg = args[argIdx];
          if (typeof arg !== "number") {
            break;
          }
          if (lastPosition < i) {
            output += str.slice(lastPosition, i);
          }
          output += Math.floor(arg);
          lastPosition = i + 2;
          i++;
          break;
        }
        case UPPERCASE_O_CODE:
        case LOWERCASE_O_CODE:
        case LOWERCASE_J_CODE: {
          if (argIdx >= argsLength) {
            break;
          }
          const arg = args[argIdx];
          if (arg === undefined) {
            break;
          }
          if (lastPosition < i) {
            output += str.slice(lastPosition, i);
          }
          if (typeof arg === "string") {
            output += `'${arg}'`;
            lastPosition = i + 2;
            i++;
            break;
          }
          if (typeof arg === "bigint") {
            output += `"[BigInt]"`;
            lastPosition = i + 2;
            i++;
            break;
          }
          if (typeof arg === "function") {
            output += arg.name || "<anonymous>";
            lastPosition = i + 2;
            i++;
            break;
          }
          output += tryStringify(arg);
          lastPosition = i + 2;
          i++;
          break;
        }
        case LOWERCASE_S_CODE: {
          if (argIdx >= argsLength) {
            break;
          }
          const arg = args[argIdx];
          if (typeof arg !== "string") {
            break;
          }
          if (lastPosition < i) {
            output += str.slice(lastPosition, i);
          }
          output += arg;
          lastPosition = i + 2;
          i++;
          break;
        }
        case PERCENT_CODE: {
          if (lastPosition < i) {
            output += str.slice(lastPosition, i);
          }
          output += "%";
          lastPosition = i + 2;
          i++;
          argIdx--;
          break;
        }
      }
      ++argIdx;
    }
    ++i;
  }
  if (lastPosition === -1) {
    return str;
  }

  if (lastPosition < strLength) {
    output += str.slice(lastPosition);
  }

  return output;
}
