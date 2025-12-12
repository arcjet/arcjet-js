import assert from "node:assert/strict";
import childProcess from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";

const oneMegabyte = 1024 * 1024;

test("`@arcjet/astro` (integration)", async function (t) {
  const basic = await createSimpleServer({ name: "basic" });

  await t.test("should support `sensitiveInfo`", async function () {
    const response = await fetch(basic.url, {
      body: "This is fine.",
      headers: { "Content-Type": "text/plain" },
      method: "POST",
    });

    assert.equal(response.status, 200);
    assert.deepEqual(basic.stdout, []);
    assert.deepEqual(basic.stderr, []);
  });

  // Note `basic` is not closed yet as it will be used in the future.

  const readBefore = await createSimpleServer({ name: "read-before" });

  await t.test(
    "should emit an error log when the body is read before `sensitiveInfo`",
    async function () {
      const response = await fetch(readBefore.url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      assert.equal(response.status, 200);
      assert.deepEqual(readBefore.stdout, []);
      assert.deepEqual(readBefore.stderr, [
        "✦Aj ERROR failed to get request body: unusable\n",
      ]);
      readBefore.stderr.length = 0;
    },
  );

  readBefore.close();

  const readAfter = await createSimpleServer({ name: "read-after" });

  await t.test(
    "should support reading the body after `sensitiveInfo`",
    async function () {
      const response = await fetch(readAfter.url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      assert.equal(response.status, 403);
      assert.deepEqual(readAfter.stdout, []);
      assert.deepEqual(readAfter.stderr, []);
    },
  );

  readAfter.close();

  await t.test("should support `sensitiveInfo` on JSON", async function () {
    const response = await fetch(basic.url, {
      body: JSON.stringify({ message: "My email is alice@arcjet.com" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    assert.equal(response.status, 403);
    assert.deepEqual(basic.stdout, []);
    assert.deepEqual(basic.stderr, []);
  });

  await t.test(
    "should support `sensitiveInfo` on form data",
    async function () {
      const formData = new FormData();
      formData.append("message", "My email is My email is alice@arcjet.com");

      const response = await fetch(basic.url, {
        body: formData,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        method: "POST",
      });

      assert.equal(response.status, 403);
      assert.deepEqual(basic.stdout, []);
      assert.deepEqual(basic.stderr, []);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on plain text",
    async function () {
      const response = await fetch(basic.url, {
        body: "My email is alice@arcjet.com",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      assert.equal(response.status, 403);
      assert.deepEqual(basic.stdout, []);
      assert.deepEqual(basic.stderr, []);
    },
  );

  await t.test(
    "should support `sensitiveInfo` on streamed plain text",
    async function () {
      const response = await fetch(basic.url, {
        body: new ReadableStream({
          start(controller) {
            const parts = "My email is alice@arcjet.com".split(" ");
            let first = true;
            const time = 10;

            setTimeout(tick, time);

            function tick() {
              const part = parts.shift();
              if (part) {
                controller.enqueue(
                  new TextEncoder().encode((first ? "" : " ") + part),
                );
                first = false;
                setTimeout(tick, time);
              } else {
                controller.enqueue(new TextEncoder().encode("\n"));
                controller.close();
              }
            }
          },
        }),
        duplex: "half",
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      assert.equal(response.status, 403);
      assert.deepEqual(basic.stdout, []);
      assert.deepEqual(basic.stderr, []);
    },
  );

  await t.test(
    "should support `sensitiveInfo` w/ a megabyte of data",
    async function () {
      const message = "My email is alice@arcjet.com";
      const body = "a".repeat(oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch(basic.url, {
        body,
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      assert.equal(response.status, 403);
      assert.deepEqual(basic.stdout, []);
      assert.deepEqual(basic.stderr, []);
    },
  );

  // TODO(GH-5517): make this configurable.
  await t.test(
    "should support `sensitiveInfo` w/ 5 megabytes of data",
    async function () {
      const message = "My email is alice@arcjet.com";
      const body =
        "a".repeat(5 * oneMegabyte - message.length - 1) + " " + message;

      const response = await fetch(basic.url, {
        body,
        headers: { "Content-Type": "text/plain" },
        method: "POST",
      });

      assert.equal(response.status, 403);
      assert.deepEqual(basic.stdout, []);
      assert.deepEqual(basic.stderr, []);
    },
  );

  basic.close();
});

interface SimpleServerOptions {
  name: string;
}

let uniquePort = 3500;

async function createSimpleServer(options: SimpleServerOptions) {
  const { name } = options;
  const port = uniquePort++;
  const stdout: Array<string> = [];
  const stderr: Array<string> = [];

  const astroPath = fileURLToPath(
    new URL("../astro.js", import.meta.resolve("astro")),
  );
  const cwd = fileURLToPath(new URL(name + "/", import.meta.url));
  const child = childProcess.spawn(
    "node",
    [astroPath, "dev", "--host", "--port", String(port), "--strictPort"],
    {
      cwd,
      env: {
        ...process.env,
        ARCJET_KEY: "ajkey_yourkey",
        ASTRO_TELEMETRY_DISABLED: "1",
      },
    },
  );

  // Wait until started.
  await new Promise(function (resolve) {
    child.stdout.on("data", function (data) {
      const message = String(data);
      const stripped = stripVTControlCharacters(message);

      // Server ready.
      if (stripped.includes("Network")) {
        resolve(undefined);
        // Do not print this message.
        return;
      }

      // Do not print these messages.
      if (
        /\[@astrojs\/node] Enabling sessions with filesystem storage/.test(
          stripped,
        ) ||
        /\[content]/.test(stripped) ||
        /\[types]/.test(stripped) ||
        /Forced re-optimization of dependencies/.test(stripped) ||
        /Local/.test(stripped) ||
        /POST \//.test(stripped) ||
        /Re-optimizing dependencies because/.test(stripped) ||
        /watching for file changes/.test(stripped)
      ) {
        return;
      }

      stdout.push(stripped);
    });

    child.stderr.on("data", function (data) {
      const message = String(data);
      const stripped = stripVTControlCharacters(message);

      if (
        /Aj WARN Arcjet will use 127\.0\.0\.1 when missing public IP address in development mode/.test(
          stripped,
        )
      ) {
        // Do not print this message.
        return;
      }

      stderr.push(stripped);
    });

    child.on("close", function (code) {
      // Expected exit code (sigterm).
      if (code === 143) return;

      console.error("exit", code, stdout, stderr);
    });
  });

  return { close, stdout, stderr, url: "http://localhost:" + port };

  function close() {
    child.kill();
  }
}
