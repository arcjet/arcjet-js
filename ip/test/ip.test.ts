import assert from "node:assert/strict";
import test from "node:test";
import type { Options } from "../index.js";
import findIp, { parseProxy } from "../index.js";

type Check = (ip: string, options?: Options | undefined) => string;
type TestContext = Parameters<Required<Parameters<typeof test>>[0]>[0];
type Case = [
  message: string,
  actual: string,
  expected: string,
  options?: Options,
];

const ipv4Tests: Array<Case> = [
  ["returns empty string if unspecified", "0.0.0.0", ""],
  ["returns empty string if 'this network' address", "0.1.2.3", ""],
  [
    "returns empty string if in the shared address range",
    "100.127.255.255",
    "",
  ],
  [
    "returns empty string if in the link local address range",
    "169.254.255.255",
    "",
  ],
  ["returns empty string if in the future protocol range", "192.0.0.1", ""],
  [
    "returns empty string if in the 192.0.2.x documentation range",
    "192.0.2.1",
    "",
  ],
  [
    "returns empty string if in the 198.51.100.x documentation range",
    "198.51.100.1",
    "",
  ],
  [
    "returns empty string if in the 203.0.113.x documentation range",
    "203.0.113.1",
    "",
  ],
  ["returns empty string if in the benchmarking range", "198.19.255.255", ""],
  ["returns empty string if in the reserved range", "240.0.0.0", ""],
  ["returns empty string if in the broadcast address", "255.255.255.255", ""],
  ["returns empty string if loopback", "127.0.0.1", ""],
  ["returns empty string if not full ip", "12.3.4", ""],
  ["returns empty string if more than 3 digits in an octet", "1111.2.3.4", ""],
  ["returns empty string if more than full ip", "1.2.3.4.5", ""],
  ["returns empty string if any octet has leading 0", "1.02.3.4", ""],
  [
    "returns empty string if not a string",
    // @ts-expect-error: test how runtime handles non-string input.
    ["12", "3", "4"],
    "",
  ],
  ["returns empty string if in the 10.x.x.x private range", "10.1.1.1", ""],
  [
    "returns empty string if in the 172.16.x.x-172.31.x.x private range",
    "172.18.1.1",
    "",
  ],
  [
    "returns empty string if in the 192.168.x.x private range",
    "192.168.1.1",
    "",
  ],
  ["returns empty string outside of the valid range", "1.1.1.256", ""],
  ["returns the ip if valid", "1.1.1.1", "1.1.1.1"],
  [
    "returns the full ip if valid, after ignoring port",
    "1.1.1.1:443",
    "1.1.1.1:443",
  ],
  [
    "returns empty string if the ip is a trusted proxy (literal)",
    "1.1.1.1",
    "",
    { proxies: ["1.1.1.1"] },
  ],
  [
    "returns empty string if the ip is a trusted proxy (range)",
    "1.1.1.1",
    "",
    { proxies: [parseProxy("1.1.1.1/32")] },
  ],
  [
    "returns the string if the ip is not a trusted proxy (literal)",
    "1.1.1.1",
    "1.1.1.1",
    { proxies: ["1.1.1.2"] },
  ],
  [
    "returns the string if the ip is not a trusted proxy (range)",
    "1.1.1.1",
    "1.1.1.1",
    { proxies: [parseProxy("1.1.1.2/32")] },
  ],
  [
    "returns the string if the ip is not a trusted proxy (invalid proxy)",
    "1.1.1.1",
    "1.1.1.1",
    {
      proxies: [
        // @ts-expect-error: test how runtime handles non-string proxy.
        1234,
      ],
    },
  ],
];

const ipv6Tests: Array<Case> = [
  ["returns empty string if unspecified", "::", ""],
  ["returns empty string if loopback address", "::1", ""],
  ["returns empty string if ipv4 mapped address", "::ffff:127.0.0.1", ""],
  ["returns empty string if ipv4-ipv6 translat range", "64:ff9b:1::", ""],
  ["returns empty string if discard range", "100::", ""],
  ["returns empty string if documentation range", "2001:db8::", ""],
  ["returns empty string if benchmarking range", "2001:2::", ""],
  ["returns empty string if unique local range", "fc02::", ""],
  ["returns empty string if unicast link local range", "fe80::", ""],
  ["returns empty string if the ip address is too short", "ffff:ffff:", ""],
  [
    "returns empty string if the ip address is too long",
    "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "",
  ],
  [
    "returns the ip if it is 'Port Control Protocol Anycast' address",
    "2001:1::1",
    "2001:1::1",
  ],
  [
    "returns the ip if it is 'Traversal Using Relays around NAT Anycast' address",
    "2001:1::2",
    "2001:1::2",
  ],
  ["returns the ip if it is 'AMT' address", "2001:3::", "2001:3::"],
  [
    "returns the ip if it is 'AS112-v6' address",
    "2001:4:112::",
    "2001:4:112::",
  ],
  ["returns the ip if it is 'ORCHIDv2' address", "2001:20::", "2001:20::"],
  ["returns the ip if valid", "::abcd:c00a:2ff", "::abcd:c00a:2ff"],
  [
    "returns the ip if valid, after ignoring scope",
    "::abcd:c00a:2ff%1",
    "::abcd:c00a:2ff%1",
  ],
  [
    "returns empty string if the ip is a trusted proxy (literal)",
    "::abcd:c00a:2ff",
    "",
    { proxies: ["::abcd:c00a:2ff"] },
  ],
  [
    "returns empty string if the ip is a trusted proxy (range)",
    "::abcd:c00a:2ff",
    "",
    { proxies: [parseProxy("::abcd:c00a:2ff/128")] },
  ],
  [
    "returns the string if the ip is not a trusted proxy (literal)",
    "::abcd:c00a:2ff",
    "::abcd:c00a:2ff",
    { proxies: ["::abcd:c00a:2fa"] },
  ],
  [
    "returns the string if the ip is not a trusted proxy (range)",
    "::abcd:c00a:2ff",
    "::abcd:c00a:2ff",
    { proxies: [parseProxy("::abcd:c00a:2fa/128")] },
  ],
  [
    "returns the string if the ip is not a trusted proxy (invalid)",
    "::abcd:c00a:2ff",
    "::abcd:c00a:2ff",
    {
      proxies: [
        // @ts-expect-error: test how runtime handles non-string proxy.
        1234,
      ],
    },
  ],
];

async function suite(
  t: TestContext,
  label: string,
  check: Check,
  options?: { ipv4?: boolean },
) {
  await t.test(label, async (t) => {
    if (!options || options.ipv4 !== false) {
      await t.test("ipv4", async (t) => {
        for (const [message, actual, expected, options] of ipv4Tests) {
          await t.test(message, () => {
            assert.equal(check(actual, options), expected);
          });
        }
      });
    }

    await t.test("ipv6", async (t) => {
      for (const [message, actual, expected, options] of ipv6Tests) {
        await t.test(message, () => {
          assert.equal(check(actual, options), expected);
        });
      }
    });
  });
}

test("`findIp`", async (t) => {
  await t.test("returns empty string if headers not set", () => {
    assert.equal(
      findIp(
        // @ts-expect-error: test runtime handling of missing headers.
        {},
      ),
      "",
    );
  });

  await t.test("returns empty string if headers is null", () => {
    assert.equal(
      findIp({
        // @ts-expect-error: test runtime handling of `null` headers.
        headers: null,
      }),
      "",
    );
  });

  await t.test("returns empty string if headers is not object", () => {
    assert.equal(
      findIp({
        // @ts-expect-error: test runtime handling of `""` headers.
        headers: "",
      }),
      "",
    );
  });

  await t.test(
    "supports plain object headers with single value (Node.js `IncomingMessage`)",
    () => {
      const request = {
        headers: {
          // Node.js lowercases the header keys
          "x-real-ip": "1.1.1.1",
        },
      };
      assert.equal(findIp(request), "1.1.1.1");
    },
  );

  await t.test(
    "supports plain object headers with array value (Node.js `IncomingMessage`)",
    () => {
      const request = {
        headers: {
          // Node.js lowercases the header keys
          "x-forwarded-for": ["1.1.1.1", "2.2.2.2", "3.3.3.3"],
        },
      };
      assert.equal(findIp(request), "3.3.3.3");
    },
  );

  await suite(t, "request: `ip`", (ip, options) => {
    return findIp({ headers: new Headers(), ip }, options);
  });

  await suite(
    t,
    "request: `socket.remoteAddress`",
    (remoteAddress, options) => {
      return findIp(
        { headers: new Headers(), socket: { remoteAddress } },
        options,
      );
    },
  );

  await suite(t, "request: `info.remoteAddress`", (remoteAddress, options) => {
    return findIp({ headers: new Headers(), info: { remoteAddress } }, options);
  });

  await suite(
    t,
    "request: `requestContext.identity.sourceIp`",
    (sourceIp, options) => {
      return findIp(
        { headers: new Headers(), requestContext: { identity: { sourceIp } } },
        options,
      );
    },
  );

  await suite(t, "header: `X-Client-IP`", (ip, options) => {
    return findIp({ headers: new Headers([["X-Client-IP", ip]]) }, options);
  });

  await suite(t, "header: `X-Forwarded-For`", (ip, options) => {
    return findIp({ headers: new Headers([["X-Forwarded-For", ip]]) }, options);
  });

  await suite(t, "header: `CF-Connecting-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["CF-Connecting-IP", ip]]) },
      { ...options, platform: "cloudflare" },
    );
  });

  await suite(
    t,
    "header: `CF-Connecting-IPv6`",
    (ip, options) => {
      return findIp(
        { headers: new Headers([["CF-Connecting-IPv6", ip]]) },
        { ...options, platform: "cloudflare" },
      );
    },
    { ipv4: false },
  );

  await suite(t, "header: `X-Real-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["X-Real-IP", ip]]) },
      { ...options, platform: "vercel" },
    );
  });

  await suite(t, "header: `X-Vercel-Forwarded-For`", (ip, options) => {
    return findIp(
      { headers: new Headers([["X-Vercel-Forwarded-For", ip]]) },
      { ...options, platform: "vercel" },
    );
  });

  await suite(t, "header: `X-Forwarded-For`", (ip, options) => {
    return findIp(
      { headers: new Headers([["X-Forwarded-For", ip]]) },
      { ...options, platform: "vercel" },
    );
  });

  await suite(t, "header: `True-Client-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["True-Client-IP", ip]]) },
      { ...options, platform: "render" },
    );
  });

  await suite(t, "header: `DO-Connecting-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["DO-Connecting-IP", ip]]) },
      options,
    );
  });

  await suite(t, "header: `Fastly-Client-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["Fastly-Client-IP", ip]]) },
      options,
    );
  });

  await suite(t, "header: `Fly-Client-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["Fly-Client-IP", ip]]) },
      { ...options, platform: "fly-io" },
    );
  });

  await suite(t, "header: `True-Client-IP`", (ip, options) => {
    return findIp({ headers: new Headers([["True-Client-IP", ip]]) }, options);
  });

  await suite(t, "header: `X-Real-IP`", (ip, options) => {
    return findIp({ headers: new Headers([["X-Real-IP", ip]]) }, options);
  });

  await suite(t, "header: `X-Cluster-Client-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["X-Cluster-Client-IP", ip]]) },
      options,
    );
  });

  await suite(t, "header: `X-Forwarded`", (ip, options) => {
    return findIp({ headers: new Headers([["X-Forwarded", ip]]) }, options);
  });

  await suite(t, "header: `Forwarded-For`", (ip, options) => {
    return findIp({ headers: new Headers([["Forwarded-For", ip]]) }, options);
  });

  await suite(t, "header: `Forwarded`", (ip, options) => {
    return findIp({ headers: new Headers([["Forwarded", ip]]) }, options);
  });

  await suite(t, "header: `X-Appengine-User-IP`", (ip, options) => {
    return findIp(
      { headers: new Headers([["X-Appengine-User-IP", ip]]) },
      options,
    );
  });
});

test("X-Forwarded-For with multiple IP", async (t) => {
  await t.test("returns the last public IP (ipv4)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    assert.equal(findIp(request), "3.3.3.3");
  });

  await t.test("returns the last public IP (ipv6)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
    };
    assert.equal(findIp(request), "abcd::");
  });

  await t.test("skips any `unknown` IP (ipv4)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown"],
      ]),
    };
    assert.equal(findIp(request), "3.3.3.3");
  });

  await t.test("skips any `unknown` IP (ipv6)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, unknown"],
      ]),
    };
    assert.equal(findIp(request), "abcd::");
  });

  await t.test("skips any private IP (ipv4)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1"],
      ]),
    };
    assert.equal(findIp(request), "3.3.3.3");
  });

  await t.test("skips any private IP (ipv6)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, ::1"],
      ]),
    };
    assert.equal(findIp(request), "abcd::");
  });

  await t.test("skips any trusted proxy IP (ipv4)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    const options = {
      proxies: ["3.3.3.3"],
    };
    assert.equal(findIp(request, options), "2.2.2.2");
  });

  await t.test("skips any trusted proxy IP (ipv6)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
    };
    const options = {
      proxies: ["abcd::"],
    };
    assert.equal(findIp(request, options), "3.3.3.3");
  });

  await t.test("skips multiple trusted proxy IPs (ipv4)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    const options = {
      proxies: ["3.3.3.3", "2.2.2.2"],
    };
    assert.equal(findIp(request, options), "1.1.1.1");
  });

  await t.test("skips multiple trusted proxy IP (ipv6)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
    };
    const options = {
      proxies: ["3.3.3.3", "abcd::"],
    };
    assert.equal(findIp(request, options), "e123::");
  });
});
