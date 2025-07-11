import assert from "node:assert/strict";
import test from "node:test";
import type { Options, RequestLike } from "../index.js";
import ip, { parseProxy } from "../index.js";

type Check = (ip: string, options?: Options | undefined) => string;
type TestContext = Parameters<Required<Parameters<typeof test>>[0]>[0];

async function suite(
  t: TestContext,
  label: string,
  check: Check,
  options?: { ipv4?: boolean },
) {
  await t.test(label, async (t) => {
    if (!options || options.ipv4 !== false) {
      await t.test("ipv4", async (t) => {
        await ipv4(t, check);
      });
    }

    await t.test("ipv6", async (t) => {
      await ipv6(t, check);
    });
  });
}

async function ipv4(t: TestContext, check: Check) {
  await t.test("returns empty string if unspecified", () => {
    assert.equal(check("0.0.0.0"), "");
  });

  await t.test("returns empty string if 'this network' address", () => {
    assert.equal(check("0.1.2.3"), "");
  });

  await t.test("returns empty string if in the shared address range", () => {
    assert.equal(check("100.127.255.255"), "");
  });

  await t.test(
    "returns empty string if in the link local address range",
    () => {
      assert.equal(check("169.254.255.255"), "");
    },
  );

  await t.test("returns empty string if in the future protocol range", () => {
    assert.equal(check("192.0.0.1"), "");
  });

  await t.test(
    "returns empty string if in the 192.0.2.x documentation range",
    () => {
      assert.equal(check("192.0.2.1"), "");
    },
  );

  await t.test(
    "returns empty string if in the 198.51.100.x documentation range",
    () => {
      assert.equal(check("198.51.100.1"), "");
    },
  );

  await t.test(
    "returns empty string if in the 203.0.113.x documentation range",
    () => {
      assert.equal(check("203.0.113.1"), "");
    },
  );

  await t.test("returns empty string if in the benchmarking range", () => {
    assert.equal(check("198.19.255.255"), "");
  });

  await t.test("returns empty string if in the reserved range", () => {
    assert.equal(check("240.0.0.0"), "");
  });

  await t.test("returns empty string if in the broadcast address", () => {
    assert.equal(check("255.255.255.255"), "");
  });

  await t.test("returns empty string if loopback", () => {
    assert.equal(check("127.0.0.1"), "");
  });

  await t.test("returns empty string if not full ip", () => {
    assert.equal(check("12.3.4"), "");
  });

  await t.test("returns empty string if more than 3 digits in an octet", () => {
    assert.equal(check("1111.2.3.4"), "");
  });

  await t.test("returns empty string if more than full ip", () => {
    assert.equal(check("1.2.3.4.5"), "");
  });

  await t.test("returns empty string if any octet has leading 0", () => {
    assert.equal(check("1.02.3.4"), "");
  });

  await t.test("returns empty string if not a string", () => {
    // @ts-expect-error: test how runtime handles non-string input.
    assert.equal(check(["12", "3", "4"]), "");
  });

  await t.test("returns empty string if in the 10.x.x.x private range", () => {
    assert.equal(check("10.1.1.1"), "");
  });

  await t.test(
    "returns empty string if in the 172.16.x.x-172.31.x.x private range",
    () => {
      assert.equal(check("172.18.1.1"), "");
    },
  );

  await t.test(
    "returns empty string if in the 192.168.x.x private range",
    () => {
      assert.equal(check("192.168.1.1"), "");
    },
  );

  await t.test("returns empty string outside of the valid range", () => {
    assert.equal(check("1.1.1.256"), "");
  });

  await t.test("returns the ip if valid", () => {
    assert.equal(check("1.1.1.1"), "1.1.1.1");
  });

  await t.test("returns the full ip if valid, after ignoring port", () => {
    assert.equal(check("1.1.1.1:443"), "1.1.1.1:443");
  });

  await t.test("returns empty string if the ip is a trusted proxy", () => {
    assert.equal(check("1.1.1.1", { proxies: ["1.1.1.1"] }), "");
    assert.equal(check("1.1.1.1", { proxies: [parseProxy("1.1.1.1/32")] }), "");
  });

  await t.test("returns the string if the ip is not a trusted proxy", () => {
    assert.equal(check("1.1.1.1", { proxies: ["1.1.1.2"] }), "1.1.1.1");
    assert.equal(
      check("1.1.1.1", { proxies: [parseProxy("1.1.1.2/32")] }),
      "1.1.1.1",
    );
    assert.equal(
      check("1.1.1.1", {
        proxies: [
          // @ts-expect-error: test how runtime handles non-string proxy.
          1234,
        ],
      }),
      "1.1.1.1",
    );
  });
}

async function ipv6(t: TestContext, check: Check) {
  await t.test("returns empty string if unspecified", () => {
    assert.equal(check("::"), "");
  });

  await t.test("returns empty string if loopback address", () => {
    assert.equal(check("::1"), "");
  });

  await t.test("returns empty string if ipv4 mapped address", () => {
    assert.equal(check("::ffff:127.0.0.1"), "");
  });

  await t.test("returns empty string if ipv4-ipv6 translat range", () => {
    assert.equal(check("64:ff9b:1::"), "");
  });

  await t.test("returns empty string if discard range", () => {
    assert.equal(check("100::"), "");
  });

  await t.test("returns empty string if documentation range", () => {
    assert.equal(check("2001:db8::"), "");
  });

  await t.test("returns empty string if benchmarking range", () => {
    assert.equal(check("2001:2::"), "");
  });

  await t.test("returns empty string if unique local range", () => {
    assert.equal(check("fc02::"), "");
  });

  await t.test("returns empty string if unicast link local range", () => {
    assert.equal(check("fe80::"), "");
  });

  await t.test("returns empty string if the ip address is too short", () => {
    assert.equal(check("ffff:ffff:"), "");
  });

  await t.test("returns empty string if the ip address is too long", () => {
    assert.equal(check("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"), "");
  });

  await t.test(
    "returns the ip if it is 'Port Control Protocol Anycast' address",
    () => {
      assert.equal(check("2001:1::1"), "2001:1::1");
    },
  );

  await t.test(
    "returns the ip if it is 'Traversal Using Relays around NAT Anycast' address",
    () => {
      assert.equal(check("2001:1::2"), "2001:1::2");
    },
  );

  await t.test("returns the ip if it is 'AMT' address", () => {
    assert.equal(check("2001:3::"), "2001:3::");
  });

  await t.test("returns the ip if it is 'AS112-v6' address", () => {
    assert.equal(check("2001:4:112::"), "2001:4:112::");
  });

  await t.test("returns the ip if it is 'ORCHIDv2' address", () => {
    assert.equal(check("2001:20::"), "2001:20::");
  });

  await t.test("returns the ip if valid", () => {
    assert.equal(check("::abcd:c00a:2ff"), "::abcd:c00a:2ff");
  });

  await t.test("returns the ip if valid, after ignoring scope", () => {
    assert.equal(check("::abcd:c00a:2ff%1"), "::abcd:c00a:2ff%1");
  });

  await t.test("returns empty string if the ip is a trusted proxy", () => {
    assert.equal(
      check("::abcd:c00a:2ff", { proxies: ["::abcd:c00a:2ff"] }),
      "",
    );
    assert.equal(
      check("::abcd:c00a:2ff", {
        proxies: [parseProxy("::abcd:c00a:2ff/128")],
      }),
      "",
    );
  });

  await t.test("returns the string if the ip is not a trusted proxy", () => {
    assert.equal(
      check("::abcd:c00a:2ff", { proxies: ["::abcd:c00a:2fa"] }),
      "::abcd:c00a:2ff",
    );
    assert.equal(
      check("::abcd:c00a:2ff", {
        proxies: [parseProxy("::abcd:c00a:2fa/128")],
      }),
      "::abcd:c00a:2ff",
    );
    assert.equal(
      check("::abcd:c00a:2ff", {
        proxies: [
          // @ts-expect-error: test how runtime handles non-string proxy.
          1234,
        ],
      }),
      "::abcd:c00a:2ff",
    );
  });
}

test("find public IPv4", async (t) => {
  await t.test("returns empty string if headers not set", () => {
    assert.equal(
      ip(
        // @ts-expect-error: test runtime handling of missing headers.
        {},
      ),
      "",
    );
  });

  await t.test("returns empty string if headers is null", () => {
    assert.equal(
      ip({
        // @ts-expect-error: test runtime handling of `null` headers.
        headers: null,
      }),
      "",
    );
  });

  await t.test("returns empty string if headers is not object", () => {
    assert.equal(
      ip({
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
      assert.equal(ip(request), "1.1.1.1");
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
      assert.equal(ip(request), "3.3.3.3");
    },
  );

  await suite(t, "request: `ip`", (d, options) => {
    return ip({ headers: new Headers(), ip: d }, options);
  });

  await suite(
    t,
    "request: `socket.remoteAddress`",
    (remoteAddress, options) => {
      return ip({ headers: new Headers(), socket: { remoteAddress } }, options);
    },
  );

  await suite(t, "request: `info.remoteAddress`", (remoteAddress, options) => {
    return ip({ headers: new Headers(), info: { remoteAddress } }, options);
  });

  await suite(
    t,
    "request: `requestContext.identity.sourceIp`",
    (sourceIp, options) => {
      return ip(
        { headers: new Headers(), requestContext: { identity: { sourceIp } } },
        options,
      );
    },
  );

  await suite(t, "header: `X-Client-IP`", (d, options) => {
    return ip({ headers: new Headers([["X-Client-IP", d]]) }, options);
  });

  await suite(t, "header: `X-Forwarded-For`", (d, options) => {
    return ip({ headers: new Headers([["X-Forwarded-For", d]]) }, options);
  });

  await suite(t, "header: `CF-Connecting-IP`", (d, options) => {
    return ip(
      { headers: new Headers([["CF-Connecting-IP", d]]) },
      { ...options, platform: "cloudflare" },
    );
  });

  await suite(
    t,
    "header: `CF-Connecting-IPv6`",
    (d, options) => {
      return ip(
        { headers: new Headers([["CF-Connecting-IPv6", d]]) },
        { ...options, platform: "cloudflare" },
      );
    },
    { ipv4: false },
  );

  await suite(t, "header: `X-Real-IP`", (d, options) => {
    return ip(
      { headers: new Headers([["X-Real-IP", d]]) },
      { ...options, platform: "vercel" },
    );
  });

  await suite(t, "header: `X-Vercel-Forwarded-For`", (d, options) => {
    return ip(
      { headers: new Headers([["X-Vercel-Forwarded-For", d]]) },
      { ...options, platform: "vercel" },
    );
  });

  await suite(t, "header: `X-Forwarded-For`", (d, options) => {
    return ip(
      { headers: new Headers([["X-Forwarded-For", d]]) },
      { ...options, platform: "vercel" },
    );
  });

  await suite(t, "header: `True-Client-IP`", (d, options) => {
    return ip(
      { headers: new Headers([["True-Client-IP", d]]) },
      { ...options, platform: "render" },
    );
  });

  await suite(t, "header: `DO-Connecting-IP`", (d, options) => {
    return ip({ headers: new Headers([["DO-Connecting-IP", d]]) }, options);
  });

  await suite(t, "header: `Fastly-Client-IP`", (d, options) => {
    return ip({ headers: new Headers([["Fastly-Client-IP", d]]) }, options);
  });

  await suite(t, "header: `Fly-Client-IP`", (d, options) => {
    return ip(
      { headers: new Headers([["Fly-Client-IP", d]]) },
      { ...options, platform: "fly-io" },
    );
  });

  await suite(t, "header: `True-Client-IP`", (d, options) => {
    return ip({ headers: new Headers([["True-Client-IP", d]]) }, options);
  });

  await suite(t, "header: `X-Real-IP`", (d, options) => {
    return ip({ headers: new Headers([["X-Real-IP", d]]) }, options);
  });

  await suite(t, "header: `X-Cluster-Client-IP`", (d, options) => {
    return ip({ headers: new Headers([["X-Cluster-Client-IP", d]]) }, options);
  });

  await suite(t, "header: `X-Forwarded`", (d, options) => {
    return ip({ headers: new Headers([["X-Forwarded", d]]) }, options);
  });

  await suite(t, "header: `Forwarded-For`", (d, options) => {
    return ip({ headers: new Headers([["Forwarded-For", d]]) }, options);
  });

  await suite(t, "header: `Forwarded`", (d, options) => {
    return ip({ headers: new Headers([["Forwarded", d]]) }, options);
  });

  await suite(t, "header: `X-Appengine-User-IP`", (d, options) => {
    return ip({ headers: new Headers([["X-Appengine-User-IP", d]]) }, options);
  });
});

test("X-Forwarded-For with multiple IP", async (t) => {
  await t.test("returns the last public IP (ipv4)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    assert.equal(ip(request), "3.3.3.3");
  });

  await t.test("returns the last public IP (ipv6)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
    };
    assert.equal(ip(request), "abcd::");
  });

  await t.test("skips any `unknown` IP (ipv4)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown"],
      ]),
    };
    assert.equal(ip(request), "3.3.3.3");
  });

  await t.test("skips any `unknown` IP (ipv6)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, unknown"],
      ]),
    };
    assert.equal(ip(request), "abcd::");
  });

  await t.test("skips any private IP (ipv4)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1"],
      ]),
    };
    assert.equal(ip(request), "3.3.3.3");
  });

  await t.test("skips any private IP (ipv6)", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, ::1"],
      ]),
    };
    assert.equal(ip(request), "abcd::");
  });

  await t.test("skips any trusted proxy IP (ipv4)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    const options = {
      proxies: ["3.3.3.3"],
    };
    assert.equal(ip(request, options), "2.2.2.2");
  });

  await t.test("skips any trusted proxy IP (ipv6)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
    };
    const options = {
      proxies: ["abcd::"],
    };
    assert.equal(ip(request, options), "3.3.3.3");
  });

  await t.test("skips multiple trusted proxy IPs (ipv4)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    const options = {
      proxies: ["3.3.3.3", "2.2.2.2"],
    };
    assert.equal(ip(request, options), "1.1.1.1");
  });

  await t.test("skips multiple trusted proxy IP (ipv6)", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
    };
    const options = {
      proxies: ["3.3.3.3", "abcd::"],
    };
    assert.equal(ip(request, options), "e123::");
  });
});
