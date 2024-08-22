export type ReadBodyOpts = {
  limit: number;
  expectedLength?: number;
};

type EventHandlerLike = (
  event: string,
  listener: (...args: any[]) => void,
) => void;

// The fields from stream.Readable that we use
export interface ReadableStreamLike {
  on?: EventHandlerLike;
  removeListener?: EventHandlerLike;
  readable?: boolean;
}

export async function readBody(
  stream: ReadableStreamLike,
  opts: ReadBodyOpts,
): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let complete = false;
  let received = 0;
  const limit = opts.limit;
  if (typeof limit !== "number") {
    return Promise.reject(new Error("must set a limit"));
  }
  const length = opts.expectedLength || null;

  if (typeof stream.readable !== "undefined" && !stream.readable) {
    return Promise.reject(new Error("stream is not readable"));
  }
  if (typeof stream.on !== "function") {
    return Promise.reject(new Error("missing `on` function"));
  }
  if (typeof stream.removeListener !== "function") {
    return Promise.reject(new Error("missing `removeListener` function"));
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

    function done(err?: Error, buffer?: string) {
      // Ensure we avoid double resolve/reject if called more than once
      if (complete) return;

      complete = true;

      cleanup();
      if (typeof err !== "undefined") {
        reject(err);
      } else if (typeof buffer !== "undefined") {
        resolve(buffer);
      }
    }

    function onAborted() {
      done(new Error("Stream was aborted"));
    }

    function onData(chunk: Buffer) {
      received += chunk.length;

      if (received > limit) {
        done(new Error("request entity too large"));
      } else {
        buffer += decoder.decode(chunk, { stream: true });
      }
    }

    function onEnd(err?: Error) {
      if (err) return done(err);

      if (length !== null && received !== length) {
        done(new Error("request size did not match content length"));
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
        done(new Error("received no body chunks after 100ms"));
      }
    }, 100);
  });
}
