import assert from "node:assert/strict";
import http2 from "node:http2";
import test from "node:test";

import { createHttp2Transport } from "../dist/http2.js";
import { close, listen, trackHttp2Connections } from "./proxy.ts";

type Handle = ReturnType<typeof createHttp2Transport>;

// Start an HTTP/2 origin that answers every stream, run `fn` with a transport
// pointed at it, then tear both down. `fn` also receives the server-side
// sessions so it can send GOAWAY.
async function withHttp2Origin(
  fn: (handle: Handle, serverSessions: Set<http2.ServerHttp2Session>) => Promise<void>,
): Promise<void> {
  const serverSessions = new Set<http2.ServerHttp2Session>();
  const server = trackHttp2Connections(http2.createServer());
  server.on("session", (session) => serverSessions.add(session));
  server.on("stream", (stream) => {
    stream.respond({ ":status": 200 });
    stream.end();
  });
  const url = await listen(server);
  const handle = createHttp2Transport(url);

  try {
    await fn(handle, serverSessions);
  } finally {
    handle.sessionManager.abort();
    await close(server);
  }
}

// Make one request through the session manager and return the client session
// that served it, once the stream has closed.
async function requestSession(handle: Handle): Promise<http2.ClientHttp2Session> {
  const stream = await handle.sessionManager.request("POST", "/", {}, {});
  // Node detaches `stream.session` once the stream closes.
  const { session } = stream;
  assert.ok(session);
  stream.resume();
  stream.end();
  await new Promise((resolve) => stream.once("close", resolve));
  return session as http2.ClientHttp2Session;
}

// Send GOAWAY to idle `session` and make a request before Node emits the
// resulting `error`, then return every uncaught exception raised meanwhile.
//
// The session manager's own `goaway` listener runs first and destroys the
// session; Node emits the `error` once the socket has closed. A request made
// in between replaces the session, as when a frozen serverless instance thaws
// with a GOAWAY and a request both pending.
async function goawayThenRequest(
  handle: Handle,
  serverSessions: Set<http2.ServerHttp2Session>,
  session: http2.ClientHttp2Session,
): Promise<unknown[]> {
  const uncaught: unknown[] = [];
  const onUncaught = (error: unknown) => uncaught.push(error);
  process.on("uncaughtException", onUncaught);

  try {
    const replaced = new Promise<http2.ClientHttp2Session>((resolve, reject) => {
      session.once("goaway", () => {
        requestSession(handle).then(resolve, reject);
      });
    });
    for (const serverSession of serverSessions) {
      serverSession.goaway(http2.constants.NGHTTP2_NO_ERROR);
    }

    assert.notEqual(await replaced, session);
    await new Promise((resolve) => setTimeout(resolve, 50));
  } finally {
    process.off("uncaughtException", onUncaught);
  }

  assert.equal(session.destroyed, true);
  return uncaught;
}

test("@arcjet/transport/http2", async function (t) {
  await t.test(
    "should not raise an uncaught exception when a request replaces a session closed by GOAWAY",
    async function () {
      await withHttp2Origin(async function (handle, serverSessions) {
        const session = await requestSession(handle);

        assert.deepEqual(await goawayThenRequest(handle, serverSessions, session), []);
      });
    },
  );

  await t.test(
    "should not raise an uncaught exception when GOAWAY closes a pre-connected session that served no request",
    async function () {
      await withHttp2Origin(async function (handle, serverSessions) {
        assert.equal(await handle.sessionManager.connect(), "idle");
        // `Http2SessionManager` exposes the pre-connected session only through
        // its private `s` field, which `@arcjet/transport` also reads.
        const state: unknown = Reflect.get(handle.sessionManager, "s");
        assert.ok(typeof state === "object" && state !== null && "conn" in state);
        const session = state.conn as http2.ClientHttp2Session;

        assert.deepEqual(await goawayThenRequest(handle, serverSessions, session), []);
      });
    },
  );

  await t.test("should not throw when pinging a destroyed session", async function () {
    await withHttp2Origin(async function (handle) {
      const session = await requestSession(handle);
      session.destroy();

      assert.equal(
        session.ping(() => {}),
        false,
      );
    });
  });

  await t.test("should still ping a live session", async function () {
    await withHttp2Origin(async function (handle) {
      const session = await requestSession(handle);

      const duration = await new Promise<number>((resolve, reject) => {
        assert.equal(
          session.ping((error, ms) => (error ? reject(error) : resolve(ms))),
          true,
        );
      });
      assert.equal(typeof duration, "number");
    });
  });
});
