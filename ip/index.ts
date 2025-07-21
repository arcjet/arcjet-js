function parseXForwardedFor(value?: string | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  const forwardedIps = [];

  // As per MDN X-Forwarded-For Headers documentation at
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
  // The `x-forwarded-for` header may return one or more IP addresses as
  // "client IP, proxy 1 IP, proxy 2 IP", so we want to split by the comma and
  // trim each item.
  for (const item of value.split(",")) {
    forwardedIps.push(item.trim());
  }

  return forwardedIps;
}

type IPv4Tuple = [number, number, number, number];
type IPv6Tuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function isIPv4Cidr(cidr: unknown): cidr is IPv4CIDR {
  return (
    typeof cidr === "object" &&
    cidr !== null &&
    "type" in cidr &&
    typeof cidr.type === "string" &&
    cidr.type === "v4" &&
    "contains" in cidr &&
    typeof cidr.contains === "function"
  );
}

function isIPv6Cidr(cidr: unknown): cidr is IPv6CIDR {
  return (
    typeof cidr === "object" &&
    cidr !== null &&
    "type" in cidr &&
    typeof cidr.type === "string" &&
    cidr.type === "v6" &&
    "contains" in cidr &&
    typeof cidr.contains === "function"
  );
}

function isTrustedProxy(
  ip: string,
  segments: ReadonlyArray<number>,
  proxies?: ReadonlyArray<string | CIDR> | null | undefined,
) {
  if (Array.isArray(proxies) && proxies.length > 0) {
    return proxies.some((proxy) => {
      if (typeof proxy === "string") {
        return proxy === ip;
      }
      if (isIPv4Tuple(segments) && isIPv4Cidr(proxy)) {
        return proxy.contains(segments);
      }
      if (isIPv6Tuple(segments) && isIPv6Cidr(proxy)) {
        return proxy.contains(segments);
      }
      return false;
    });
  }

  return false;
}

abstract class CIDR {
  abstract type: "v4" | "v6";
  abstract partSize: 8 | 16;
  abstract parts: readonly number[];
  abstract bits: number;

  // Based on CIDR matching implementation in `ipaddr.js`
  // Source code:
  // https://github.com/whitequark/ipaddr.js/blob/08c2cd41e2cb3400683cbd503f60421bfdf66921/lib/ipaddr.js#L107-L130
  //
  // Licensed: The MIT License (MIT)
  // Copyright (C) 2011-2017 whitequark <whitequark@whitequark.org>
  //
  // Permission is hereby granted, free of charge, to any person obtaining a copy
  // of this software and associated documentation files (the "Software"), to deal
  // in the Software without restriction, including without limitation the rights
  // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  // copies of the Software, and to permit persons to whom the Software is
  // furnished to do so, subject to the following conditions:

  // The above copyright notice and this permission notice shall be included in
  // all copies or substantial portions of the Software.

  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  // THE SOFTWARE.
  contains(ip: number[]): boolean {
    let part = 0;
    let shift;
    let cidrBits = this.bits;

    while (cidrBits > 0) {
      shift = this.partSize - cidrBits;
      if (shift < 0) {
        shift = 0;
      }

      if (ip[part] >> shift !== this.parts[part] >> shift) {
        return false;
      }

      cidrBits -= this.partSize;
      part += 1;
    }

    return true;
  }
}

class IPv4CIDR extends CIDR {
  type = "v4" as const;
  partSize = 8 as const;
  parts: Readonly<IPv4Tuple>;
  bits: number;

  constructor(parts: IPv4Tuple, bits: number) {
    super();
    this.bits = bits;
    this.parts = parts;
    Object.freeze(this);
  }

  contains(ip: IPv4Tuple): boolean {
    return super.contains(ip);
  }
}

class IPv6CIDR extends CIDR {
  type = "v6" as const;
  partSize = 16 as const;
  parts: Readonly<IPv6Tuple>;
  bits: number;

  constructor(parts: IPv6Tuple, bits: number) {
    super();
    this.bits = bits;
    this.parts = parts;
    Object.freeze(this);
  }

  contains(ip: IPv6Tuple): boolean {
    return super.contains(ip);
  }
}

function parseCIDR(cidr: `${string}/${string}`): IPv4CIDR | IPv6CIDR {
  // Pre-condition: `cidr` has be verified to have at least one `/`

  const cidrParts = cidr.split("/");
  if (cidrParts.length !== 2) {
    throw new Error("invalid CIDR address: must be exactly 2 parts");
  }

  const parser = new Parser(cidrParts[0]);
  const maybeIPv4 = parser.readIPv4Address();
  if (isIPv4Tuple(maybeIPv4)) {
    const bits = parseInt(cidrParts[1], 10);
    if (isNaN(bits) || bits < 0 || bits > 32) {
      throw new Error("invalid CIDR address: incorrect amount of bits");
    }

    return new IPv4CIDR(maybeIPv4, bits);
  }

  const maybeIPv6 = parser.readIPv6Address();
  if (isIPv6Tuple(maybeIPv6)) {
    const bits = parseInt(cidrParts[1], 10);
    if (isNaN(bits) || bits < 0 || bits > 128) {
      throw new Error("invalid CIDR address: incorrect amount of bits");
    }

    return new IPv6CIDR(maybeIPv6, bits);
  }

  throw new Error("invalid CIDR address: could not parse IP address");
}

function isCIDR(address: string): address is `${string}/${string}` {
  return address.includes("/");
}

// Converts a string that looks like a CIDR address into the corresponding class
// while ignoring non-CIDR IP addresses.
export function parseProxy(proxy: string): string | CIDR {
  if (isCIDR(proxy)) {
    return parseCIDR(proxy);
  } else {
    return proxy;
  }
}

function isIPv4Tuple(segements?: ArrayLike<number>): segements is IPv4Tuple {
  if (typeof segements === "undefined") {
    return false;
  }

  return segements.length === 4;
}

function isIPv6Tuple(segements?: ArrayLike<number>): segements is IPv6Tuple {
  if (typeof segements === "undefined") {
    return false;
  }

  return segements.length === 8;
}

function u16FromBytes(bytes: [number, number]) {
  const u8 = new Uint8Array(bytes);
  return new Uint16Array(u8.buffer)[0];
}

function u32FromBytes(bytes: IPv4Tuple) {
  const u8 = new Uint8Array(bytes);
  return new Uint32Array(u8.buffer)[0];
}

// This Parser and "is global" comparisons are a TypeScript implementation of
// similar code in the Rust stdlib with only slight deviations as noted.
//
// We want to mirror Rust's logic as close as possible, because we'll be relying
// on its implementation when we add a Wasm library to determine IPs and only
// falling back to JavaScript in non-Wasm environments.
//
// Parser source:
// https://github.com/rust-lang/rust/blob/07921b50ba6dcb5b2984a1dba039a38d85bffba2/library/core/src/net/parser.rs#L34
// Comparison source:
// https://github.com/rust-lang/rust/blob/87e1447aadaa2899ff6ccabe1fa669eb50fb60a1/library/core/src/net/ip_addr.rs#L749
// https://github.com/rust-lang/rust/blob/87e1447aadaa2899ff6ccabe1fa669eb50fb60a1/library/core/src/net/ip_addr.rs#L1453
//
// Licensed: The MIT License (MIT)
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
class Parser {
  state: string;

  constructor(input: string) {
    this.state = input;
  }

  readAtomically<T>(inner: (parser: this) => T | undefined) {
    const state = this.state;
    const result = inner(this);
    if (typeof result === "undefined") {
      this.state = state;
    }
    return result;
  }

  peakChar(): string | undefined {
    return this.state[0];
  }

  readChar(): string | undefined {
    const b = this.state[0];
    this.state = this.state.slice(1);
    return b;
  }

  readGivenChar(target: string) {
    return this.readAtomically((p) => {
      const c = p.readChar();
      if (c === target) {
        return c;
      }
    });
  }

  readSeparator<T>(sep: string, index: number, inner: (parser: this) => T) {
    return this.readAtomically((p) => {
      if (index > 0) {
        const c = p.readGivenChar(sep);
        if (typeof c === "undefined") {
          return;
        }
      }
      return inner(p);
    });
  }

  readNumber(
    radix: 10 | 16,
    maxDigits?: number,
    allowZeroPrefix: boolean = false,
  ) {
    return this.readAtomically((p) => {
      let result = 0;
      let digitCount = 0;
      const hasLeadingZero = p.peakChar() === "0";

      function nextCharAsDigit() {
        return p.readAtomically((p) => {
          const c = p.readChar();
          if (c) {
            const n = parseInt(c, radix);
            if (!isNaN(n)) {
              return n;
            }
          }
        });
      }

      for (
        let digit = nextCharAsDigit();
        digit !== undefined;
        digit = nextCharAsDigit()
      ) {
        result = result * radix;
        result = result + digit;
        digitCount += 1;
        if (typeof maxDigits !== "undefined") {
          if (digitCount > maxDigits) {
            return;
          }
        }
      }

      if (digitCount === 0) {
        return;
      } else if (!allowZeroPrefix && hasLeadingZero && digitCount > 1) {
        return;
      } else {
        return result;
      }
    });
  }

  readIPv4Address(): number[] | undefined {
    return this.readAtomically((p) => {
      const groups: number[] = [];
      for (let idx = 0; idx < 4; idx++) {
        const result = p.readSeparator(".", idx, (p) => {
          // Disallow octal number in IP string
          // https://tools.ietf.org/html/rfc6943#section-3.1.1
          return p.readNumber(10, 3, false);
        });
        if (result === undefined) {
          return;
        } else {
          groups.push(result);
        }
      }

      return groups;
    });
  }

  readIPv6Address(): Uint16Array | undefined {
    // Read a chunk of an IPv6 address into `groups`. Returns the number of
    // groups read, along with a bool indicating if an embedded trailing IPv4
    // address was read. Specifically, read a series of colon-separated IPv6
    // groups (0x0000 - 0xFFFF), with an optional trailing embedded IPv4 address
    const readGroups = (p: Parser, groups: Uint16Array): [number, boolean] => {
      const limit = groups.length;

      for (const i of groups.keys()) {
        // Try to read a trailing embedded IPv4 address. There must be at least
        // two groups left
        if (i < limit - 1) {
          const ipv4 = p.readSeparator(":", i, (p) => p.readIPv4Address());
          if (isIPv4Tuple(ipv4)) {
            const [one, two, three, four] = ipv4;
            groups[i + 0] = u16FromBytes([one, two]);
            groups[i + 1] = u16FromBytes([three, four]);
            return [i + 2, true];
          }
        }

        const group = p.readSeparator(":", i, (p) => p.readNumber(16, 4, true));

        if (typeof group !== "undefined") {
          groups[i] = group;
        } else {
          return [i, false];
        }
      }

      return [groups.length, false];
    };

    return this.readAtomically((p) => {
      // Read the front part of the address; either the whole thing, or up
      // to the first ::
      const head = new Uint16Array(8);
      const [headSize, headIPv4] = readGroups(p, head);

      if (headSize === 8) {
        return head;
      }

      // IPv4 part is not allowed before `::`
      if (headIPv4) {
        return;
      }

      // Read `::` if previous code parsed less than 8 groups.
      // `::` indicates one or more groups of 16 bits of zeros.
      if (typeof p.readGivenChar(":") === "undefined") {
        return;
      }
      if (typeof p.readGivenChar(":") === "undefined") {
        return;
      }

      // Read the back part of the address. The :: must contain at least one
      // set of zeroes, so our max length is 7.
      const tail = new Uint16Array(7);
      const limit = 8 - (headSize + 1);
      const [tailSize, _] = readGroups(p, tail.subarray(0, limit));

      head.set(tail.slice(0, tailSize), 8 - tailSize);

      return head;
    });
  }

  readPort() {
    return this.readAtomically((p) => {
      if (typeof p.readGivenChar(":") !== "undefined") {
        return p.readNumber(10, undefined, true);
      }
    });
  }

  readScopeId() {
    return this.readAtomically((p) => {
      if (typeof p.readGivenChar("%") !== "undefined") {
        return p.readNumber(10, undefined, true);
      }
    });
  }
}

const IPV4_BROADCAST = u32FromBytes([255, 255, 255, 255]);

function isGlobalIPv4(
  s: unknown,
  proxies: ReadonlyArray<string | CIDR> | null | undefined,
): s is string {
  if (typeof s !== "string") {
    return false;
  }

  const parser = new Parser(s);
  const octets = parser.readIPv4Address();

  if (!isIPv4Tuple(octets)) {
    return false;
  }

  if (isTrustedProxy(s, octets, proxies)) {
    return false;
  }

  // Rust doesn't check the remaining state when parsing an IPv4. However, we
  // want to ensure we have exactly an IP (with optionally a port), so we parse
  // it and then check remaining parser state.
  parser.readPort();
  if (parser.state.length !== 0) {
    return false;
  }

  // "This network"
  if (octets[0] === 0) {
    return false;
  }

  // Private IPv4 address ranges
  if (octets[0] === 10) {
    return false;
  }
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return false;
  }
  if (octets[0] === 192 && octets[1] === 168) {
    return false;
  }

  // Loopback address
  if (octets[0] === 127) {
    return false;
  }

  // Shared range
  if (octets[0] === 100 && (octets[1] & 0b1100_0000) === 0b0100_0000) {
    return false;
  }

  // Link-local range
  if (octets[0] === 169 && octets[1] === 254) {
    return false;
  }

  // addresses reserved for future protocols (`192.0.0.0/24`)
  if (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) {
    return false;
  }

  // Documentation ranges
  if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) {
    return false;
  }
  if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) {
    return false;
  }
  if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) {
    return false;
  }

  // Benchmarking range
  if (octets[0] === 198 && (octets[1] & 0xfe) === 18) {
    return false;
  }

  const isBroadcast = u32FromBytes(octets) === IPV4_BROADCAST;
  // Reserved range
  if ((octets[0] & 240) === 240 && !isBroadcast) {
    return false;
  }

  // Broadcast address
  if (isBroadcast) {
    return false;
  }

  for (const octet of octets) {
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  return true;
}

function isGlobalIPv6(
  s: unknown,
  proxies: ReadonlyArray<string | CIDR> | null | undefined,
): s is string {
  if (typeof s !== "string") {
    return false;
  }

  const parser = new Parser(s);
  const segments = parser.readIPv6Address();

  if (!isIPv6Tuple(segments)) {
    return false;
  }

  if (isTrustedProxy(s, segments, proxies)) {
    return false;
  }

  // Rust doesn't check the remaining state when parsing an IPv6. However, we
  // want to ensure we have exactly an IP (with optionally a scope id), so we
  // parse it and then check remaining parser state.
  // TODO: We don't support an IPv6 address with a port because that seems to
  // require wrapping the address and scope in `[]`, e.g. `[:ffff%1]:8080`
  parser.readScopeId();
  if (parser.state.length !== 0) {
    return false;
  }

  // Unspecified address
  if (
    segments[0] === 0 &&
    segments[1] === 0 &&
    segments[2] === 0 &&
    segments[3] === 0 &&
    segments[4] === 0 &&
    segments[5] === 0 &&
    segments[6] === 0 &&
    segments[7] === 0
  ) {
    return false;
  }

  // Loopback address
  if (
    segments[0] === 0 &&
    segments[1] === 0 &&
    segments[2] === 0 &&
    segments[3] === 0 &&
    segments[4] === 0 &&
    segments[5] === 0 &&
    segments[6] === 0 &&
    segments[7] === 0x1
  ) {
    return false;
  }

  // IPv4-mapped Address (`::ffff:0:0/96`)
  if (
    segments[0] === 0 &&
    segments[1] === 0 &&
    segments[2] === 0 &&
    segments[3] === 0 &&
    segments[4] === 0 &&
    segments[5] === 0xffff
  ) {
    return false;
  }

  // IPv4-IPv6 Translat. (`64:ff9b:1::/48`)
  if (segments[0] === 0x64 && segments[1] === 0xff9b && segments[2] === 1) {
    return false;
  }

  // Discard-Only Address Block (`100::/64`)
  if (
    segments[0] === 0x100 &&
    segments[1] === 0 &&
    segments[2] === 0 &&
    segments[3] === 0
  ) {
    return false;
  }

  // IETF Protocol Assignments (`2001::/23`)
  if (segments[0] === 0x2001 && segments[1] < 0x200) {
    // Port Control Protocol Anycast (`2001:1::1`)
    if (
      segments[0] === 0x2001 &&
      segments[1] === 1 &&
      segments[2] === 0 &&
      segments[3] === 0 &&
      segments[4] === 0 &&
      segments[5] === 0 &&
      segments[6] === 0 &&
      segments[7] === 1
    ) {
      return true;
    }

    // Traversal Using Relays around NAT Anycast (`2001:1::2`)
    if (
      segments[0] === 0x2001 &&
      segments[1] === 1 &&
      segments[2] === 0 &&
      segments[3] === 0 &&
      segments[4] === 0 &&
      segments[5] === 0 &&
      segments[6] === 0 &&
      segments[7] === 2
    ) {
      return true;
    }

    // AMT (`2001:3::/32`)
    if (segments[0] === 0x2001 && segments[1] === 3) {
      return true;
    }

    // AS112-v6 (`2001:4:112::/48`)
    if (segments[0] === 0x2001 && segments[1] === 4 && segments[2] === 0x112) {
      return true;
    }

    // ORCHIDv2 (`2001:20::/28`)
    if (segments[0] === 0x2001 && segments[1] >= 0x20 && segments[1] <= 0x2f) {
      return true;
    }

    // Benchmarking range (and others)
    return false;
  }

  // Documentation range
  if (segments[0] === 0x2001 && segments[1] === 0xdb8) {
    return false;
  }

  // Unique local range
  if ((segments[0] & 0xfe00) === 0xfc00) {
    return false;
  }

  // Unicast link local range
  if ((segments[0] & 0xffc0) === 0xfe80) {
    return false;
  }

  return true;
}

function isGlobalIP(
  s: unknown,
  proxies: ReadonlyArray<string | CIDR> | null | undefined,
): s is string {
  if (isGlobalIPv4(s, proxies)) {
    return true;
  }

  if (isGlobalIPv6(s, proxies)) {
    return true;
  }

  return false;
}

interface PartialSocket {
  remoteAddress?: string;
}

interface PartialInfo {
  remoteAddress?: string;
}

interface PartialIdentiy {
  sourceIp?: string;
}

interface PartialRequestContext {
  identity?: PartialIdentiy;
}

export type HeaderLike =
  | {
      headers: Headers;
    }
  | {
      headers: Record<string, string | string[] | undefined>;
    };

export type RequestLike = {
  ip?: unknown;

  socket?: PartialSocket | null | undefined;

  info?: PartialInfo | null | undefined;

  requestContext?: PartialRequestContext | null | undefined;
} & HeaderLike;

export type Platform = "cloudflare" | "fly-io" | "vercel" | "render";

export interface Options {
  platform?: Platform | null | undefined;
  proxies?: ReadonlyArray<string | CIDR> | null | undefined;
}

function isHeaders(val: HeaderLike["headers"]): val is Headers {
  return typeof val.get === "function";
}

function getHeader(headers: HeaderLike["headers"], headerKey: string) {
  if (isHeaders(headers)) {
    return headers.get(headerKey);
  } else {
    const headerValue = headers[headerKey];
    if (Array.isArray(headerValue)) {
      return headerValue.join(",");
    } else {
      return headerValue;
    }
  }
}

// Heavily based on https://github.com/pbojinov/request-ip
//
// Licensed: The MIT License (MIT) Copyright (c) 2022 Petar Bojinov -
// petarbojinov+github@gmail.com
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
function findIP(
  request: RequestLike,
  options?: Options | null | undefined,
): string {
  const { platform, proxies } = options || {};
  // Prefer anything available via the platform over headers since headers can
  // be set by users. Only if we don't have an IP available in `request` do we
  // search the `headers`.
  if (isGlobalIP(request.ip, proxies)) {
    return request.ip;
  }

  const socketRemoteAddress = request.socket?.remoteAddress;
  if (isGlobalIP(socketRemoteAddress, proxies)) {
    return socketRemoteAddress;
  }

  const infoRemoteAddress = request.info?.remoteAddress;
  if (isGlobalIP(infoRemoteAddress, proxies)) {
    return infoRemoteAddress;
  }

  // AWS Api Gateway + Lambda
  const requestContextIdentitySourceIP =
    request.requestContext?.identity?.sourceIp;
  if (isGlobalIP(requestContextIdentitySourceIP, proxies)) {
    return requestContextIdentitySourceIP;
  }

  // Validate we have some object for `request.headers`
  if (typeof request.headers !== "object" || request.headers === null) {
    return "";
  }

  // Platform-specific headers should only be accepted when we can determine
  // that we are running on that platform. For example, the `CF-Connecting-IP`
  // header should only be accepted when running on Cloudflare; otherwise, it
  // can be spoofed.

  if (platform === "cloudflare") {
    // CF-Connecting-IPv6: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ipv6
    const cfConnectingIPv6 = getHeader(request.headers, "cf-connecting-ipv6");
    if (isGlobalIPv6(cfConnectingIPv6, proxies)) {
      return cfConnectingIPv6;
    }

    // CF-Connecting-IP: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
    const cfConnectingIP = getHeader(request.headers, "cf-connecting-ip");
    if (isGlobalIP(cfConnectingIP, proxies)) {
      return cfConnectingIP;
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  // Fly.io: https://fly.io/docs/machines/runtime-environment/#fly_app_name
  if (platform === "fly-io") {
    // Fly-Client-IP: https://fly.io/docs/networking/request-headers/#fly-client-ip
    const flyClientIP = getHeader(request.headers, "fly-client-ip");
    if (isGlobalIP(flyClientIP, proxies)) {
      return flyClientIP;
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  if (platform === "vercel") {
    // https://vercel.com/docs/edge-network/headers/request-headers#x-real-ip
    // Also used by `@vercel/functions`, see:
    // https://github.com/vercel/vercel/blob/d7536d52c87712b1b3f83e4b0fd535a1fb7e384c/packages/functions/src/headers.ts#L12
    const xRealIP = getHeader(request.headers, "x-real-ip");
    if (isGlobalIP(xRealIP, proxies)) {
      return xRealIP;
    }

    // https://vercel.com/docs/edge-network/headers/request-headers#x-vercel-forwarded-for
    // By default, it seems this will be 1 address, but they discuss trusted
    // proxy forwarding so we try to parse it like normal. See
    // https://vercel.com/docs/edge-network/headers/request-headers#custom-x-forwarded-for-ip
    const xVercelForwardedFor = getHeader(
      request.headers,
      "x-vercel-forwarded-for",
    );
    const xVercelForwardedForItems = parseXForwardedFor(xVercelForwardedFor);
    // As per MDN X-Forwarded-For Headers documentation at
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
    // We may find more than one IP in the `x-forwarded-for` header. Since the
    // first IP will be closest to the user (and the most likely to be spoofed),
    // we want to iterate tail-to-head so we reverse the list.
    for (const item of xVercelForwardedForItems.reverse()) {
      if (isGlobalIP(item, proxies)) {
        return item;
      }
    }

    // https://vercel.com/docs/edge-network/headers/request-headers#x-forwarded-for
    // By default, it seems this will be 1 address, but they discuss trusted
    // proxy forwarding so we try to parse it like normal. See
    // https://vercel.com/docs/edge-network/headers/request-headers#custom-x-forwarded-for-ip
    const xForwardedFor = getHeader(request.headers, "x-forwarded-for");
    const xForwardedForItems = parseXForwardedFor(xForwardedFor);
    // As per MDN X-Forwarded-For Headers documentation at
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
    // We may find more than one IP in the `x-forwarded-for` header. Since the
    // first IP will be closest to the user (and the most likely to be spoofed),
    // we want to iterate tail-to-head so we reverse the list.
    for (const item of xForwardedForItems.reverse()) {
      if (isGlobalIP(item, proxies)) {
        return item;
      }
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  if (platform === "render") {
    // True-Client-IP: https://community.render.com/t/what-number-of-proxies-sit-in-front-of-an-express-app-deployed-on-render/35981/2
    const trueClientIP = getHeader(request.headers, "true-client-ip");
    if (isGlobalIP(trueClientIP, proxies)) {
      return trueClientIP;
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  // Standard headers used by Amazon EC2, Heroku, and others.
  const xClientIP = getHeader(request.headers, "x-client-ip");
  if (isGlobalIP(xClientIP, proxies)) {
    return xClientIP;
  }

  // Load-balancers (AWS ELB) or proxies.
  const xForwardedFor = getHeader(request.headers, "x-forwarded-for");
  const xForwardedForItems = parseXForwardedFor(xForwardedFor);
  // As per MDN X-Forwarded-For Headers documentation at
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
  // We may find more than one IP in the `x-forwarded-for` header. Since the
  // first IP will be closest to the user (and the most likely to be spoofed),
  // we want to iterate tail-to-head so we reverse the list.
  for (const item of xForwardedForItems.reverse()) {
    if (isGlobalIP(item, proxies)) {
      return item;
    }
  }

  // DigitalOcean.
  // DO-Connecting-IP: https://www.digitalocean.com/community/questions/app-platform-client-ip
  const doConnectingIP = getHeader(request.headers, "do-connecting-ip");
  if (isGlobalIP(doConnectingIP, proxies)) {
    return doConnectingIP;
  }

  // Fastly and Firebase hosting header (When forwared to cloud function)
  // Fastly-Client-IP
  const fastlyClientIP = getHeader(request.headers, "fastly-client-ip");
  if (isGlobalIP(fastlyClientIP, proxies)) {
    return fastlyClientIP;
  }

  // Akamai
  // True-Client-IP
  const trueClientIP = getHeader(request.headers, "true-client-ip");
  if (isGlobalIP(trueClientIP, proxies)) {
    return trueClientIP;
  }

  // Default nginx proxy/fcgi; alternative to x-forwarded-for, used by some proxies
  // X-Real-IP
  const xRealIP = getHeader(request.headers, "x-real-ip");
  if (isGlobalIP(xRealIP, proxies)) {
    return xRealIP;
  }

  // Rackspace LB and Riverbed's Stingray?
  const xClusterClientIP = getHeader(request.headers, "x-cluster-client-ip");
  if (isGlobalIP(xClusterClientIP, proxies)) {
    return xClusterClientIP;
  }

  const xForwarded = getHeader(request.headers, "x-forwarded");
  if (isGlobalIP(xForwarded, proxies)) {
    return xForwarded;
  }

  const forwardedFor = getHeader(request.headers, "forwarded-for");
  if (isGlobalIP(forwardedFor, proxies)) {
    return forwardedFor;
  }

  const forwarded = getHeader(request.headers, "forwarded");
  if (isGlobalIP(forwarded, proxies)) {
    return forwarded;
  }

  // Google Cloud App Engine
  // X-Appengine-User-IP: https://cloud.google.com/appengine/docs/standard/reference/request-headers?tab=node.js
  const xAppEngineUserIP = getHeader(request.headers, "x-appengine-user-ip");
  if (isGlobalIP(xAppEngineUserIP, proxies)) {
    return xAppEngineUserIP;
  }

  return "";
}

export default findIP;
