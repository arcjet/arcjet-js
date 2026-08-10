import assert from "node:assert/strict";
import http from "node:http";
import http2 from "node:http2";
import test from "node:test";

import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Code, ConnectError, createClient } from "@connectrpc/connect";

import { createTransport as createTransportEdge } from "../dist/edge-light.js";
import { createTransport } from "../dist/index.js";
import { ElizaService, SayRequestSchema, SayResponseSchema } from "./eliza_pb.ts";
import { close, listen, trackHttp2Sessions } from "./proxy.ts";
import { within } from "./within.ts";

interface WireRequest {
  body: Uint8Array;
  closed: Promise<void>;
  headers: http.IncomingHttpHeaders | http2.IncomingHttpHeaders;
  method: string | undefined;
  path: string | undefined;
}

interface WireResponse {
  body?: string | Uint8Array;
  headers?: Record<string, string>;
  status?: number;
}

type WireHandler = (request: WireRequest) => WireResponse | Promise<WireResponse>;

async function readBody(stream: NodeJS.ReadableStream): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function withWireServer(
  httpVersion: "1.1" | "2",
  handler: WireHandler,
  fn: (url: string) => Promise<void>,
): Promise<void> {
  if (httpVersion === "1.1") {
    const server = http.createServer(async (request, response) => {
      try {
        const closed = new Promise<void>((resolve) => {
          response.once("close", resolve);
        });
        const result = await handler({
          body: await readBody(request),
          closed,
          headers: request.headers,
          method: request.method,
          path: request.url,
        });
        response.writeHead(result.status ?? 200, result.headers);
        response.end(result.body);
      } catch (error) {
        response.destroy(error instanceof Error ? error : new Error(String(error)));
      }
    });
    const url = await listen(server);
    try {
      await within(fn(url), "wire request did not settle over HTTP/1.1", 5_000);
    } finally {
      await close(server);
    }
    return;
  }

  const server = trackHttp2Sessions(http2.createServer());
  server.on("stream", async (stream, headers) => {
    // Client cancellation resets the stream. The reset is the behavior under
    // test, not an uncaught server error.
    stream.on("error", () => {});
    try {
      const closed = new Promise<void>((resolve) => {
        stream.once("close", resolve);
      });
      const result = await handler({
        body: await readBody(stream),
        closed,
        headers,
        method: typeof headers[":method"] === "string" ? headers[":method"] : undefined,
        path: typeof headers[":path"] === "string" ? headers[":path"] : undefined,
      });
      stream.respond({ ":status": result.status ?? 200, ...result.headers });
      stream.end(result.body);
    } catch (error) {
      stream.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  });
  const url = await listen(server);
  try {
    await within(fn(url), "wire request did not settle over HTTP/2", 5_000);
  } finally {
    await close(server);
  }
}

function header(
  headers: http.IncomingHttpHeaders | http2.IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value.join(", ") : value;
}

function requestEncoding(request: WireRequest): "json" | "proto" {
  const contentType = header(request.headers, "content-type");
  if (/^application\/proto(?:\s*;.*)?$/i.test(contentType ?? "")) {
    return "proto";
  }
  if (/^application\/json(?:;\s*charset=utf-?8)?$/i.test(contentType ?? "")) {
    return "json";
  }
  assert.fail(`unexpected Connect content type: ${contentType ?? "missing"}`);
}

function successfulResponse(request: WireRequest): WireResponse {
  let sentence: string;

  if (requestEncoding(request) === "proto") {
    sentence = fromBinary(SayRequestSchema, request.body).sentence;
    return {
      body: toBinary(
        SayResponseSchema,
        create(SayResponseSchema, { sentence: `You said \`${sentence}\`` }),
      ),
      headers: { "content-type": "application/proto" },
    };
  }

  const json: unknown = JSON.parse(new TextDecoder().decode(request.body));
  assert.ok(typeof json === "object" && json !== null && "sentence" in json);
  assert.equal(typeof json.sentence, "string");
  sentence = json.sentence;
  return {
    body: JSON.stringify({ sentence: `You said \`${sentence}\`` }),
    headers: { "content-type": "application/json" },
  };
}

function emptySuccessfulResponse(request: WireRequest): WireResponse {
  const encoding = requestEncoding(request);
  return {
    body: encoding === "proto" ? new Uint8Array() : "{}",
    headers: { "content-type": encoding === "proto" ? "application/proto" : "application/json" },
  };
}

const unaryPath = "/connectrpc.eliza.v1.ElizaService/Say";

test("unary Connect transport contract", async (t) => {
  const requestTimeout = 60_000;
  const transports = [
    { name: "Node HTTP/2", httpVersion: "2" as const, create: createTransport },
    { name: "Fetch HTTP/1.1", httpVersion: "1.1" as const, create: createTransportEdge },
  ];

  for (const transport of transports) {
    await t.test(`sends and receives a unary request on ${transport.name}`, async () => {
      let calls = 0;
      await withWireServer(
        transport.httpVersion,
        (request) => {
          calls++;
          assert.equal(request.method, "POST");
          assert.equal(request.path, unaryPath);
          assert.equal(header(request.headers, "connect-protocol-version"), "1");
          assert.equal(header(request.headers, "authorization"), "Bearer test-key");

          const timeout = Number(header(request.headers, "connect-timeout-ms"));
          assert.ok(timeout >= 55_000 && timeout <= requestTimeout);

          return successfulResponse(request);
        },
        async (url) => {
          const client = createClient(ElizaService, transport.create(url));
          const result = await client.say(
            { sentence: "Hi!" },
            { headers: { Authorization: "Bearer test-key" }, timeoutMs: requestTimeout },
          );
          assert.equal(result.sentence, "You said `Hi!`");
        },
      );
      assert.equal(calls, 1);
    });

    await t.test(`accepts an empty unary response on ${transport.name}`, async () => {
      await withWireServer(transport.httpVersion, emptySuccessfulResponse, async (url) => {
        const client = createClient(ElizaService, transport.create(url));
        const result = await client.say({ sentence: "Hi!" });
        assert.equal(result.sentence, "");
      });
    });

    await t.test(`maps Connect and HTTP errors on ${transport.name}`, async (t) => {
      await t.test("Connect error", async () => {
        await withWireServer(
          transport.httpVersion,
          () => ({
            body: JSON.stringify({ code: "permission_denied", message: "denied" }),
            headers: { "content-type": "application/json" },
            status: 400,
          }),
          async (url) => {
            const client = createClient(ElizaService, transport.create(url));
            await assert.rejects(client.say({ sentence: "Hi!" }), (error: unknown) => {
              assert.ok(error instanceof ConnectError);
              assert.equal(error.code, Code.PermissionDenied);
              assert.equal(error.rawMessage, "denied");
              return true;
            });
          },
        );
      });

      await t.test("HTTP fallback", async () => {
        await withWireServer(
          transport.httpVersion,
          () => ({
            body: "temporarily unavailable",
            headers: { "content-type": "text/plain" },
            status: 503,
          }),
          async (url) => {
            const client = createClient(ElizaService, transport.create(url));
            await assert.rejects(client.say({ sentence: "Hi!" }), (error: unknown) => {
              assert.ok(error instanceof ConnectError);
              assert.equal(error.code, Code.Unavailable);
              return true;
            });
          },
        );
      });

      await t.test("authentication failure", async () => {
        await withWireServer(
          transport.httpVersion,
          () => ({
            body: "unauthorized",
            headers: { "content-type": "text/plain" },
            status: 401,
          }),
          async (url) => {
            const client = createClient(ElizaService, transport.create(url));
            await assert.rejects(client.say({ sentence: "Hi!" }), (error: unknown) => {
              assert.ok(error instanceof ConnectError);
              assert.equal(error.code, Code.Unauthenticated);
              return true;
            });
          },
        );
      });

      await t.test("invalid successful response", async () => {
        await withWireServer(
          transport.httpVersion,
          () => ({
            body: "not a Connect response",
            headers: { "content-type": "text/plain" },
          }),
          async (url) => {
            const client = createClient(ElizaService, transport.create(url));
            await assert.rejects(client.say({ sentence: "Hi!" }), ConnectError);
          },
        );
      });

      await t.test("empty HTTP response", async () => {
        await withWireServer(
          transport.httpVersion,
          () => ({ status: 204 }),
          async (url) => {
            const client = createClient(ElizaService, transport.create(url));
            await assert.rejects(client.say({ sentence: "Hi!" }), ConnectError);
          },
        );
      });
    });

    await t.test(`enforces deadlines on ${transport.name}`, async () => {
      await withWireServer(
        transport.httpVersion,
        () => new Promise<WireResponse>(() => {}),
        async (url) => {
          const client = createClient(ElizaService, transport.create(url));
          await within(
            assert.rejects(client.say({ sentence: "Hi!" }, { timeoutMs: 50 }), (error: unknown) => {
              assert.ok(error instanceof ConnectError);
              assert.equal(error.code, Code.DeadlineExceeded);
              return true;
            }),
            "deadline did not settle the client call",
          );
        },
      );
    });

    await t.test(`propagates cancellation on ${transport.name}`, async () => {
      let received!: () => void;
      let requestClosed: Promise<void> | undefined;
      const requestReceived = new Promise<void>((resolve) => {
        received = resolve;
      });

      await withWireServer(
        transport.httpVersion,
        (request) => {
          requestClosed = request.closed;
          received();
          return new Promise<WireResponse>(() => {});
        },
        async (url) => {
          const controller = new AbortController();
          const client = createClient(ElizaService, transport.create(url));
          const result = client.say({ sentence: "Hi!" }, { signal: controller.signal });
          await within(requestReceived, "request was not received before cancellation");
          const closed = requestClosed;
          assert.ok(closed, "request close signal was not captured");
          controller.abort();

          await within(
            assert.rejects(result, (error: unknown) => {
              assert.ok(error instanceof ConnectError);
              assert.equal(error.code, Code.Canceled);
              return true;
            }),
            "cancellation did not settle the client call",
          );
          await within(closed, "cancellation did not close the network request");
        },
      );
    });
  }
});
