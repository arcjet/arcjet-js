import { after, before, describe, test } from "node:test";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { run } from "newman";

// Promisify the `newman.run` API as `newmanRun` in the tests
const newmanRun = promisify(run);

describe("API Tests", async () => {
  // Importing the server also starts it listening on port 8080
  const server = await import("../index.js");

  after((done) => server.close(done));

  test("/api/low-rate-limit", async () => {
    const summary = await newmanRun({
      collection: fileURLToPath(
        new URL("./low-rate-limit.json", import.meta.url),
      ),
    });

    // The `summary` contains a lot of information that might be useful
    // console.log(summary);

    assert.strictEqual(
      summary.run.failures.length,
      0,
      "expected suite to run without error",
    );
  });

  test("/api/high-rate-limit", async () => {
    const summary = await newmanRun({
      collection: fileURLToPath(
        new URL("./high-rate-limit.json", import.meta.url),
      ),
      iterationCount: 51, // 50 are allowed, so 51 trigger the rate limit
    });

    // The `summary` contains a lot of information that might be useful
    // console.log(summary);

    assert.strictEqual(
      summary.run.failures.length,
      0,
      "expected suite to run without error",
    );
  });

  test("/api/bots", async () => {
    const summary = await newmanRun({
      collection: fileURLToPath(new URL("./bots.json", import.meta.url)),
    });

    // The `summary` contains a lot of information that might be useful
    // console.log(summary);

    assert.strictEqual(
      summary.run.failures.length,
      0,
      "expected suite to run without error",
    );
  });
});
