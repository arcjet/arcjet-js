import { describe, test } from "node:test";
import { expect } from "expect";
import type { Options, RequestLike } from "../index.js";
import ip, { parseProxy } from "../index.js";

type MakeTest = (ip: unknown) => [RequestLike, Options | undefined];

function suite(make: MakeTest) {
  test("returns empty string if headers not set", () => {
    expect(
      ip(
        // @ts-expect-error
        {},
      ),
    ).toEqual("");
  });

  test("returns empty string if headers is null", () => {
    expect(
      ip({
        // @ts-expect-error
        headers: null,
      }),
    ).toEqual("");
  });

  test("returns empty string if headers is not object", () => {
    expect(
      ip({
        // @ts-expect-error
        headers: "",
      }),
    ).toEqual("");
  });

  // Support for Node.js IncomingMessage
  test("supports plain object headers with single value", () => {
    const request = {
      headers: {
        // Node.js lowercases the header keys
        "x-real-ip": "1.1.1.1",
      },
    };
    expect(ip(request)).toEqual("1.1.1.1");
  });

  // Support for Node.js IncomingMessage
  test("supports plain object headers with array value", () => {
    const request = {
      headers: {
        // Node.js lowercases the header keys
        "x-forwarded-for": ["1.1.1.1", "2.2.2.2", "3.3.3.3"],
      },
    };
    expect(ip(request)).toEqual("3.3.3.3");
  });

  test("returns empty string if unspecified", () => {
    const [request, options] = make("0.0.0.0");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if 'this network' address", () => {
    const [request, options] = make("0.1.2.3");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the shared address range", () => {
    const [request, options] = make("100.127.255.255");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the link local address range", () => {
    const [request, options] = make("169.254.255.255");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the future protocol range", () => {
    const [request, options] = make("192.0.0.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the 192.0.2.x documentation range", () => {
    const [request, options] = make("192.0.2.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the 198.51.100.x documentation range", () => {
    const [request, options] = make("198.51.100.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the 203.0.113.x documentation range", () => {
    const [request, options] = make("203.0.113.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the benchmarking range", () => {
    const [request, options] = make("198.19.255.255");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the reserved range", () => {
    const [request, options] = make("240.0.0.0");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the broadcast address", () => {
    const [request, options] = make("255.255.255.255");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if loopback", () => {
    const [request, options] = make("127.0.0.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if not full ip", () => {
    const [request, options] = make("12.3.4");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if more than 3 digits in an octet", () => {
    const [request, options] = make("1111.2.3.4");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if more than full ip", () => {
    const [request, options] = make("1.2.3.4.5");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if any octet has leading 0", () => {
    const [request, options] = make("1.02.3.4");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if not a string", () => {
    const [request, options] = make(["12", "3", "4"]);
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the 10.x.x.x private range", () => {
    const [request, options] = make("10.1.1.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the 172.16.x.x-172.31.x.x private range", () => {
    const [request, options] = make("172.18.1.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if in the 192.168.x.x private range", () => {
    const [request, options] = make("192.168.1.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string outside of the valid range", () => {
    const [request, options] = make("1.1.1.256");
    expect(ip(request, options)).toEqual("");
  });

  test("returns the ip if valid", () => {
    const [request, options] = make("1.1.1.1");
    expect(ip(request, options)).toEqual("1.1.1.1");
  });

  test("returns the full ip if valid, after ignoring port", () => {
    const [request, options] = make("1.1.1.1:443");
    expect(ip(request, options)).toEqual("1.1.1.1:443");
  });

  test("returns empty string if the ip is a trusted proxy", () => {
    const [request, options] = make("1.1.1.1");
    expect(ip(request, { ...options, proxies: ["1.1.1.1"] })).toEqual("");
    expect(
      ip(request, { ...options, proxies: [parseProxy("1.1.1.1/32")] }),
    ).toEqual("");
  });

  test("returns the string if the ip is not a trusted proxy", () => {
    const [request, options] = make("1.1.1.1");
    expect(ip(request, { ...options, proxies: ["1.1.1.2"] })).toEqual(
      "1.1.1.1",
    );
    expect(
      ip(request, { ...options, proxies: [parseProxy("1.1.1.2/32")] }),
    ).toEqual("1.1.1.1");
    expect(
      ip(request, {
        ...options,
        proxies: [
          // @ts-ignore
          1234,
        ],
      }),
    ).toEqual("1.1.1.1");
  });
}

function requestSuite(...keys: string[]) {
  describe(`request: ${keys.join(".")}`, () => {
    suite((ip) => {
      // Create a nested request-like object based on the keys passed to the function
      function nested(keys: string[]): RequestLike {
        if (keys.length > 1) {
          return {
            ...Object.fromEntries([[keys[0], nested(keys.slice(1))]]),
            headers: new Headers(),
          };
        } else {
          return {
            ...Object.fromEntries([[keys[0], ip]]),
            headers: new Headers(),
          };
        }
      }

      const req = nested(keys);
      return [req, undefined];
    });
  });
}

function headerSuite(key: string, options?: Options) {
  describe(`header: ${key}`, () => {
    suite((ip: unknown) => {
      if (typeof ip === "string") {
        return [{ headers: new Headers([[key, ip]]) }, options];
      } else {
        return [
          {
            headers: new Headers([
              [
                key,
                // @ts-expect-error
                ip,
              ],
            ]),
          },
          options,
        ];
      }
    });
  });
}

describe("find public IPv4", () => {
  requestSuite("ip");
  requestSuite("socket", "remoteAddress");
  requestSuite("info", "remoteAddress");
  requestSuite("requestContext", "identity", "sourceIp");

  headerSuite("X-Client-IP");
  headerSuite("X-Forwarded-For");
  headerSuite("CF-Connecting-IP", { platform: "cloudflare" });
  headerSuite("X-Real-IP", { platform: "vercel" });
  headerSuite("X-Vercel-Forwarded-For", { platform: "vercel" });
  headerSuite("X-Forwarded-For", { platform: "vercel" });
  headerSuite("True-Client-IP", { platform: "render" });
  headerSuite("DO-Connecting-IP");
  headerSuite("Fastly-Client-IP");
  headerSuite("Fly-Client-IP", { platform: "fly-io" });
  headerSuite("True-Client-IP");
  headerSuite("X-Real-IP");
  headerSuite("X-Cluster-Client-IP");
  headerSuite("X-Forwarded");
  headerSuite("Forwarded-For");
  headerSuite("Forwarded");
  headerSuite("X-Appengine-User-IP");

  describe("X-Forwarded-For with multiple IP", () => {
    test("returns the last public IP", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"],
        ]),
      };
      expect(ip(request)).toEqual("3.3.3.3");
    });

    test("skips any `unknown` IP", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown"],
        ]),
      };
      expect(ip(request)).toEqual("3.3.3.3");
    });

    test("skips any private IP", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1"],
        ]),
      };
      expect(ip(request)).toEqual("3.3.3.3");
    });

    test("skips any trusted proxy IP", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"],
        ]),
      };
      const options = {
        proxies: ["3.3.3.3"],
      };
      expect(ip(request, options)).toEqual("2.2.2.2");
    });

    test("skips multiple trusted proxy IPs", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"],
        ]),
      };
      const options = {
        proxies: ["3.3.3.3", "2.2.2.2"],
      };
      expect(ip(request, options)).toEqual("1.1.1.1");
    });
  });
});
