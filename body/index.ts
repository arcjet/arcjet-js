import { Readable } from "stream";

export type GetBodyOpts = {
  encoding: string;
  limit?: number;
  expectedLength?: number;
};

export function getBody(stream: Readable, opts: GetBodyOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    getBodySync(stream, opts, (err?: Error, buffer?: string) => {
      if (err) return reject(err);
      if (buffer) return resolve(buffer);
      reject(new Error("body reader is in an unexpected state"));
    });
  });
}

type StreamReadCallback = (err?: Error, data?: string) => void;
export function getBodySync(
  stream: Readable,
  opts: GetBodyOpts,
  callback: StreamReadCallback,
) {
  const decoder = new TextDecoder(opts.encoding);
  let buffer = "";
  let complete = false;
  let sync = true;

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

  // mark sync section complete
  sync = false;

  function done(err?: Error, buffer?: string) {
    complete = true;

    if (sync) {
      process.nextTick(invokeCallback);
    } else {
      invokeCallback();
    }

    function invokeCallback() {
      cleanup();
      callback.apply(null, [err, buffer]);
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
      buffer += decoder.decode(chunk);
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
}
