// Runtime proxy test: Deno.
//
// Verifies that on the real Deno runtime, a transport built from the `deno.js`
// entry point routes requests through `HTTPS_PROXY` using Deno's native `fetch`
// proxy support. The Node suite can only import `deno.js` under Node, so this is
// the only place the actual Deno proxying is exercised.
//
// Run: deno test --allow-net --allow-env --allow-read --allow-write --allow-run \
//   --unsafely-ignore-certificate-errors --no-check test/runtime/proxy.deno.test.ts
import assert from "node:assert/strict";
import { createClient } from "@connectrpc/connect";
import { createTransport } from "../../deno.js";
import { ElizaService } from "../eliza_pb.js";
import { startProxyFixture } from "./fixture.ts";

Deno.test("routes through `HTTPS_PROXY` via Deno's native fetch", async () => {
  const fixture = await startProxyFixture();

  try {
    const client = createClient(
      ElizaService,
      createTransport(fixture.originUrl),
    );
    const result = await client.say({ sentence: "Hi!" });

    assert.equal(result.sentence, "You said `Hi!`");
    assert.equal(fixture.connectCount(), 1);
  } finally {
    await fixture.close();
  }
});
