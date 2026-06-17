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
import { createTransport } from "../../bun.js";
import { ElizaService } from "../eliza_pb.js";
import { startProxyFixture } from "./fixture.ts";

test("routes through `HTTPS_PROXY` via Bun's native fetch", async () => {
  const fixture = await startProxyFixture();

  try {
    const client = createClient(
      ElizaService,
      createTransport(fixture.originUrl),
    );
    const result = await client.say({ sentence: "Hi!" });

    expect(result.sentence).toBe("You said `Hi!`");
    expect(fixture.connectCount()).toBe(1);
  } finally {
    await fixture.close();
  }
});
