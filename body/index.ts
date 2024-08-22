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
  on: EventHandlerLike;
  removeListener: EventHandlerLike;
  readable?: boolean;
}

export async function readBody(
  stream: ReadableStreamLike,
  opts: ReadBodyOpts,
): Promise<string> {
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let complete = false;

  return new Promise((resolve, reject) => {
    if (typeof stream.readable !== "undefined" && !stream.readable) {
      done(new Error("stream is not readable"));
    }

    let received = 0;

    const limit = opts.limit || 0;
    const length = opts.expectedLength || null;

    // attach listeners
    stream.on("aborted", onAborted);
    stream.on("close", cleanup);
    stream.on("data", onData);
    stream.on("end", onEnd);
    stream.on("error", onEnd);

    function done(err?: Error, buffer?: string) {
      complete = true;

      cleanup();
      if (typeof err !== "undefined") {
        reject(err);
      } else if (typeof buffer !== "undefined") {
        resolve(buffer);
      }
    }

    function onAborted() {
      if (complete) return;

      done(new Error("Stream was aborted"));
    }

    function onData(chunk: Buffer) {
      if (complete) return;

      received += chunk.length;

      if (received > limit) {
        done(new Error("request entity too large"));
      } else {
        buffer += decoder.decode(chunk, { stream: true });
      }
    }

    function onEnd(err?: Error) {
      if (complete) return;
      if (err) return done(err);

      if (length !== null && received !== length) {
        done(new Error("request size did not match content length"));
      } else {
        done(undefined, buffer);
      }
    }

    function cleanup() {
      buffer = "";

      stream.removeListener("aborted", onAborted);
      stream.removeListener("data", onData);
      stream.removeListener("end", onEnd);
      stream.removeListener("error", onEnd);
      stream.removeListener("close", cleanup);
    }

    // ensure that we don't poll forever if the stream is incorrectly configured.
    setTimeout(() => {
      if (received === 0) {
        done(new Error("received no body chunks after 100ms"));
      }
    }, 100);
  });
}
