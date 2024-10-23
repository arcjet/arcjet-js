/**
 * @jest-environment node
 */
import { describe, expect, test } from "@jest/globals";
import type { Options, RequestLike } from "../index";
import ip from "../index";

type MakeTest = (ip: unknown) => [RequestLike, Headers, Options | undefined];

function suite(make: MakeTest) {
  test("returns empty string if unspecified", () => {
    const [request, headers, options] = make("0.0.0.0");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if 'this network' address", () => {
    const [request, headers, options] = make("0.1.2.3");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the shared address range", () => {
    const [request, headers, options] = make("100.127.255.255");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the link local address range", () => {
    const [request, headers, options] = make("169.254.255.255");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the future protocol range", () => {
    const [request, headers, options] = make("192.0.0.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the 192.0.2.x documentation range", () => {
    const [request, headers, options] = make("192.0.2.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the 198.51.100.x documentation range", () => {
    const [request, headers, options] = make("198.51.100.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the 203.0.113.x documentation range", () => {
    const [request, headers, options] = make("203.0.113.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the benchmarking range", () => {
    const [request, headers, options] = make("198.19.255.255");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the reserved range", () => {
    const [request, headers, options] = make("240.0.0.0");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the broadcast address", () => {
    const [request, headers, options] = make("255.255.255.255");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if loopback", () => {
    const [request, headers, options] = make("127.0.0.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if not full ip", () => {
    const [request, headers, options] = make("12.3.4");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if more than 3 digits in an octet", () => {
    const [request, headers, options] = make("1111.2.3.4");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if more than full ip", () => {
    const [request, headers, options] = make("1.2.3.4.5");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if any octet has leading 0", () => {
    const [request, headers, options] = make("1.02.3.4");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if not a string", () => {
    const [request, headers, options] = make(["12", "3", "4"]);
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the 10.x.x.x private range", () => {
    const [request, headers, options] = make("10.1.1.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the 172.16.x.x-172.31.x.x private range", () => {
    const [request, headers, options] = make("172.18.1.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string if in the 192.168.x.x private range", () => {
    const [request, headers, options] = make("192.168.1.1");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns empty string outside of the valid range", () => {
    const [request, headers, options] = make("1.1.1.256");
    expect(ip(request, headers, options)).toEqual("");
  });

  test("returns the ip if valid", () => {
    const [request, headers, options] = make("1.1.1.1");
    expect(ip(request, headers, options)).toEqual("1.1.1.1");
  });

  test("returns the full ip if valid, after ignoring port", () => {
    const [request, headers, options] = make("1.1.1.1:443");
    expect(ip(request, headers, options)).toEqual("1.1.1.1:443");
  });
}

function requestSuite(...keys: string[]) {
  describe(`request: ${keys.join(".")}`, () => {
    suite((ip) => {
      // Create a nested request-like object based on the keys passed to the function
      function nested(keys: string[]): RequestLike {
        if (keys.length > 1) {
          return Object.fromEntries([[keys[0], nested(keys.slice(1))]]);
        } else {
          return Object.fromEntries([[keys[0], ip]]);
        }
      }

      const req = nested(keys);
      return [req, new Headers(), undefined];
    });
  });
}

function headerSuite(key: string, options?: Options) {
  describe(`header: ${key}`, () => {
    suite((ip: unknown) => {
      if (typeof ip === "string") {
        return [{}, new Headers([[key, ip]]), options];
      } else {
        return [
          {},
          new Headers([
            [
              key,
              // @ts-expect-error
              ip,
            ],
          ]),
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
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3"],
      ]);
      expect(ip(request, headers)).toEqual("3.3.3.3");
    });

    test("skips any `unknown` IP", () => {
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, unknown"],
      ]);
      expect(ip(request, headers)).toEqual("3.3.3.3");
    });

    test("skips any private IP", () => {
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "1.1.1.1, 2.2.2.2, 3.3.3.3, 127.0.0.1"],
      ]);
      expect(ip(request, headers)).toEqual("3.3.3.3");
    });
  });
});
