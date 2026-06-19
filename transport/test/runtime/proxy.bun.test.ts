// Runtime proxy test: Bun.
//
// Verifies that on the real Bun runtime, a transport built from the `bun.js`
// entry point routes requests through `HTTPS_PROXY` using Bun's native `fetch`
// proxy support. The Node suite can only import `bun.js` under Node, so this is
// the only place the actual Bun proxying is exercised.
//
// Run: bun test test/runtime/proxy.bun.test.ts
import { expect, test } from "bun:test";
import { createClient } from "@connectrpc/connect";
import { createTransport } from "../../dist/bun.js";
import { ElizaService } from "../eliza_pb.ts";
import { startProxyFixture } from "./fixture.ts";

test("routes through `HTTPS_PROXY` via Bun's native fetch", async () => {
  const fixture = await startProxyFixture();

  try {
    const client = createClient(
      ElizaService,
      createTransport(fixture.originUrl),
    );
    // Expected to reject at the TLS handshake (untrusted self-signed cert); we
    // only care that it was tunneled through the proxy via CONNECT.
    await client.say({ sentence: "Hi!" }).catch(() => {});

    expect(fixture.connectCount()).toBeGreaterThanOrEqual(1);
  } finally {
    await fixture.close();
  }
});
