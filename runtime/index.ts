/**
 * Runtime environment that can be detected.
 */
export type Runtime = "workerd" | "deno" | "node" | "bun" | "edge-light" | "";

interface NavigatorLike {
  userAgent?: string | null | undefined;
}

declare const navigator: NavigatorLike | undefined;
declare const Deno: any | undefined;
declare const Bun: any | undefined;
declare const EdgeRuntime: any | undefined;
declare const process: any | undefined;

// This code was improved by detection mechanisms in
// https://github.com/unjs/std-env/blob/b4ef16832baf4594ece7796a2c1805712fde70a3/src/runtimes.ts
//
// MIT License
//
// Copyright (c) Pooya Parsa <pooya@pi0.io>
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
 * Detect the current runtime environment at runtime.
 *
 * @returns
 *   Runtime; empty string if not found.
 */
export function runtime(): Runtime {
  // The detection order matters in this function because some platforms will
  // implement compatibility layers, but we want to detect them accurately.

  // https://developers.cloudflare.com/workers/configuration/compatibility-dates/#global-navigator
  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  ) {
    return "workerd";
  }

  if (typeof Deno !== "undefined") {
    return "deno";
  }

  if (typeof Bun !== "undefined") {
    return "bun";
  }

  if (typeof EdgeRuntime !== "undefined") {
    return "edge-light";
  }

  if (typeof process !== "undefined" && process?.release?.name === "node") {
    return "node";
  }

  // Unknown or unsupported runtime
  return "";
}
