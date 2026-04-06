/**
 * Runtime test: Deno — shared in-memory cases + fetch transport over HTTPS HTTP/2.
 *
 * 1. Runs the full shared test suite using in-memory transport
 * 2. Runs a smoke test proving Deno's fetch negotiates HTTP/2 via ALPN
 *
 * Deno doesn't implement `http2.createSecureServer`, so the HTTPS H2
 * mock server runs as a Node subprocess via `h2-server-subprocess.ts`.
 *
 * Run: deno test --no-check --allow-all test/runtime/deno.test.ts
 */

import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createConnectTransport } from "npm:@connectrpc/connect-web";

import {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
} from "../../src/index.ts";
import { userAgent } from "../../src/version.ts";
import { cases } from "../_shared/cases.ts";
import type { GuardSurface } from "../_shared/cases.ts";

const surface: GuardSurface = {
  launchArcjetWithTransport,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
};

// Run all shared in-memory cases
for (const tc of cases) {
  Deno.test(`Shared: ${tc.name}`, () => tc.run(surface));
}

Deno.test("userAgent includes WinterCG deno key and Deno navigator", () => {
  const ua = userAgent();
  assertMatch(ua, /^arcjet-guard-js\//);
  assertMatch(ua, /deno\/\d+/);
  assertMatch(ua, /Deno\//);
});

/**
 * Start the H2 TLS mock server in a Node subprocess.
 *
 * Returns `{ baseUrl, ca, close }` — call `close()` to shut down the
 * subprocess. The subprocess prints a JSON line on stdout with
 * `{ baseUrl, ca }`, then waits for stdin to close.
 */
async function startH2ServerViaNode(): Promise<{
  baseUrl: string;
  ca: string;
  close: () => Promise<void>;
}> {
  const cmd = new Deno.Command("node", {
    args: ["test/_shared/h2-server-subprocess.ts"],
    stdin: "piped",
    stdout: "piped",
    stderr: "inherit",
  });
  const child = cmd.spawn();

  // Read the first line of stdout (JSON with baseUrl + ca)
  const reader = child.stdout.getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) throw new Error("Server subprocess exited before printing connection info");
    buf += new TextDecoder().decode(value);
    if (buf.includes("\n")) break;
  }
  reader.releaseLock();
  // Cancel the rest of the stream — we only need the first line
  await child.stdout.cancel();

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse returns unknown
  const info = JSON.parse(buf.split("\n")[0]) as { baseUrl: string; ca: string };

  return {
    ...info,
    close: async () => {
      // Closing stdin signals the subprocess to shut down
      await child.stdin.close();
      await child.status;
    },
  };
}

Deno.test("Deno: token bucket ALLOW over HTTPS HTTP/2 (fetch transport)", async () => {
  const { baseUrl, ca, close } = await startH2ServerViaNode();
  const httpClient = Deno.createHttpClient({ caCerts: [ca] });
  try {
    const transport = createConnectTransport({
      baseUrl,
      fetch: (input, init) => fetch(input, { ...init, redirect: "follow", client: httpClient }),
    });
    const arcjet = launchArcjetWithTransport({ key: "ajkey_dummy", transport });
    const limit = tokenBucket({
      refillRate: 10,
      intervalSeconds: 60,
      maxTokens: 100,
    });
    const input = limit({ key: "user_1" });

    const decision = await arcjet.guard({
      label: "test.deno.h2",
      rules: [input],
    });

    assertEquals(decision.conclusion, "ALLOW");
    assertEquals(decision.hasError(), false);

    const result = input.result(decision);
    assert(result !== undefined);
    assertEquals(result.remainingTokens, 95);
  } finally {
    httpClient.close();
    await close();
  }
});
