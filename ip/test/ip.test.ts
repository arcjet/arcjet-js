import assert from "node:assert/strict";
import test from "node:test";

import {
  createClientIpDiagnostics,
  findIp,
  findIpDetails,
  hasTrustAllProxy,
  isValidIp,
  parseProxies,
  parseProxy,
  resolveClientIp,
} from "../dist/index.js";

type Proxy = ReturnType<typeof parseProxy>;

type Case = [message: string, input: string, expected: string, proxies?: Array<Proxy>];

const cases: Array<Case> = [
  ["returns empty string if unspecified", "0.0.0.0", ""],
  ["returns empty string if 'this network' address", "0.1.2.3", ""],
  ["returns empty string if in the shared address range", "100.127.255.255", ""],
  ["returns empty string if in the link local address range", "169.254.255.255", ""],
  ["returns empty string if in the future protocol range", "192.0.0.1", ""],
  ["returns empty string if in the 192.0.2.x documentation range", "192.0.2.1", ""],
  ["returns empty string if in the 198.51.100.x documentation range", "198.51.100.1", ""],
  ["returns empty string if in the 203.0.113.x documentation range", "203.0.113.1", ""],
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
  ["returns empty string if in the 172.16.x.x-172.31.x.x private range", "172.18.1.1", ""],
  ["returns empty string if in the 192.168.x.x private range", "192.168.1.1", ""],
  ["returns empty string outside of the valid range", "1.1.1.256", ""],
  ["returns the ip if valid", "1.1.1.1", "1.1.1.1"],
  ["returns the full ip if valid, after ignoring port", "1.1.1.1:443", "1.1.1.1:443"],
  ["returns empty string if the ip is a trusted proxy (literal)", "1.1.1.1", "", ["1.1.1.1"]],
  [
    "returns empty string if the ip is a trusted proxy (range)",
    "1.1.1.1",
    "",
    [parseProxy("1.1.1.1/32")],
  ],
  [
    "returns the string if the ip is not a trusted proxy (literal)",
    "1.1.1.1",
    "1.1.1.1",
    ["1.1.1.2"],
  ],
  [
    "returns the string if the ip is not a trusted proxy (range)",
    "1.1.1.1",
    "1.1.1.1",
    [parseProxy("1.1.1.2/32")],
  ],
  [
    "returns the string if the ip is not a trusted proxy (invalid proxy)",
    "1.1.1.1",
    "1.1.1.1",
    [
      // @ts-expect-error: test how runtime handles non-string proxy.
      1234,
    ],
  ],
  ["returns empty string if unspecified (ipv6)", "::", ""],
  ["returns empty string if loopback address", "::1", ""],
  ["returns empty string if ipv4 mapped address", "::ffff:127.0.0.1", ""],
  ["returns empty string if ipv4-ipv6 translat range", "64:ff9b:1::", ""],
  ["returns empty string if discard range", "100::", ""],
  ["returns empty string if documentation range", "2001:db8::", ""],
  ["returns empty string if benchmarking range", "2001:2::", ""],
  ["returns empty string if unique local range", "fc02::", ""],
  ["returns empty string if unicast link local range", "fe80::", ""],
  ["returns empty string if the ip address is too short (ipv6)", "ffff:ffff:", ""],
  [
    "returns empty string if the ip address is too long",
    "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    "",
  ],
  ["returns the ip if it is 'Port Control Protocol Anycast' address", "2001:1::1", "2001:1::1"],
  [
    "returns the ip if it is 'Traversal Using Relays around NAT Anycast' address",
    "2001:1::2",
    "2001:1::2",
  ],
  ["returns the ip if it is 'AMT' address", "2001:3::", "2001:3::"],
  ["returns the ip if it is 'AS112-v6' address", "2001:4:112::", "2001:4:112::"],
  ["returns the ip if it is 'ORCHIDv2' address", "2001:20::", "2001:20::"],
  ["returns the ip if valid (ipv6)", "::abcd:c00a:2ff", "::abcd:c00a:2ff"],
  [
    "returns the ip if valid, after ignoring scope (ipv6)",
    "::abcd:c00a:2ff%1",
    "::abcd:c00a:2ff%1",
  ],
  [
    "returns empty string if the ip is a trusted proxy (ipv6, literal)",
    "::abcd:c00a:2ff",
    "",
    ["::abcd:c00a:2ff"],
  ],
  [
    "returns empty string if the ip is a trusted proxy (ipv6, range)",
    "::abcd:c00a:2ff",
    "",
    [parseProxy("::abcd:c00a:2ff/128")],
  ],
  [
    "returns the string if the ip is not a trusted proxy (ipv6, literal)",
    "::abcd:c00a:2ff",
    "::abcd:c00a:2ff",
    ["::abcd:c00a:2fa"],
  ],
  [
    "returns the string if the ip is not a trusted proxy (ipv6, range)",
    "::abcd:c00a:2ff",
    "::abcd:c00a:2ff",
    [parseProxy("::abcd:c00a:2fa/128")],
  ],
  [
    "returns the string if the ip is not a trusted proxy (ipv6, invalid)",
    "::abcd:c00a:2ff",
    "::abcd:c00a:2ff",
    [
      // @ts-expect-error: test how runtime handles non-string proxy.
      1234,
    ],
  ],
];

test("@arcjet/ip", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), [
      "cloudflare",
      "createClientIpDiagnostics",
      "default",
      "findIp",
      "findIpDetails",
      "hasTrustAllProxy",
      "isValidIp",
      "parseProxies",
      "parseProxy",
      "resolveClientIp",
    ]);
  });

  await t.test("validates every configured proxy", () => {
    assert.throws(() => parseProxies(["not-an-ip"]), /invalid proxy address/);
    assert.throws(() => parseProxies([""]), /invalid proxy address/);
    assert.throws(
      () => parseProxies([{ kind: "service", name: "bad", ranges: ["bad"], clientIp: [] }]),
      /invalid proxy address/,
    );
  });

  await t.test("detects trust-all ranges", () => {
    assert.equal(hasTrustAllProxy(parseProxies(["0.0.0.0/0"])), true);
    assert.equal(hasTrustAllProxy(parseProxies(["1.2.3.0/24"])), false);
    assert.equal(hasTrustAllProxy(parseProxies(["1.2.3.4"])), false);
    assert.equal(
      hasTrustAllProxy([{ kind: "service", name: "all", ranges: ["::/0"], clientIp: [] }]),
      true,
    );
    assert.equal(
      hasTrustAllProxy([
        { kind: "service", name: "all", ranges: [parseProxy("0.0.0.0/0")], clientIp: [] },
      ]),
      true,
    );
    assert.equal(
      hasTrustAllProxy([{ kind: "service", name: "narrow", ranges: ["1.2.3.0/24"], clientIp: [] }]),
      false,
    );
  });
});

test("client IP details", () => {
  const proxyService = {
    kind: "service" as const,
    name: "test-proxy",
    ranges: ["8.8.8.0/24", parseProxy("2606:4700::/32")],
    clientIp: [{ header: "x-client-ip", format: "ip" as const }],
  };
  assert.deepEqual(findIpDetails({ headers: new Headers([["x-forwarded-for", "1.1.1.1"]]) }), {
    ip: "1.1.1.1",
    provenance: "unverified-header",
    verified: false,
    header: "x-forwarded-for",
  });
  assert.deepEqual(
    findIpDetails(
      {
        socket: { remoteAddress: "10.0.0.1" },
        headers: new Headers([["x-forwarded-for", "1.1.1.1"]]),
      },
      { proxies: ["10.0.0.0/8"] },
    ),
    {
      ip: "1.1.1.1",
      provenance: "trusted-proxy",
      verified: true,
      header: "x-forwarded-for",
    },
  );
  assert.deepEqual(
    findIpDetails(
      {
        // A framework-level request IP may itself come from X-Forwarded-For.
        // It must not override the transport peer when establishing trust.
        ip: "10.0.0.1",
        socket: { remoteAddress: "192.168.0.1" },
        headers: new Headers([["x-forwarded-for", "1.1.1.1"]]),
      },
      { proxies: ["10.0.0.0/8"] },
    ),
    {
      ip: "1.1.1.1",
      provenance: "unverified-header",
      verified: false,
      header: "x-forwarded-for",
    },
  );
  assert.deepEqual(
    findIpDetails(
      {
        ip: "10.0.0.1",
        headers: new Headers([["x-forwarded-for", "1.1.1.1"]]),
      },
      { proxies: ["10.0.0.0/8"] },
    ),
    {
      ip: "1.1.1.1",
      provenance: "trusted-proxy",
      verified: true,
      header: "x-forwarded-for",
    },
  );
  assert.deepEqual(findIpDetails({ ip: "1.1.1.1", headers: new Headers() }), {
    ip: "1.1.1.1",
    provenance: "request",
    verified: true,
  });
  assert.deepEqual(
    findIpDetails({ socket: { remoteAddress: "1.1.1.1" }, headers: new Headers() }),
    { ip: "1.1.1.1", provenance: "direct", verified: true },
  );
  assert.deepEqual(findIpDetails({ info: { remoteAddress: "1.1.1.1" }, headers: new Headers() }), {
    ip: "1.1.1.1",
    provenance: "direct",
    verified: true,
  });
  for (const request of [
    { ip: "8.8.8.1", headers: { "x-client-ip": "1.1.1.1" } },
    { socket: { remoteAddress: "8.8.8.1" }, headers: { "x-client-ip": "1.1.1.1" } },
    {
      info: { remoteAddress: "2606:4700::1" },
      headers: { "x-client-ip": "1.1.1.1" },
    },
  ]) {
    assert.deepEqual(findIpDetails(request, { proxies: [proxyService] }), {
      ip: "1.1.1.1",
      provenance: "trusted-proxy",
      verified: true,
    });
  }
  assert.deepEqual(
    findIpDetails({ requestContext: { identity: { sourceIp: "1.1.1.1" } }, headers: {} }),
    { ip: "1.1.1.1", provenance: "request", verified: true },
  );
  assert.deepEqual(findIpDetails({ headers: null }), {
    ip: "",
    provenance: "none",
    verified: false,
  });
  assert.equal(isValidIp("10.0.0.1"), true);
  assert.equal(isValidIp("::1"), true);
  assert.equal(isValidIp(""), false);
  assert.equal(isValidIp(1234), false);
  assert.equal(isValidIp("999.0.0.1"), false);
  assert.equal(isValidIp("not-an-ip"), false);

  for (const [platform, header] of [
    ["cloudflare", "cf-connecting-ip"],
    ["firebase", "x-fah-client-ip"],
    ["fly-io", "fly-client-ip"],
    ["render", "true-client-ip"],
    ["vercel", "x-real-ip"],
  ] as const) {
    assert.deepEqual(findIpDetails({ headers: new Headers([[header, "1.1.1.1"]]) }, { platform }), {
      ip: "1.1.1.1",
      provenance: "platform",
      verified: true,
      header,
    });
  }

  assert.deepEqual(
    resolveClientIp({ headers: new Headers([["x-arcjet-ip", "10.0.0.1"]]) }, { development: true }),
    {
      ip: "10.0.0.1",
      provenance: "development",
      verified: false,
      header: "x-arcjet-ip",
    },
  );
  assert.deepEqual(resolveClientIp({ headers: new Headers() }, { development: true }), {
    ip: "127.0.0.1",
    provenance: "development",
    verified: false,
  });
  assert.deepEqual(resolveClientIp({ headers: new Headers() }, { ipSrc: "10.0.0.1" }), {
    ip: "10.0.0.1",
    provenance: "manual",
    verified: true,
  });
  assert.deepEqual(resolveClientIp({ headers: new Headers() }), {
    ip: "",
    provenance: "none",
    verified: false,
  });
  assert.deepEqual(resolveClientIp({ headers: new Headers() }, { ipSrc: "" }), {
    ip: "",
    provenance: "none",
    verified: false,
  });
  assert.throws(
    () => resolveClientIp({ headers: new Headers() }, { ipSrc: "not-an-ip" }),
    /Invalid ipSrc/,
  );
});

test("client IP diagnostics", () => {
  const debug: Array<Record<string, unknown>> = [];
  const warnings: Array<Record<string, unknown>> = [];
  const report = createClientIpDiagnostics({
    debug(facets) {
      debug.push(facets);
    },
    warn(facets) {
      warnings.push(facets);
    },
  });
  const details = {
    ip: "1.1.1.1",
    provenance: "unverified-header" as const,
    verified: false,
    header: "x-forwarded-for",
  };
  report(details);
  report(details);
  assert.equal(debug.length, 2);
  assert.equal(debug[0].client_ip_provenance, "unverified-header");
  assert.equal(warnings.length, 1);
  report({ ip: "1.1.1.1", provenance: "direct", verified: true });
  assert.equal(warnings.length, 1);
});

test("`parseProxies`", async (t) => {
  await t.test("parses CIDR strings in top-level and service ranges", () => {
    const service = {
      kind: "service" as const,
      name: "mixed-ranges",
      ranges: ["8.8.8.0/24", parseProxy("2606:4700::/32")],
      clientIp: [{ header: "x-client-ip", format: "ip" as const }],
    };
    const result = parseProxies(["1.2.3.0/24", "1.2.3.4", service]);
    // A CIDR range string is parsed to a `Cidr` object.
    assert.equal(typeof result[0], "object");
    // A plain IP string is passed through unchanged.
    assert.equal(result[1], "1.2.3.4");
    // A `ProxyService` is cloned so its string ranges can be parsed once.
    assert.notEqual(result[2], service);
    assert.equal(typeof (result[2] as typeof service).ranges[0], "object");
    assert.equal((result[2] as typeof service).ranges[1], service.ranges[1]);
  });
});

test("`findIp`", async (t) => {
  await t.test("remains the string projection of the diagnostics API", () => {
    const forwardedRequest = {
      headers: { "x-forwarded-for": "1.1.1.1, 8.8.8.8" },
    };
    assert.equal(findIp(forwardedRequest), findIpDetails(forwardedRequest).ip);

    const trustedProxyRequest = {
      headers: { "x-forwarded-for": "1.1.1.1, 10.0.0.1" },
      socket: { remoteAddress: "10.0.0.1" },
    };
    const trustedProxyOptions = { proxies: ["10.0.0.0/8"] };
    assert.equal(
      findIp(trustedProxyRequest, trustedProxyOptions),
      findIpDetails(trustedProxyRequest, trustedProxyOptions).ip,
    );

    const platformRequest = { headers: { "cf-connecting-ip": "1.1.1.1" } };
    const platformOptions = { platform: "cloudflare" as const };
    assert.equal(
      findIp(platformRequest, platformOptions),
      findIpDetails(platformRequest, platformOptions).ip,
    );

    const emptyRequest = { headers: {} };
    assert.equal(findIp(emptyRequest), findIpDetails(emptyRequest).ip);
  });

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

  await t.test("supports plain object headers with array value (Node.js `IncomingMessage`)", () => {
    const request = {
      headers: {
        // Node.js lowercases the header keys
        "x-forwarded-for": ["1.1.1.1", "2.2.2.2", "3.3.3.3"],
      },
    };
    assert.equal(findIp(request), "3.3.3.3");
  });

  await t.test("should support an IP string in a proxy", function () {
    assert.equal(
      findIp(
        { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" } },
        { proxies: ["3.3.3.3"] },
      ),
      "2.2.2.2",
    );
  });

  await t.test("should support an CIDR string in a proxy", function () {
    assert.equal(
      findIp(
        { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" } },
        { proxies: ["3.3.3.3/32"] },
      ),
      "2.2.2.2",
    );
  });

  await t.test("should support an CIDR object in a proxy", function () {
    assert.equal(
      findIp(
        { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" } },
        { proxies: [parseProxy("3.3.3.3/32")] },
      ),
      "2.2.2.2",
    );
  });

  await t.test("should filter an invalid value in a proxy", function () {
    assert.equal(
      findIp(
        { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" } },
        {
          proxies: [
            // @ts-expect-error: Testing type annotation violations
            123456789,
          ],
        },
      ),
      "3.3.3.3",
    );
  });

  await t.test("request: `ip`", async (t) => {
    for (const [message, input, expected, proxies] of cases) {
      await t.test(message, () => {
        assert.equal(findIp({ headers: new Headers(), ip: input }, { proxies }), expected);
      });
    }
  });

  await t.test("request: `socket.remoteAddress`", async (t) => {
    for (const [message, input, expected, proxies] of cases) {
      await t.test(message, () => {
        assert.equal(
          findIp({ headers: new Headers(), socket: { remoteAddress: input } }, { proxies }),
          expected,
        );
      });
    }
  });

  await t.test("request: `info.remoteAddress`", async (t) => {
    for (const [message, input, expected, proxies] of cases) {
      await t.test(message, () => {
        assert.equal(
          findIp({ headers: new Headers(), info: { remoteAddress: input } }, { proxies }),
          expected,
        );
      });
    }
  });

  await t.test("request: `requestContext.identity.sourceIp`", async (t) => {
    for (const [message, input, expected, proxies] of cases) {
      await t.test(message, () => {
        assert.equal(
          findIp(
            {
              headers: new Headers(),
              requestContext: { identity: { sourceIp: input } },
            },
            { proxies },
          ),
          expected,
        );
      });
    }
  });

  await t.test("platform: `undefined`", async (t) => {
    await t.test("should support an `X-Forwarded-For` header", async (t) => {
      const all: Array<Case> = [
        ...cases,
        ["returns the last public IP (ipv4)", "1.1.1.1, 2.2.2.2, 3.3.3.3", "3.3.3.3"],
        ["returns the last public IP (ipv6)", "e123::, 3.3.3.3, abcd::", "abcd::"],
        ["skips any `unknown` IP (ipv4)", "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown", "3.3.3.3"],
        ["skips any `unknown` IP (ipv6)", "e123::, 3.3.3.3, abcd::, unknown", "abcd::"],
        ["skips any private IP (ipv4)", "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1", "3.3.3.3"],
        ["skips any private IP (ipv6)", "e123::, 3.3.3.3, abcd::, ::1", "abcd::"],
        ["skips any trusted proxy IP (ipv4)", "1.1.1.1, 2.2.2.2, 3.3.3.3", "2.2.2.2", ["3.3.3.3"]],
        ["skips any trusted proxy IP (ipv6)", "e123::, 3.3.3.3, abcd::", "3.3.3.3", ["abcd::"]],
        [
          "skips multiple trusted proxy IPs (ipv4)",
          "1.1.1.1, 2.2.2.2, 3.3.3.3",
          "1.1.1.1",
          ["3.3.3.3", "2.2.2.2"],
        ],
        [
          "skips multiple trusted proxy IP (ipv6)",
          "e123::, 3.3.3.3, abcd::",
          "e123::",
          ["3.3.3.3", "abcd::"],
        ],
      ];

      for (const [message, input, expected, proxies] of all) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["X-Forwarded-For", input]]) }, { proxies }),
            expected,
          );
        });
      }

      await t.test("should prefer `X-Forwarded-For` over other headers", async () => {
        assert.equal(
          findIp({
            headers: {
              "do-connecting-ip": "1.1.1.1",
              "fastly-client-ip": "1.1.1.1",
              "x-client-ip": "1.1.1.1",
              "x-forwarded-for": "2.2.2.2, 3.3.3.3",
            },
          }),
          "3.3.3.3",
        );
      });
    });

    await t.test("should support an `X-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["X-Client-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should not support `CF-Connecting-IP` header", async (t) => {
      assert.equal(findIp({ headers: new Headers([["CF-Connecting-IP", "1.1.1.1"]]) }), "");
    });

    await t.test("should not support `CF-Connecting-IPv6` header", async (t) => {
      assert.equal(
        findIp({
          headers: new Headers([["CF-Connecting-IPv6", "2001:1::"]]),
        }),
        "",
      );
    });

    await t.test("should not support `Fly-Client-IP` header", async (t) => {
      assert.equal(
        findIp({
          headers: new Headers([["Fly-Client-IP", "1.1.1.1"]]),
        }),
        "",
      );
    });

    await t.test("should not support `X-Vercel-Forwarded-For` header", async (t) => {
      assert.equal(
        findIp({
          headers: new Headers([["X-Vercel-Forwarded-For", "1.1.1.1"]]),
        }),
        "",
      );
    });

    await t.test("should support a `DO-Connecting-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["DO-Connecting-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support a `Fastly-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["Fastly-Client-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support a `True-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["True-Client-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Real-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["X-Real-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Cluster-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["X-Cluster-Client-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Forwarded` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["X-Forwarded", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support a `Forwarded-For` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["Forwarded-For", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support a `Forwarded` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["Forwarded", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Appengine-User-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: new Headers([["X-Appengine-User-IP", input]]) }, { proxies }),
            expected,
          );
        });
      }
    });
  });

  await t.test("platform: `cloudflare`", async (t) => {
    await t.test("should support a `CF-Connecting-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["CF-Connecting-IP", input]]) },
              { platform: "cloudflare", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support a `CF-Connecting-IPv6` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        // `CF-Connecting-IPv6` is only used for IPv6 addresses.
        if (input.includes(".")) continue;

        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["CF-Connecting-IPv6", input]]) },
              { platform: "cloudflare", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should ignore other headers", () => {
      assert.equal(
        findIp({ headers: new Headers([["X-Real-IP", "1.1.1.1"]]) }, { platform: "cloudflare" }),
        "",
      );
    });
  });

  await t.test("platform: `firebase`", async (t) => {
    await t.test("should support an `x-fah-client-ip` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: { "x-fah-client-ip": input } }, { platform: "firebase", proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should support an `x-forwarded-for` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp({ headers: { "x-forwarded-for": input } }, { platform: "firebase", proxies }),
            expected,
          );
        });
      }
    });

    await t.test("should ignore other headers", () => {
      assert.equal(findIp({ headers: { forwarded: "1.1.1.1" } }, { platform: "firebase" }), "");
    });
  });

  await t.test("platform: `fly-io`", async (t) => {
    await t.test("should support a `Fly-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["Fly-Client-IP", input]]) },
              { platform: "fly-io", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should ignore other headers", () => {
      assert.equal(
        findIp({ headers: new Headers([["X-Real-IP", "1.1.1.1"]]) }, { platform: "fly-io" }),
        "",
      );
    });
  });

  await t.test("platform: `vercel`", async (t) => {
    await t.test("should support an `X-Real-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["X-Real-IP", input]]) },
              { platform: "vercel", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Vercel-Forwarded-For` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["X-Vercel-Forwarded-For", input]]) },
              { platform: "vercel", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Forwarded-For` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["X-Forwarded-For", input]]) },
              { platform: "vercel", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should ignore other headers", () => {
      assert.equal(
        findIp({ headers: new Headers([["Forwarded", "1.1.1.1"]]) }, { platform: "vercel" }),
        "",
      );
    });
  });

  await t.test("platform: `render`", async (t) => {
    await t.test("should support a `True-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["True-Client-IP", input]]) },
              { platform: "render", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should ignore other headers", () => {
      assert.equal(
        findIp({ headers: new Headers([["X-Real-IP", "1.1.1.1"]]) }, { platform: "render" }),
        "",
      );
    });
  });
});
