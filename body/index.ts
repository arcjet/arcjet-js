/**
 * Configuration.
 */
export type ReadBodyOpts = {
  /**
   * Length of the stream in bytes (optional);
   * an error is returned if the contents of the stream do not add up to this length;
   * useful when the exact size is known.
   */
  expectedLength?: number | null | undefined;
  /**
   * Limit of the body in bytes (default: `1048576`);
   * an error is returned if the body ends up being larger than this limit;
   * used to prevent reading too much data from malicious clients.
   */
  limit?: number | null | undefined;
};

type EventHandlerLike = (
  event: string,
  listener: (...args: any[]) => void,
) => void;

/**
 * Stream.
 */
export interface ReadableStreamLike {
  on?: EventHandlerLike | null | undefined;
  readable?: boolean | null | undefined;
  removeListener?: EventHandlerLike | null | undefined;
}

// This `readBody` function is a derivitive of the `getRawBody` function in the `raw-body`
// npm package with deviations to strip down the implementation to specifically what is needed
// by Arcjet.
//
// These include:
// - The removal of the sync interface.
// - The removal of the ability to return the body as a `Buffer`. Instead the body is always
//   parsed as a utf-8 string.
// - The removal of certain config options that are not relevant to us.
//
// Original source:
// https://github.com/stream-utils/raw-body/blob/191e4b6506dcf77198eed01c8feb4b6817008342/test/index.js
//
// Licensed: The MIT License (MIT)
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/**
 * Read the body of a stream.
 *
 * @param stream
 *   Stream.
 * @param options
 *   Configuration (optional).
 * @returns
 *   Promise to a concatenated body.
 */
export async function readBody(
  stream: ReadableStreamLike,
  options?: ReadBodyOpts | null | undefined,
): Promise<string> {
  const limit = options?.limit ?? 1048576; // 1mb.
  const length = options?.expectedLength ?? undefined;
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let complete = false;
  let received = 0;

  if (typeof limit !== "number" || limit < 0 || Number.isNaN(limit)) {
    return Promise.reject(
      new Error(
        "Unexpected value `" +
          limit +
          "` for `options.limit`, expected positive number",
      ),
    );
  }

  if (
    length !== undefined &&
    (typeof length !== "number" || length < 0 || Number.isNaN(length))
  ) {
    return Promise.reject(
      new Error(
        "Unexpected value `" +
          length +
          "` for `options.expectedLength`, expected positive number",
      ),
    );
  }

  if (typeof stream.on !== "function") {
    return Promise.reject(
      new Error(
        "Unexpected value `" +
          stream.on +
          "` for `stream.on`, expected function",
      ),
    );
  }

  if (typeof stream.removeListener !== "function") {
    return Promise.reject(
      new Error(
        "Unexpected value `" +
          stream.removeListener +
          "` for `stream.removeListener`, expected function",
      ),
    );
  }

  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return Promise.reject(
      new Error(
        "Unexpected value `" + limit + "` for `options.limit`, expected number",
      ),
    );
  }

  if (typeof stream.readable !== "undefined" && !stream.readable) {
    return Promise.reject(new Error("Cannot read unreadable stream"));
  }

  // If we already know the length and it exceeds the limit, abort early.
  if (length !== undefined && length > limit) {
    return Promise.reject(new Error("Cannot read stream whose expected length exceeds limit"));
  }

  return new Promise((resolve, reject) => {
    // This was already checked at the top of the function but TypeScript lost
    // the context
    if (typeof stream.on === "function") {
      stream.on("aborted", onAborted);
      stream.on("close", cleanup);
      stream.on("data", onData);
      stream.on("end", onEnd);
      stream.on("error", onEnd);
    }

    function done(
      err?: Error | null | undefined,
      buffer?: string | null | undefined,
    ) {
      // Ensure we avoid double resolve/reject if called more than once
      if (complete) return;

      complete = true;

      cleanup();
      if (typeof err !== "undefined") {
        reject(err);
      } else if (buffer !== null && buffer !== undefined) {
        // Need to call it one final time to flush any remaining chars.
        buffer += decoder.decode();
        resolve(buffer);
      }
    }

    function onAborted() {
      done(new Error("Cannot read aborted stream"));
    }

    function onData(chunk: Buffer) {
      received += chunk.length;

      if (received > limit) {
        done(new Error("Cannot read stream that exceeds limit"));
      } else {
        buffer += decoder.decode(chunk, { stream: true });
      }
    }

    function onEnd(err?: Error) {
      if (err) return done(err);

      if (length !== undefined && received !== length) {
        done(new Error("Cannot read stream whose length does not match expected length"));
      } else {
        done(undefined, buffer);
      }
    }

    function cleanup() {
      buffer = "";

      // This was already checked at the top of the function but TypeScript lost
      // the context
      if (typeof stream.removeListener === "function") {
        stream.removeListener("aborted", onAborted);
        stream.removeListener("data", onData);
        stream.removeListener("end", onEnd);
        stream.removeListener("error", onEnd);
        stream.removeListener("close", cleanup);
      }
    }

    // Ensure that we don't poll forever if the stream is incorrectly configured
    setTimeout(() => {
      if (received === 0) {
        done(
          new Error("Cannot read stream, did not receive data in time limit"),
        );
      }
    }, 100);
  });
}
