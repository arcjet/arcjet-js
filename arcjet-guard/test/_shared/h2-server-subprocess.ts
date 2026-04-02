/**
 * Standalone Node subprocess: starts an H2 TLS mock server.
 *
 * Deno and Bun may lack `http2.createSecureServer`, so their runtime
 * tests launch this script via Node. It prints a JSON line with
 * `{ baseUrl, ca }` to stdout, then waits for stdin to close.
 *
 * Run by parent test: node test/_shared/h2-server-subprocess.ts
 */

import { startH2SecureServer } from "./mock-server.ts";

const { baseUrl, ca, close } = await startH2SecureServer();
process.stdout.write(JSON.stringify({ baseUrl, ca }) + "\n");

// Wait for stdin to close (parent closes it to signal shutdown)
process.stdin.resume();
process.stdin.on("end", () => {
  void close();
});
