import { describe, test } from "node:test";
import { expect } from "expect";
import type { Options, RequestLike } from "../index";
import ip from "../index";

type MakeTest = (ip: unknown) => [RequestLike, Options | undefined];

function suite(make: MakeTest) {
  test("returns empty string if unspecified", () => {
    const [request, options] = make("::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if loopback address", () => {
    const [request, options] = make("::1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if ipv4 mapped address", () => {
    const [request, options] = make("::ffff:127.0.0.1");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if ipv4-ipv6 translat range", () => {
    const [request, options] = make("64:ff9b:1::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if discard range", () => {
    const [request, options] = make("100::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if documentation range", () => {
    const [request, options] = make("2001:db8::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if benchmarking range", () => {
    const [request, options] = make("2001:2::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if unique local range", () => {
    const [request, options] = make("fc02::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if unicast link local range", () => {
    const [request, options] = make("fe80::");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if the ip address is too short", () => {
    const [request, options] = make("ffff:ffff:");
    expect(ip(request, options)).toEqual("");
  });

  test("returns empty string if the ip address is too long", () => {
    const [request, options] = make(
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    );
    expect(ip(request, options)).toEqual("");
  });

  test("returns the ip if it is 'Port Control Protocol Anycast' address", () => {
    const [request, options] = make("2001:1::1");
    expect(ip(request, options)).toEqual("2001:1::1");
  });

  test("returns the ip if it is 'Traversal Using Relays around NAT Anycast' address", () => {
    const [request, options] = make("2001:1::2");
    expect(ip(request, options)).toEqual("2001:1::2");
  });

  test("returns the ip if it is 'AMT' address", () => {
    const [request, options] = make("2001:3::");
    expect(ip(request, options)).toEqual("2001:3::");
  });

  test("returns the ip if it is 'AS112-v6' address", () => {
    const [request, options] = make("2001:4:112::");
    expect(ip(request, options)).toEqual("2001:4:112::");
  });

  test("returns the ip if it is 'ORCHIDv2' address", () => {
    const [request, options] = make("2001:20::");
    expect(ip(request, options)).toEqual("2001:20::");
  });

  test("returns the ip if valid", () => {
    const [request, options] = make("::abcd:c00a:2ff");
    expect(ip(request, options)).toEqual("::abcd:c00a:2ff");
  });

  test("returns the ip if valid, after ignoring scope", () => {
    const [request, options] = make("::abcd:c00a:2ff%1");
    expect(ip(request, options)).toEqual("::abcd:c00a:2ff%1");
  });

  test("returns empty string if the ip is a trusted proxy", () => {
    const [request, options] = make("::abcd:c00a:2ff");
    expect(ip(request, { ...options, proxies: ["::abcd:c00a:2ff"] }));
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

describe("find public IPv6", () => {
  requestSuite("ip");
  requestSuite("socket", "remoteAddress");
  requestSuite("info", "remoteAddress");
  requestSuite("requestContext", "identity", "sourceIp");

  headerSuite("X-Client-IP");
  headerSuite("X-Forwarded-For");
  headerSuite("CF-Connecting-IPv6", { platform: "cloudflare" });
  headerSuite("CF-Connecting-IP", { platform: "cloudflare" });
  headerSuite("X-Real-IP", { platform: "vercel" });
  headerSuite("X-Vercel-Forwarded-For", { platform: "vercel" });
  headerSuite("X-Forwarded-For", { platform: "vercel" });
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
    test("returns the first public IP", () => {
      const request = {
        headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
      };
      expect(ip(request)).toEqual("abcd::");
    });

    test("skips any `unknown` IP", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, unknown"],
        ]),
      };
      expect(ip(request)).toEqual("abcd::");
    });

    test("skips any private IP", () => {
      const request = {
        headers: new Headers([
          ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, ::1"],
        ]),
      };
      expect(ip(request)).toEqual("abcd::");
    });

    test("skips any trusted proxy IP", () => {
      const request = {
        headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
      };
      const options = {
        proxies: ["abcd::"],
      };
      expect(ip(request, options)).toEqual("3.3.3.3");
    });

    test("skips multiple trusted proxy IPs", () => {
      const request = {
        headers: new Headers([["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"]]),
      };
      const options = {
        proxies: ["3.3.3.3", "abcd::"],
      };
      expect(ip(request, options)).toEqual("e123::");
    });
  });
});
