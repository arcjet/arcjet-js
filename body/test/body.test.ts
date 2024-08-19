/**
 * @jest-environment node
 */
import { describe, expect, test } from "@jest/globals";
import * as http from "http";
import { getBodySync } from "../index";
import { AddressInfo } from "net";

describe("reads the body from the readable stream", () => {
  test("should read normal body streams", (done) => {
    const server = http.createServer((req, res) => {
      getBodySync(
        req,
        { encoding: "utf-8", limit: 1024 },
        (err?: Error, body?: string) => {
          if (err) {
            req.resume();
            res.statusCode = 500;
            return res.end(err.message);
          }

          if (body) {
            res.end(body);
          }
        },
      );
    });

    server.listen(function onListen() {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", (res) => {
        getBodySync(
          res,
          { encoding: "utf-8", limit: 1024 },
          (err?: Error, str?: string) => {
            server.close(function onClose() {
              expect(str).toEqual("hello, world!");
              done();
            });
          },
        );
      });
    });
  });

  test("should error if the body exceeds the length limit", (done) => {
    const server = http.createServer((req, res) => {
      getBodySync(
        req,
        { encoding: "utf-8", limit: 4 },
        (err?: Error, body?: string) => {
          expect(err).toEqual(new Error("request entity too large"));
          if (err) {
            req.resume();
            res.statusCode = 500;
            return res.end(err.message);
          }

          if (body) {
            res.end(body);
          }
        },
      );
    });

    server.listen(function onListen() {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("i am a string");

      client.on("response", (res) => {
        getBodySync(
          res,
          { encoding: "utf-8", limit: 4 },
          (err?: Error, str?: string) => {
            server.close(function onClose() {
              expect(err).toEqual(new Error("request entity too large"));
              expect(str).toBeUndefined();
              done();
            });
          },
        );
      });
    });
  });

  test("should error if it isnt the exact length specified", (done) => {
    const server = http.createServer((req, res) => {
      getBodySync(
        req,
        { encoding: "utf-8", limit: 1024, expectedLength: 4 },
        (err?: Error, body?: string) => {
          expect(err).toEqual(
            new Error("request size did not match content length"),
          );
          if (err) {
            req.resume();
            res.statusCode = 500;
            return res.end(err.message);
          }

          if (body) {
            res.end(body);
          }
        },
      );
    });

    server.listen(function onListen() {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", (res) => {
        getBodySync(
          res,
          { encoding: "utf-8", limit: 1024, expectedLength: 4 },
          (err?: Error, str?: string) => {
            server.close(function onClose() {
              expect(err).toEqual(
                new Error("request size did not match content length"),
              );
              expect(str).toBeUndefined();
              done();
            });
          },
        );
      });
    });
  });
});
