import assert from "node:assert/strict";
import test from "node:test";
import findIp, { parseProxy } from "../index.js";

type Proxy = ReturnType<typeof parseProxy>;

type Case = [
  message: string,
  input: string,
  expected: string,
  proxies?: Array<Proxy>,
];

const cases: Array<Case> = [
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
    ["1.1.1.1"],
  ],
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
  [
    "returns empty string if the ip address is too short (ipv6)",
    "ffff:ffff:",
    "",
  ],
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
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "default",
      "findIp",
      "parseProxy",
    ]);
  });
});

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
        assert.equal(
          findIp({ headers: new Headers(), ip: input }, { proxies }),
          expected,
        );
      });
    }
  });

  await t.test("request: `socket.remoteAddress`", async (t) => {
    for (const [message, input, expected, proxies] of cases) {
      await t.test(message, () => {
        assert.equal(
          findIp(
            { headers: new Headers(), socket: { remoteAddress: input } },
            { proxies },
          ),
          expected,
        );
      });
    }
  });

  await t.test("request: `info.remoteAddress`", async (t) => {
    for (const [message, input, expected, proxies] of cases) {
      await t.test(message, () => {
        assert.equal(
          findIp(
            { headers: new Headers(), info: { remoteAddress: input } },
            { proxies },
          ),
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
    await t.test("should support an `X-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["X-Client-IP", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Forwarded-For` header", async (t) => {
      const all: Array<Case> = [
        ...cases,
        [
          "returns the last public IP (ipv4)",
          "1.1.1.1, 2.2.2.2, 3.3.3.3",
          "3.3.3.3",
        ],
        [
          "returns the last public IP (ipv6)",
          "e123::, 3.3.3.3, abcd::",
          "abcd::",
        ],
        [
          "skips any `unknown` IP (ipv4)",
          "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown",
          "3.3.3.3",
        ],
        [
          "skips any `unknown` IP (ipv6)",
          "e123::, 3.3.3.3, abcd::, unknown",
          "abcd::",
        ],
        [
          "skips any private IP (ipv4)",
          "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1",
          "3.3.3.3",
        ],
        [
          "skips any private IP (ipv6)",
          "e123::, 3.3.3.3, abcd::, ::1",
          "abcd::",
        ],
        [
          "skips any trusted proxy IP (ipv4)",
          "1.1.1.1, 2.2.2.2, 3.3.3.3",
          "2.2.2.2",
          ["3.3.3.3"],
        ],
        [
          "skips any trusted proxy IP (ipv6)",
          "e123::, 3.3.3.3, abcd::",
          "3.3.3.3",
          ["abcd::"],
        ],
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
            findIp(
              { headers: new Headers([["X-Forwarded-For", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should not support `CF-Connecting-IP` header", async (t) => {
      assert.equal(
        findIp({ headers: new Headers([["CF-Connecting-IP", "1.1.1.1"]]) }),
        "",
      );
    });

    await t.test(
      "should not support `CF-Connecting-IPv6` header",
      async (t) => {
        assert.equal(
          findIp({
            headers: new Headers([["CF-Connecting-IPv6", "2001:1::"]]),
          }),
          "",
        );
      },
    );

    await t.test("should not support `Fly-Client-IP` header", async (t) => {
      assert.equal(
        findIp({
          headers: new Headers([["Fly-Client-IP", "1.1.1.1"]]),
        }),
        "",
      );
    });

    await t.test(
      "should not support `X-Vercel-Forwarded-For` header",
      async (t) => {
        assert.equal(
          findIp({
            headers: new Headers([["X-Vercel-Forwarded-For", "1.1.1.1"]]),
          }),
          "",
        );
      },
    );

    await t.test("should support a `DO-Connecting-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["DO-Connecting-IP", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support a `Fastly-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["Fastly-Client-IP", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support a `True-Client-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["True-Client-IP", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support an `X-Real-IP` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["X-Real-IP", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test(
      "should support an `X-Cluster-Client-IP` header",
      async (t) => {
        for (const [message, input, expected, proxies] of cases) {
          await t.test(message, () => {
            assert.equal(
              findIp(
                { headers: new Headers([["X-Cluster-Client-IP", input]]) },
                { proxies },
              ),
              expected,
            );
          });
        }
      },
    );

    await t.test("should support an `X-Forwarded` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["X-Forwarded", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support a `Forwarded-For` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["Forwarded-For", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support a `Forwarded` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: new Headers([["Forwarded", input]]) },
              { proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test(
      "should support an `X-Appengine-User-IP` header",
      async (t) => {
        for (const [message, input, expected, proxies] of cases) {
          await t.test(message, () => {
            assert.equal(
              findIp(
                { headers: new Headers([["X-Appengine-User-IP", input]]) },
                { proxies },
              ),
              expected,
            );
          });
        }
      },
    );
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
        findIp(
          { headers: new Headers([["X-Real-IP", "1.1.1.1"]]) },
          { platform: "cloudflare" },
        ),
        "",
      );
    });
  });

  await t.test("platform: `firebase`", async (t) => {
    await t.test("should support an `x-fah-client-ip` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: { "x-fah-client-ip": input } },
              { platform: "firebase", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should support an `x-forwarded-for` header", async (t) => {
      for (const [message, input, expected, proxies] of cases) {
        await t.test(message, () => {
          assert.equal(
            findIp(
              { headers: { "x-forwarded-for": input } },
              { platform: "firebase", proxies },
            ),
            expected,
          );
        });
      }
    });

    await t.test("should ignore other headers", () => {
      assert.equal(
        findIp({ headers: { forwarded: "1.1.1.1" } }, { platform: "firebase" }),
        "",
      );
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
        findIp(
          { headers: new Headers([["X-Real-IP", "1.1.1.1"]]) },
          { platform: "fly-io" },
        ),
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

    await t.test(
      "should support an `X-Vercel-Forwarded-For` header",
      async (t) => {
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
      },
    );

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
        findIp(
          { headers: new Headers([["Forwarded", "1.1.1.1"]]) },
          { platform: "vercel" },
        ),
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
        findIp(
          { headers: new Headers([["X-Real-IP", "1.1.1.1"]]) },
          { platform: "render" },
        ),
        "",
      );
    });
  });
});
