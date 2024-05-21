/**
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, afterEach, jest } from "@jest/globals";
import ip, { RequestLike } from "../index";

type MakeTest = (ip: unknown) => [RequestLike, Headers];

beforeEach(() => {
  jest.replaceProperty(process, "env", {
    ...process.env,
    FLY_APP_NAME: "testing",
  });
  // We inject an empty `navigator` object via jest.config.js to act like
  // Cloudflare Workers
  jest.replaceProperty(globalThis, "navigator", {
    ...globalThis.navigator,
    userAgent: "Cloudflare-Workers",
  });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function suite(make: MakeTest) {
  test("returns empty string if unspecified", () => {
    const [request, headers] = make("::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if loopback address (in production)", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");
    const [request, headers] = make("::1");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns the loopback address (in development)", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "development");
    const [request, headers] = make("::1");
    expect(ip(request, headers)).toEqual("::1");
  });

  test("returns empty string if ipv4 mapped address (in production)", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "production");
    const [request, headers] = make("::ffff:127.0.0.1");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns an address if ipv4 mapped address (in development)", () => {
    jest.replaceProperty(process.env, "NODE_ENV", "development");
    const [request, headers] = make("::ffff:192.168.0.1");
    expect(ip(request, headers)).toEqual("::ffff:192.168.0.1");
  });

  test("returns empty string if ipv4-ipv6 translat range", () => {
    const [request, headers] = make("64:ff9b:1::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if discard range", () => {
    const [request, headers] = make("100::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if documentation range", () => {
    const [request, headers] = make("2001:db8::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if benchmarking range", () => {
    const [request, headers] = make("2001:2::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if unique local range", () => {
    const [request, headers] = make("fc02::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if unicast link local range", () => {
    const [request, headers] = make("fe80::");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if the ip address is too short", () => {
    const [request, headers] = make("ffff:ffff:");
    expect(ip(request, headers)).toEqual("");
  });

  test("returns empty string if the ip address is too long", () => {
    const [request, headers] = make(
      "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
    );
    expect(ip(request, headers)).toEqual("");
  });

  test("returns the ip if it is 'Port Control Protocol Anycast' address", () => {
    const [request, headers] = make("2001:1::1");
    expect(ip(request, headers)).toEqual("2001:1::1");
  });

  test("returns the ip if it is 'Traversal Using Relays around NAT Anycast' address", () => {
    const [request, headers] = make("2001:1::2");
    expect(ip(request, headers)).toEqual("2001:1::2");
  });

  test("returns the ip if it is 'AMT' address", () => {
    const [request, headers] = make("2001:3::");
    expect(ip(request, headers)).toEqual("2001:3::");
  });

  test("returns the ip if it is 'AS112-v6' address", () => {
    const [request, headers] = make("2001:4:112::");
    expect(ip(request, headers)).toEqual("2001:4:112::");
  });

  test("returns the ip if it is 'ORCHIDv2' address", () => {
    const [request, headers] = make("2001:20::");
    expect(ip(request, headers)).toEqual("2001:20::");
  });

  test("returns the ip if valid", () => {
    const [request, headers] = make("::abcd:c00a:2ff");
    expect(ip(request, headers)).toEqual("::abcd:c00a:2ff");
  });

  test("returns the ip if valid, after ignoring scope", () => {
    const [request, headers] = make("::abcd:c00a:2ff%1");
    expect(ip(request, headers)).toEqual("::abcd:c00a:2ff%1");
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
      return [req, new Headers()];
    });
  });
}

function headerSuite(key: string) {
  describe(`header: ${key}`, () => {
    suite((ip: unknown) => {
      if (typeof ip === "string") {
        return [{}, new Headers([[key, ip]])];
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
  headerSuite("CF-Connecting-IPv6");
  headerSuite("CF-Connecting-IP");
  headerSuite("DO-Connecting-IP");
  headerSuite("Fastly-Client-IP");
  headerSuite("Fly-Client-IP");
  headerSuite("True-Client-IP");
  headerSuite("X-Real-IP");
  headerSuite("X-Cluster-Client-IP");
  headerSuite("X-Forwarded");
  headerSuite("Forwarded-For");
  headerSuite("Forwarded");
  headerSuite("X-Appengine-User-IP");

  describe("X-Forwarded-For with multiple IP", () => {
    test("returns the first public IP", () => {
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::"],
      ]);
      expect(ip(request, headers)).toEqual("abcd::");
    });

    test("skips any `unknown` IP", () => {
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, unknown"],
      ]);
      expect(ip(request, headers)).toEqual("abcd::");
    });

    test("skips any private IP (in production)", () => {
      jest.replaceProperty(process.env, "NODE_ENV", "production");
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "e123::, 3.3.3.3, abcd::, ::1"],
      ]);
      expect(ip(request, headers)).toEqual("abcd::");
    });

    test("returns the loopback IP (in development)", () => {
      jest.replaceProperty(process.env, "NODE_ENV", "development");
      const request = {};
      const headers = new Headers([
        ["X-Forwarded-For", "abcd::, e123::, 3.3.3.3, ::1"],
      ]);
      expect(ip(request, headers)).toEqual("::1");
    });
  });
});
