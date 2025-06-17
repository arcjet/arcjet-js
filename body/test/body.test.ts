import { describe, test } from "node:test";
import { expect } from "expect";
import * as http from "http";
import { readBody } from "../index.js";
import type { AddressInfo } from "net";

describe("reads the body from the readable stream", () => {
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
          expect(body).toEqual("hello, world!");
        } catch (err) {
          expect(err).toBeUndefined();
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
        throw new Error("this should not return successfully");
      } catch (err) {
        expect(err).toEqual(new Error("request entity too large"));
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
          expect(body).toEqual("request entity too large");
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
        throw new Error("this should not return successfully");
      } catch (err) {
        expect(err).toEqual(
          new Error("request size did not match content length"),
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
          expect(body).toEqual("request size did not match content length");
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
        throw new Error("this should not return successfully");
      } catch (err) {
        expect(err).toEqual(new Error("missing `on` function"));
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
          expect(body).toEqual("missing `on` function");
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
        throw new Error("this should not return successfully");
      } catch (err) {
        expect(err).toEqual(new Error("missing `removeListener` function"));
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
          expect(body).toEqual("missing `removeListener` function");
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
        throw new Error("this should not return successfully");
      } catch (err) {
        expect(err).toEqual(new Error("stream is not readable"));
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
          expect(body).toEqual("stream is not readable");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test("should error if limit is not present", (t, done) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqNoOn = {
          on: req.on,
          removeListener: req.removeListener,
          readable: req.readable,
        };
        await readBody(reqNoOn, { limit: undefined as any });
        throw new Error("this should not return successfully");
      } catch (err) {
        expect(err).toEqual(new Error("must set a limit"));
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
          expect(body).toEqual("must set a limit");
        } finally {
          server.close(done);
        }
      });
    });
  });

  test(
    "should timeout if no chunks are sent",
    {
      // setting test timeout to 200 because the promise should throw after 100ms
      timeout: 200,
    },
    async () => {
      const stream = {
        on: () => undefined,
        removeListener: () => undefined,
        readable: true,
      };

      try {
        await readBody(stream, { limit: 100 });
        throw new Error("this should not return successfully");
      } catch (e) {
        expect(e).toEqual(new Error("received no body chunks after 100ms"));
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
      throw new Error("this should not return successfully");
    } catch (e) {
      expect(e).toEqual(new Error("stream was aborted"));
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
      throw new Error("this should not return successfully");
    } catch (e) {
      expect(e).toEqual(new Error("test error"));
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
    expect(body).toEqual("");
  });
});
