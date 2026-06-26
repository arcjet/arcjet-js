import assert from "node:assert/strict";
import http from "node:http";
import http2 from "node:http2";
import test from "node:test";

import { createClient } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";

import { createTransport as createTransportBun } from "../dist/bun.js";
import { createTransport as createTransportEdge } from "../dist/edge-light.js";
import { createTransport } from "../dist/index.js";
import { ElizaService } from "./eliza_pb.ts";

let uniquePort = 3400;

test("@arcjet/transport", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), ["createTransport"]);
  });

  await t.test("should throw w/o `url`", async function () {
    assert.throws(function () {
      // @ts-expect-error: test runtime behavior.
      createTransport();
      // TODO: better error message.
    }, /Invalid URL/);
  });

  await t.test("should work over HTTP/2 by default", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = http2.createServer(
      connectNodeAdapter({
        routes(router) {
          router.service(ElizaService, {
            say(request) {
              return { sentence: "You said `" + request.sentence + "`" };
            },
          });
        },
      }),
    );

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransport(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

    assert.equal(result.sentence, "You said `Hi!`");
  });

  await t.test("should work over HTTP on Bun", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = http.createServer(
      connectNodeAdapter({
        routes(router) {
          router.service(ElizaService, {
            say(request) {
              return { sentence: "You said `" + request.sentence + "`" };
            },
          });
        },
      }),
    );

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransportBun(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

    assert.equal(result.sentence, "You said `Hi!`");
  });

  await t.test("should work over HTTP on Vercel Edge", async function () {
    const port = uniquePort++;
    const url = "http://localhost:" + port;

    const server = http.createServer(
      connectNodeAdapter({
        routes(router) {
          router.service(ElizaService, {
            say(request) {
              return { sentence: "You said `" + request.sentence + "`" };
            },
          });
        },
      }),
    );

    await new Promise(function (resolve) {
      server.listen({ port }, function () {
        resolve(undefined);
      });
    });

    const client = createClient(ElizaService, createTransportEdge(url));
    const result = await client.say({ sentence: "Hi!" });

    await server.close();

    assert.equal(result.sentence, "You said `Hi!`");
  });
});
