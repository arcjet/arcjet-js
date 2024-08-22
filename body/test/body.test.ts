/**
 * @jest-environment node
 */
import { describe, expect, test } from "@jest/globals";
import * as http from "http";
import { getBody } from "../index";
import type { AddressInfo } from "net";

describe("reads the body from the readable stream", () => {
  test("should read normal body streams", (done) => {
    const server = http.createServer((req, res) => {
      getBody(req, { limit: 1024 })
        .then((body) => {
          res.end(body);
        })
        .catch((err) => {
          req.resume();
          res.statusCode = 500;
          return res.end(err.message);
        });
    });

    server.listen(function onListen() {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", (res) => {
        getBody(res, { limit: 1024 })
          .then((body) => {
            server.close(function onClose() {
              expect(body).toEqual("hello, world!");
              done();
            });
          })
          .catch((err) => {
            expect(err).toBeUndefined;
          });
      });
    });
  });

  test("should error if the body exceeds the length limit", (done) => {
    const server = http.createServer((req, res) => {
      getBody(req, { limit: 4 })
        .then((body) => {
          res.end(body);
        })
        .catch((err) => {
          req.resume();
          res.statusCode = 500;
          return res.end(err.message);
        });
    });

    server.listen(function onListen() {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("i am a string");

      client.on("response", (res) => {
        getBody(res, { limit: 4 })
          .then((body) => {
            expect(body).toBeUndefined();
          })
          .catch((err) => {
            expect(err).toEqual(new Error("request entity too large"));
          });
      });
    });
  });

  test("should error if it isnt the exact length specified", (done) => {
    const server = http.createServer((req, res) => {
      getBody(req, { limit: 1024, expectedLength: 4 })
        .then((body) => {
          res.end(body);
        })
        .catch((err) => {
          req.resume();
          res.statusCode = 500;
          return res.end(err.message);
        });
    });

    server.listen(function onListen() {
      const addr = server.address() as AddressInfo;
      const client = http.request({ method: "POST", port: addr.port });

      client.end("hello, world!");

      client.on("response", (res) => {
        getBody(res, { limit: 1024, expectedLength: 4 })
          .then((body) => {
            expect(body).toBeUndefined();
          })
          .catch((err) => {
            expect(err).toEqual(
              new Error("request size did not match content length"),
            );
          });
      });
    });
  });
});
