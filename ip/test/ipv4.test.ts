import assert from "node:assert/strict";
import test from "node:test";
import type { Options, RequestLike } from "../index.js";
import ip, { parseProxy } from "../index.js";

type Make = (
  ip: string,
) => [request: RequestLike, options?: Options | undefined];
type TestContext = Parameters<Required<Parameters<typeof test>>[0]>[0];

async function suite(t: TestContext, label: string, make: Make) {
  await t.test(label, async (t) => {
    await t.test("returns empty string if unspecified", () => {
      const [request, options] = make("0.0.0.0");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if 'this network' address", () => {
      const [request, options] = make("0.1.2.3");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if in the shared address range", () => {
      const [request, options] = make("100.127.255.255");
      assert.equal(ip(request, options), "");
    });

    await t.test(
      "returns empty string if in the link local address range",
      () => {
        const [request, options] = make("169.254.255.255");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test("returns empty string if in the future protocol range", () => {
      const [request, options] = make("192.0.0.1");
      assert.equal(ip(request, options), "");
    });

    await t.test(
      "returns empty string if in the 192.0.2.x documentation range",
      () => {
        const [request, options] = make("192.0.2.1");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test(
      "returns empty string if in the 198.51.100.x documentation range",
      () => {
        const [request, options] = make("198.51.100.1");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test(
      "returns empty string if in the 203.0.113.x documentation range",
      () => {
        const [request, options] = make("203.0.113.1");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test("returns empty string if in the benchmarking range", () => {
      const [request, options] = make("198.19.255.255");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if in the reserved range", () => {
      const [request, options] = make("240.0.0.0");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if in the broadcast address", () => {
      const [request, options] = make("255.255.255.255");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if loopback", () => {
      const [request, options] = make("127.0.0.1");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if not full ip", () => {
      const [request, options] = make("12.3.4");
      assert.equal(ip(request, options), "");
    });

    await t.test(
      "returns empty string if more than 3 digits in an octet",
      () => {
        const [request, options] = make("1111.2.3.4");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test("returns empty string if more than full ip", () => {
      const [request, options] = make("1.2.3.4.5");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if any octet has leading 0", () => {
      const [request, options] = make("1.02.3.4");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns empty string if not a string", () => {
      // @ts-expect-error: test how runtime handles non-string input.
      const [request, options] = make(["12", "3", "4"]);
      assert.equal(ip(request, options), "");
    });

    await t.test(
      "returns empty string if in the 10.x.x.x private range",
      () => {
        const [request, options] = make("10.1.1.1");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test(
      "returns empty string if in the 172.16.x.x-172.31.x.x private range",
      () => {
        const [request, options] = make("172.18.1.1");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test(
      "returns empty string if in the 192.168.x.x private range",
      () => {
        const [request, options] = make("192.168.1.1");
        assert.equal(ip(request, options), "");
      },
    );

    await t.test("returns empty string outside of the valid range", () => {
      const [request, options] = make("1.1.1.256");
      assert.equal(ip(request, options), "");
    });

    await t.test("returns the ip if valid", () => {
      const [request, options] = make("1.1.1.1");
      assert.equal(ip(request, options), "1.1.1.1");
    });

    await t.test("returns the full ip if valid, after ignoring port", () => {
      const [request, options] = make("1.1.1.1:443");
      assert.equal(ip(request, options), "1.1.1.1:443");
    });

    await t.test("returns empty string if the ip is a trusted proxy", () => {
      const [request, options] = make("1.1.1.1");
      assert.equal(ip(request, { ...options, proxies: ["1.1.1.1"] }), "");
      assert.equal(
        ip(request, { ...options, proxies: [parseProxy("1.1.1.1/32")] }),
        "",
      );
    });

    await t.test("returns the string if the ip is not a trusted proxy", () => {
      const [request, options] = make("1.1.1.1");
      assert.equal(
        ip(request, { ...options, proxies: ["1.1.1.2"] }),
        "1.1.1.1",
      );
      assert.equal(
        ip(request, { ...options, proxies: [parseProxy("1.1.1.2/32")] }),
        "1.1.1.1",
      );
      assert.equal(
        ip(request, {
          ...options,
          proxies: [
            // @ts-ignore
            1234,
          ],
        }),
        "1.1.1.1",
      );
    });
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

  await suite(t, "request: `ip`", (ip) => {
    return [{ headers: new Headers(), ip }, undefined];
  });

  await suite(t, "request: `socket.remoteAddress`", (remoteAddress) => {
    return [{ headers: new Headers(), socket: { remoteAddress } }];
  });

  await suite(t, "request: `info.remoteAddress`", (remoteAddress) => {
    return [{ headers: new Headers(), info: { remoteAddress } }];
  });

  await suite(t, "request: `requestContext.identity.sourceIp`", (sourceIp) => {
    return [
      { headers: new Headers(), requestContext: { identity: { sourceIp } } },
    ];
  });

  await suite(t, "header: `X-Client-IP`", (ip) => {
    return [{ headers: new Headers([["X-Client-IP", ip]]) }];
  });

  await suite(t, "header: `X-Client-IP`", (ip) => {
    return [{ headers: new Headers([["X-Client-IP", ip]]) }];
  });

  await suite(t, "header: `X-Forwarded-For`", (ip) => {
    return [{ headers: new Headers([["X-Forwarded-For", ip]]) }];
  });

  await suite(t, "header: `CF-Connecting-IP`", (ip) => {
    return [
      { headers: new Headers([["CF-Connecting-IP", ip]]) },
      { platform: "cloudflare" },
    ];
  });

  await suite(t, "header: `X-Real-IP`", (ip) => {
    return [
      { headers: new Headers([["X-Real-IP", ip]]) },
      { platform: "vercel" },
    ];
  });

  await suite(t, "header: `X-Vercel-Forwarded-For`", (ip) => {
    return [
      { headers: new Headers([["X-Vercel-Forwarded-For", ip]]) },
      { platform: "vercel" },
    ];
  });

  await suite(t, "header: `X-Forwarded-For`", (ip) => {
    return [
      { headers: new Headers([["X-Forwarded-For", ip]]) },
      { platform: "vercel" },
    ];
  });

  await suite(t, "header: `True-Client-IP`", (ip) => {
    return [
      { headers: new Headers([["True-Client-IP", ip]]) },
      { platform: "render" },
    ];
  });

  await suite(t, "header: `DO-Connecting-IP`", (ip) => {
    return [{ headers: new Headers([["DO-Connecting-IP", ip]]) }];
  });

  await suite(t, "header: `Fastly-Client-IP`", (ip) => {
    return [{ headers: new Headers([["Fastly-Client-IP", ip]]) }];
  });

  await suite(t, "header: `Fly-Client-IP`", (ip) => {
    return [
      { headers: new Headers([["Fly-Client-IP", ip]]) },
      { platform: "fly-io" },
    ];
  });

  await suite(t, "header: `True-Client-IP`", (ip) => {
    return [{ headers: new Headers([["True-Client-IP", ip]]) }];
  });

  await suite(t, "header: `X-Real-IP`", (ip) => {
    return [{ headers: new Headers([["X-Real-IP", ip]]) }];
  });

  await suite(t, "header: `X-Cluster-Client-IP`", (ip) => {
    return [{ headers: new Headers([["X-Cluster-Client-IP", ip]]) }];
  });

  await suite(t, "header: `X-Forwarded`", (ip) => {
    return [{ headers: new Headers([["X-Forwarded", ip]]) }];
  });

  await suite(t, "header: `Forwarded-For`", (ip) => {
    return [{ headers: new Headers([["Forwarded-For", ip]]) }];
  });

  await suite(t, "header: `Forwarded`", (ip) => {
    return [{ headers: new Headers([["Forwarded", ip]]) }];
  });

  await suite(t, "header: `X-Appengine-User-IP`", (ip) => {
    return [{ headers: new Headers([["X-Appengine-User-IP", ip]]) }];
  });
});

test("X-Forwarded-For with multiple IP", async (t) => {
  await t.test("returns the last public IP", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    assert.equal(ip(request), "3.3.3.3");
  });

  await t.test("skips any `unknown` IP", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown"],
      ]),
    };
    assert.equal(ip(request), "3.3.3.3");
  });

  await t.test("skips any private IP", () => {
    const request = {
      headers: new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1"],
      ]),
    };
    assert.equal(ip(request), "3.3.3.3");
  });

  await t.test("skips any trusted proxy IP", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    const options = {
      proxies: ["3.3.3.3"],
    };
    assert.equal(ip(request, options), "2.2.2.2");
  });

  await t.test("skips multiple trusted proxy IPs", () => {
    const request = {
      headers: new Headers([["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"]]),
    };
    const options = {
      proxies: ["3.3.3.3", "2.2.2.2"],
    };
    assert.equal(ip(request, options), "1.1.1.1");
  });
});
