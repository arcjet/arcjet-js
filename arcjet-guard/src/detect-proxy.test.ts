import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { detectProxy } from "./detect-proxy.ts";

// Run `detectProxy` with the given environment while capturing (and silencing)
// the startup log line, returning the resolved proxy and whether it logged.
function detect(
  baseUrl: string,
  proxyEnv: Record<string, string | undefined>,
): { proxy: string | undefined; logged: boolean } {
  const original = console.info;
  let logged = false;
  console.info = (): void => {
    logged = true;
  };

  try {
    return { proxy: detectProxy(baseUrl, proxyEnv), logged };
  } finally {
    console.info = original;
  }
}

describe("detectProxy", () => {
  test("returns undefined and does not log without a proxy", () => {
    const { proxy, logged } = detect("https://decide.arcjet.com", {});

    assert.equal(proxy, undefined);
    assert.equal(logged, false);
  });

  test("throws on an invalid base URL", () => {
    // Matches `@arcjet/transport`: an invalid URL is a programming error and
    // surfaces rather than being swallowed.
    assert.throws(() => detectProxy("not a url", {}), /Invalid URL/);
  });

  test("resolves the proxy for HTTPS and HTTP targets", () => {
    assert.equal(
      detect("https://decide.arcjet.com", {
        HTTPS_PROXY: "http://proxy.example.com:3128",
      }).proxy,
      "http://proxy.example.com:3128",
    );

    assert.equal(
      detect("http://decide.arcjet.com", {
        HTTP_PROXY: "http://proxy.example.com:3128",
      }).proxy,
      "http://proxy.example.com:3128",
    );
  });

  test("logs once when a proxy is in use", () => {
    assert.equal(
      detect("https://decide.arcjet.com", {
        HTTPS_PROXY: "http://proxy.example.com:3128",
      }).logged,
      true,
    );
  });

  test("prefers the lowercase proxy variable", () => {
    assert.equal(
      detect("http://api.example.com/", {
        http_proxy: "http://lower.example.com:3128",
        HTTP_PROXY: "http://upper.example.com:3128",
      }).proxy,
      "http://lower.example.com:3128",
    );
  });

  test("never logs the proxy URL or its credentials", () => {
    const messages: unknown[] = [];
    const original = console.info;
    console.info = (...values: unknown[]): void => {
      messages.push(...values);
    };

    try {
      detectProxy("https://decide.arcjet.com", {
        HTTPS_PROXY: "http://user:secret@proxy.example.com:3128",
      });
    } finally {
      console.info = original;
    }

    // Only the fixed message is logged — never the proxy URL, so credentials
    // and host can't leak. Asserting the exact output is stronger than checking
    // for substrings.
    assert.deepEqual(messages, ["Connecting to the Arcjet API through a proxy"]);
  });

  test("honors `NO_PROXY`", () => {
    const proxy = "http://proxy.example.com:3128";

    // [NO_PROXY, base URL, expected to be bypassed]
    const cases: Array<[string, string, boolean]> = [
      ["*", "http://api.example.com:8080/", true],
      ["api.example.com", "http://api.example.com:8080/", true],
      ["example.com", "http://api.example.com:8080/", true],
      ["other.com", "http://api.example.com:8080/", false],
      ["api.example.com:8080", "http://api.example.com:8080/", true],
      ["api.example.com:9999", "http://api.example.com:8080/", false],
      [".example.com", "http://api.example.com:8080/", true],
      ["*.example.com", "http://api.example.com:8080/", true],
      [",other.com", "http://api.example.com:8080/", false],
      [".", "http://api.example.com:8080/", false],
      ["foo:bar", "http://api.example.com:8080/", false],
      ["api.example.com:80", "http://api.example.com/", true],
      ["api.example.com:443", "https://api.example.com/", true],
      // IPv6 hosts, written with or without brackets and with or without a port.
      ["::1", "http://[::1]:8080/", true],
      ["[::1]", "http://[::1]:8080/", true],
      ["[::1]:8080", "http://[::1]:8080/", true],
      ["[::1]:9999", "http://[::1]:8080/", false],
      ["::1", "http://[::2]:8080/", false],
    ];

    for (const [noProxy, baseUrl, bypassed] of cases) {
      assert.equal(
        detect(baseUrl, {
          HTTP_PROXY: proxy,
          HTTPS_PROXY: proxy,
          NO_PROXY: noProxy,
        }).proxy,
        bypassed ? undefined : proxy,
        `NO_PROXY=${noProxy} for ${baseUrl}`,
      );
    }
  });

  test("returns undefined when reading the environment throws", () => {
    // Simulate a runtime that gates environment access behind a permission
    // (e.g. Deno without `--allow-env`), where reading a variable throws.
    const throwing = new Proxy<Record<string, string | undefined>>(
      {},
      {
        get(): never {
          throw new Error("permission denied");
        },
      },
    );

    const { proxy, logged } = detect("https://decide.arcjet.com", throwing);

    assert.equal(proxy, undefined);
    assert.equal(logged, false);
  });

  test("ignores uppercase `HTTP_PROXY` under CGI (httpoxy)", () => {
    // With `REQUEST_METHOD` set (a CGI environment), uppercase `HTTP_PROXY` —
    // which an inbound `Proxy` header can populate — is ignored for HTTP.
    assert.equal(
      detect("http://api.example.com/", {
        HTTP_PROXY: "http://attacker.example.com:3128",
        REQUEST_METHOD: "GET",
      }).proxy,
      undefined,
    );

    // Lowercase `http_proxy` is still honored under CGI.
    assert.equal(
      detect("http://api.example.com/", {
        http_proxy: "http://proxy.example.com:3128",
        REQUEST_METHOD: "GET",
      }).proxy,
      "http://proxy.example.com:3128",
    );

    // HTTPS targets are unaffected (no header maps to `HTTPS_PROXY`).
    assert.equal(
      detect("https://api.example.com/", {
        HTTPS_PROXY: "http://proxy.example.com:3128",
        REQUEST_METHOD: "GET",
      }).proxy,
      "http://proxy.example.com:3128",
    );

    // Without `REQUEST_METHOD`, uppercase `HTTP_PROXY` is honored as usual.
    assert.equal(
      detect("http://api.example.com/", {
        HTTP_PROXY: "http://proxy.example.com:3128",
      }).proxy,
      "http://proxy.example.com:3128",
    );
  });
});
