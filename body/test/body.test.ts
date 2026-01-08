import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { describe, test } from "node:test";
import * as http from "http";
import { readBody } from "../index.js";
import type { AddressInfo } from "net";

test("@arcjet/body", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "readBody",
    ]);
  });
});

describe("reads the body from the readable stream", () => {
  test("should fail if `limit` is not a number", async function (t) {
    const stream = new Readable({ read() {} });
    await assert.rejects(
      readBody(stream, {
        // @ts-expect-error: test runtime behavior.
        limit: "1kb",
      }),
      /Unexpected value `1kb` for `options\.limit`, expected positive number/,
    );
  });

  test("should fail if `limit` is literally not a number", async function (t) {
    const stream = new Readable({ read() {} });
    await assert.rejects(
      readBody(stream, { limit: NaN }),
      /Unexpected value `NaN` for `options\.limit`, expected positive number/,
    );
  });

  test("should fail if `limit` is a negative number", async function (t) {
    const stream = new Readable({ read() {} });
    await assert.rejects(
      readBody(stream, { limit: -1 }),
      /Unexpected value `-1` for `options\.limit`, expected positive number/,
    );
  });

  test("should fail if `expectedLength` is not a number", async function (t) {
    const stream = new Readable({ read() {} });
    await assert.rejects(
      readBody(stream, {
        // @ts-expect-error: test runtime behavior.
        expectedLength: "1kb",
      }),
      /Unexpected value `1kb` for `options\.expectedLength`, expected positive number/,
    );
  });

  test("should fail if `expectedLength` is literally not a number", async function (t) {
    const stream = new Readable({ read() {} });
    await assert.rejects(
      readBody(stream, { expectedLength: NaN }),
      /Unexpected value `NaN` for `options\.expectedLength`, expected positive number/,
    );
  });

  test("should fail if `expectedLength` is a negative number", async function (t) {
    const stream = new Readable({ read() {} });
    await assert.rejects(
      readBody(stream, { expectedLength: -1 }),
      /Unexpected value `-1` for `options\.expectedLength`, expected positive number/,
    );
  });

  test("should read normal body streams", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const body = await readBody(req, { limit: 1024 });
        res.end(body);
      } catch (err) {
        req.resume();
        res.statusCode = 500;
        if (err instanceof Error) {
          return res.end(err.message);
        } else {
          return res.end("unknown error");
        }
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res, { limit: 1024 });
          assert.equal(body, "hello, world!");
        } catch (err) {
          assert.equal(err, undefined);
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should error if the body exceeds the length limit", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        await readBody(req, { limit: 4 });
        assert.fail("this should not return successfully");
      } catch (err) {
        assert.equal(String(err), "Error: request entity too large");
        req.resume();
        res.statusCode = 500;
        if (err instanceof Error) {
          return res.end(err.message);
        } else {
          return res.end("unknown error");
        }
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("i am a string");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res, { limit: 1024 });
          assert.equal(body, "request entity too large");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should error if it isn't the exact length specified", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        await readBody(req, { limit: 1024, expectedLength: 4 });
        assert.fail("this should not return successfully");
      } catch (err) {
        assert.equal(
          String(err),
          "Error: request size did not match content length",
        );
        req.resume();
        res.statusCode = 500;
        if (err instanceof Error) {
          return res.end(err.message);
        } else {
          return res.end("unknown error");
        }
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res, { limit: 1024 });
          assert.equal(body, "request size did not match content length");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should error if the `on` function isn't present on the object", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqNoOn = {
          removeListener: req.removeListener,
          readable: req.readable,
        };
        await readBody(reqNoOn, { limit: 1024 });
        assert.fail("this should not return successfully");
      } catch (err) {
        assert.equal(String(err), "Error: missing `on` function");
        req.resume();
        res.statusCode = 500;
        if (err instanceof Error) {
          return res.end(err.message);
        } else {
          return res.end("unknown error");
        }
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res, { limit: 1024 });
          assert.equal(body, "missing `on` function");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should error if the `removeListener` function isn't present on the object", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqNoOn = {
          on: req.on,
          readable: req.readable,
        };
        await readBody(reqNoOn, { limit: 1024 });
        assert.fail("this should not return successfully");
      } catch (err) {
        assert.equal(String(err), "Error: missing `removeListener` function");
        req.resume();
        res.statusCode = 500;
        if (err instanceof Error) {
          return res.end(err.message);
        } else {
          return res.end("unknown error");
        }
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res, { limit: 1024 });
          assert.equal(body, "missing `removeListener` function");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should error if the stream is not readable", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqNoOn = {
          on: req.on,
          removeListener: req.removeListener,
          readable: false,
        };
        await readBody(reqNoOn, { limit: 1024 });
        assert.fail("this should not return successfully");
      } catch (err) {
        assert.equal(String(err), "Error: stream is not readable");
        req.resume();
        res.statusCode = 500;
        if (err instanceof Error) {
          return res.end(err.message);
        } else {
          return res.end("unknown error");
        }
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res, { limit: 1024 });
          assert.equal(body, "stream is not readable");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should work if `limit` is missing", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const body = await readBody(req);
        assert.equal(body, "hello, world!");
        req.resume();
        res.statusCode = 200;
        res.end("ok");
      } catch (err) {
        req.resume();
        res.statusCode = 500;
        res.end("nok");
      }
    });

    server.listen(() => {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", async (res) => {
        try {
          const body = await readBody(res);
          assert.equal(body, "ok");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test(
    "should timeout if no chunks are sent",
    // setting test timeout to 200 because the promise should throw after 100ms
    { timeout: 200 },
    async () => {
      const stream = {
        on: () => undefined,
        removeListener: () => undefined,
        readable: true,
      };

      try {
        await readBody(stream, { limit: 100 });
        assert.fail("this should not return successfully");
      } catch (err) {
        assert.equal(String(err), "Error: received no body chunks after 100ms");
      }
    },
  );

  type NoOpFunc = (...args: any[]) => void;
  test("should error if the stream is aborted", async () => {
    const stream = {
      on: (event: string, fn: NoOpFunc) => {
        if (event === "aborted") {
          fn();
        }
      },
      removeListener: () => undefined,
      readable: true,
    };

    try {
      await readBody(stream, { limit: 100 });
      assert.fail("this should not return successfully");
    } catch (err) {
      assert.equal(String(err), "Error: stream was aborted");
    }
  });

  test("should propogate an error from `onEnd`", async () => {
    const stream = {
      on: (event: string, fn: NoOpFunc) => {
        if (event === "end") {
          fn(new Error("test error"));
        }
      },
      removeListener: () => undefined,
      readable: true,
    };

    try {
      await readBody(stream, { limit: 100 });
      assert.fail("this should not return successfully");
    } catch (err) {
      assert.equal(String(err), "Error: test error");
    }
  });

  test("exits normally if end is called twice", async () => {
    const stream = {
      on: (event: string, fn: NoOpFunc) => {
        if (event === "end") {
          fn();
          fn();
        }
      },
      removeListener: () => undefined,
      readable: true,
    };

    const body = await readBody(stream, { limit: 100 });
    assert.equal(body, "");
  });

  test("should not read the body if `expectedLength` exceeds `limit`", async function () {
    let read = false;

    const stream = new Readable({
      read() {
        read = true;
      },
    });

    await assert.rejects(
      readBody(stream, { expectedLength: 1025, limit: 1024 }),
      /request entity too large/,
    );

    assert.equal(read, false);
  });
});
