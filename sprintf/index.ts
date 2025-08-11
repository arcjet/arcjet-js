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

/**
 * Format a string with placeholders using the provided arguments.
 *
 * @param template
 *   Template.
 * @param values
 *   Values to interpolate.
 * @returns
 *   Formatted string.
 */
export function sprintf(template: string, ...values: unknown[]): string {
  if (typeof template !== "string") {
    throw new TypeError("First argument must be a string");
  }

  if (values.length === 0) {
    return template;
  }

  let output = "";
  let valueIndex = 0;
  let lastPosition = -1;
  for (let index = 0; index < template.length; ) {
    if (
      template.charCodeAt(index) === PERCENT_CODE &&
      index + 1 < template.length
    ) {
      lastPosition = lastPosition > -1 ? lastPosition : 0;
      switch (template.charCodeAt(index + 1)) {
        case LOWERCASE_D_CODE:
        case LOWERCASE_F_CODE: {
          if (valueIndex >= values.length) {
            break;
          }
          const value = values[valueIndex];
          if (typeof value !== "number") {
            break;
          }
          if (lastPosition < index) {
            output += template.slice(lastPosition, index);
          }
          output += value;
          lastPosition = index + 2;
          index++;
          break;
        }
        case LOWERCASE_I_CODE: {
          if (valueIndex >= values.length) {
            break;
          }
          const value = values[valueIndex];
          if (typeof value !== "number") {
            break;
          }
          if (lastPosition < index) {
            output += template.slice(lastPosition, index);
          }
          output += Math.floor(value);
          lastPosition = index + 2;
          index++;
          break;
        }
        case UPPERCASE_O_CODE:
        case LOWERCASE_O_CODE:
        case LOWERCASE_J_CODE: {
          if (valueIndex >= values.length) {
            break;
          }
          const value = values[valueIndex];
          if (value === undefined) {
            break;
          }
          if (lastPosition < index) {
            output += template.slice(lastPosition, index);
          }
          if (typeof value === "string") {
            output += `'${value}'`;
            lastPosition = index + 2;
            index++;
            break;
          }
          if (typeof value === "bigint") {
            output += `"[BigInt]"`;
            lastPosition = index + 2;
            index++;
            break;
          }
          if (typeof value === "function") {
            output += value.name || "<anonymous>";
            lastPosition = index + 2;
            index++;
            break;
          }
          output += tryStringify(value);
          lastPosition = index + 2;
          index++;
          break;
        }
        case LOWERCASE_S_CODE: {
          if (valueIndex >= values.length) {
            break;
          }
          const value = values[valueIndex];
          if (typeof value !== "string") {
            break;
          }
          if (lastPosition < index) {
            output += template.slice(lastPosition, index);
          }
          output += value;
          lastPosition = index + 2;
          index++;
          break;
        }
        case PERCENT_CODE: {
          if (lastPosition < index) {
            output += template.slice(lastPosition, index);
          }
          output += "%";
          lastPosition = index + 2;
          index++;
          valueIndex--;
          break;
        }
      }
      ++valueIndex;
    }
    ++index;
  }
  if (lastPosition === -1) {
    return template;
  }

  if (lastPosition < template.length) {
    output += template.slice(lastPosition);
  }

  return output;
}

/**
 * Format a string.
 *
 * @deprecated
 *   Use `sprintf` instead.
 */
export default sprintf;
