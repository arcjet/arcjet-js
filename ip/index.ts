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

type Ipv4Tuple = [number, number, number, number];
type Ipv6Tuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function isIpv4Cidr(cidr: unknown): cidr is Ipv4Cidr {
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

function isIpv6Cidr(cidr: unknown): cidr is Ipv6Cidr {
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
  proxies?: ReadonlyArray<string | Cidr> | null | undefined,
) {
  if (Array.isArray(proxies) && proxies.length > 0) {
    return proxies.some((proxy) => {
      if (typeof proxy === "string") {
        return proxy === ip;
      }
      if (isIpv4Tuple(segments) && isIpv4Cidr(proxy)) {
        return proxy.contains(segments);
      }
      if (isIpv6Tuple(segments) && isIpv6Cidr(proxy)) {
        return proxy.contains(segments);
      }
      return false;
    });
  }

  return false;
}

/**
 * Check whether `left` matches any of the given `right`.
 *
 * @param left
 *   IPv4 or IPv6 address (required).
 * @param right
 *   IPs and CIDR ranges (required).
 * @returns
 *   Whether `left` matches `right`.
 */
export function matches(
  left: string,
  right: ReadonlyArray<Cidr | string> | Cidr | string,
) {
  if (!Array.isArray(right)) {
    // Cast to array for `ReadonlyArray`.
    right = [right as Cidr | string];
  }

  const parser = new Parser(left);
  let leftSegments: Array<number> | undefined;
  const value = parser.readIpv4Address();

  if (isIpv4Tuple(value)) {
    leftSegments = value;
  } else {
    const value = parser.readIpv6Address();
    if (isIpv6Tuple(value)) {
      leftSegments = value;
    }
  }

  if (leftSegments) {
    for (const value of right) {
      if (
        matchesOne(
          left,
          leftSegments,
          typeof value === "string" ? parseProxy(value) : value,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check whether `left` matches any of the given `right`.
 *
 * @param left
 *   IPv4 or IPv6 address.
 * @param leftSegments
 *   IPv4 or IPv6 address.
 * @param right
 *   IPs and CIDR ranges.
 * @returns
 *   Whether `left` matches `right`.
 */
function matchesOne(
  left: string,
  leftSegments: Array<number>,
  right: Cidr | string,
) {
  if (typeof right === "string") {
    return left === right;
  }

  if (
    (isIpv4Tuple(leftSegments) && isIpv4Cidr(right)) ||
    (isIpv6Tuple(leftSegments) && isIpv6Cidr(right))
  ) {
    return cidrContains(right, leftSegments);
  }

  return false;
}

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
function cidrContains(cidr: Cidr, ip: number[]): boolean {
  let part = 0;
  let shift;
  let cidrBits = cidr.bits;

  while (cidrBits > 0) {
    shift = cidr.partSize - cidrBits;
    if (shift < 0) {
      shift = 0;
    }

    if (ip[part] >> shift !== cidr.parts[part] >> shift) {
      return false;
    }

    cidrBits -= cidr.partSize;
    part += 1;
  }

  return true;
}

class Ipv4Cidr {
  type = "v4" as const;
  partSize = 8 as const;
  parts: Readonly<Ipv4Tuple>;
  bits: number;

  constructor(parts: Ipv4Tuple, bits: number) {
    this.bits = bits;
    this.parts = parts;
    Object.freeze(this);
  }

  contains(ip: Array<number>): boolean {
    return cidrContains(this, ip);
  }
}

class Ipv6Cidr {
  type = "v6" as const;
  partSize = 16 as const;
  parts: Readonly<Ipv6Tuple>;
  bits: number;

  constructor(parts: Ipv6Tuple, bits: number) {
    this.bits = bits;
    this.parts = parts;
    Object.freeze(this);
  }

  contains(ip: Array<number>): boolean {
    return cidrContains(this, ip);
  }
}

function parseCidr(cidr: `${string}/${string}`): Cidr {
  // Pre-condition: `cidr` has be verified to have at least one `/`

  const cidrParts = cidr.split("/");
  if (cidrParts.length !== 2) {
    throw new Error("invalid CIDR address: must be exactly 2 parts");
  }

  const parser = new Parser(cidrParts[0]);
  const maybeIpv4 = parser.readIpv4Address();
  if (isIpv4Tuple(maybeIpv4)) {
    const bits = parseInt(cidrParts[1], 10);
    if (isNaN(bits) || bits < 0 || bits > 32) {
      throw new Error("invalid CIDR address: incorrect amount of bits");
    }

    return new Ipv4Cidr(maybeIpv4, bits);
  }

  const maybeIpv6 = parser.readIpv6Address();
  if (isIpv6Tuple(maybeIpv6)) {
    const bits = parseInt(cidrParts[1], 10);
    if (isNaN(bits) || bits < 0 || bits > 128) {
      throw new Error("invalid CIDR address: incorrect amount of bits");
    }

    return new Ipv6Cidr(maybeIpv6, bits);
  }

  throw new Error("invalid CIDR address: could not parse IP address");
}

function isCidr(address: string): address is `${string}/${string}` {
  return address.includes("/");
}

/**
 * Parse CIDR addresses and keep non-CIDR IP addresses.
 *
 * @param value
 *   Value to parse.
 * @returns
 *   Parsed CIDR or given `value`.
 */
export function parseProxy(value: string): string | Cidr {
  if (isCidr(value)) {
    return parseCidr(value);
  } else {
    return value;
  }
}

function isIpv4Tuple(segements?: ArrayLike<number>): segements is Ipv4Tuple {
  if (typeof segements === "undefined") {
    return false;
  }

  return segements.length === 4;
}

function isIpv6Tuple(segements?: ArrayLike<number>): segements is Ipv6Tuple {
  if (typeof segements === "undefined") {
    return false;
  }

  return segements.length === 8;
}

function u16FromBytes(bytes: [number, number]) {
  const u8 = new Uint8Array(bytes);
  return new Uint16Array(u8.buffer)[0];
}

function u32FromBytes(bytes: Ipv4Tuple) {
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
    maxDigits?: number | undefined,
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

  readIpv4Address(): number[] | undefined {
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

  readIpv6Address(): Uint16Array | undefined {
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
          const ipv4 = p.readSeparator(":", i, (p) => p.readIpv4Address());
          if (isIpv4Tuple(ipv4)) {
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
      const [headSize, headIpv4] = readGroups(p, head);

      if (headSize === 8) {
        return head;
      }

      // IPv4 part is not allowed before `::`
      if (headIpv4) {
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

function isGlobalIpv4(
  s: unknown,
  proxies: ReadonlyArray<string | Cidr> | null | undefined,
): s is string {
  if (typeof s !== "string") {
    return false;
  }

  const parser = new Parser(s);
  const octets = parser.readIpv4Address();

  if (!isIpv4Tuple(octets)) {
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

function isGlobalIpv6(
  s: unknown,
  proxies: ReadonlyArray<string | Cidr> | null | undefined,
): s is string {
  if (typeof s !== "string") {
    return false;
  }

  const parser = new Parser(s);
  const segments = parser.readIpv6Address();

  if (!isIpv6Tuple(segments)) {
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

function isGlobalIp(
  s: unknown,
  proxies: ReadonlyArray<string | Cidr> | null | undefined,
): s is string {
  if (isGlobalIpv4(s, proxies)) {
    return true;
  }

  if (isGlobalIpv6(s, proxies)) {
    return true;
  }

  return false;
}

/**
 * Socket-like interface.
 */
interface PartialSocket {
  remoteAddress?: string | null | undefined;
}

/**
 * Interface that looks like info.
 */
interface PartialInfo {
  remoteAddress?: string | null | undefined;
}

interface PartialIdentiy {
  sourceIp?: string | null | undefined;
}

/**
 * Interface that looks like a request context.
 */
interface PartialRequestContext {
  identity?: PartialIdentiy | null | undefined;
}

/**
 * Interface with `headers`.
 */
export type HeaderLike = {
  /**
   * Headers.
   */
  headers: Headers | Record<string, string[] | string | undefined>;
};

/**
 * Interface that looks like a request,
 * of which `headers` is required and several other fields may exist.
 */
export type RequestLike = {
  /**
   * Some platforms pass `info`.
   */
  info?: PartialInfo | null | undefined;
  /**
   * Some platforms such as Cloudflare and Vercel provide `ip` directly on
   * `request`.
   */
  ip?: unknown;
  /**
   * Some platforms pass info in `requestContext`.
   */
  requestContext?: PartialRequestContext | null | undefined;
  /**
   * Some platforms pass a `socket`.
   */
  socket?: PartialSocket | null | undefined;
} & HeaderLike;

/**
 * Platform name.
 */
export type Platform =
  | "cloudflare"
  | "firebase"
  | "fly-io"
  | "render"
  | "vercel";

/**
 * Configuration.
 */
export interface Options {
  /**
   * Platform the code is running on;
   * used to allow only known more trustworthy headers.
   */
  platform?: Platform | null | undefined;
  /**
   * Trusted proxies.
   */
  proxies?: ReadonlyArray<string | Cidr> | null | undefined;
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
export function findIp(
  request: RequestLike,
  options?: Options | null | undefined,
): string {
  const { platform, proxies: rawProxies } = options || {};
  const proxies: Array<Cidr | string> = [];

  if (Array.isArray(rawProxies)) {
    for (const cidrOrIp of rawProxies) {
      if (typeof cidrOrIp === "string") {
        proxies.push(parseProxy(cidrOrIp));
      }

      if (isIpv4Cidr(cidrOrIp) || isIpv6Cidr(cidrOrIp)) {
        proxies.push(cidrOrIp);
      }
    }
  }

  // Prefer anything available via the platform over headers since headers can
  // be set by users. Only if we don't have an IP available in `request` do we
  // search the `headers`.
  if (isGlobalIp(request.ip, proxies)) {
    return request.ip;
  }

  const socketRemoteAddress = request.socket?.remoteAddress;
  if (isGlobalIp(socketRemoteAddress, proxies)) {
    return socketRemoteAddress;
  }

  const infoRemoteAddress = request.info?.remoteAddress;
  if (isGlobalIp(infoRemoteAddress, proxies)) {
    return infoRemoteAddress;
  }

  // AWS Api Gateway + Lambda
  const requestContextIdentitySourceIp =
    request.requestContext?.identity?.sourceIp;
  if (isGlobalIp(requestContextIdentitySourceIp, proxies)) {
    return requestContextIdentitySourceIp;
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
    const cfConnectingIpv6 = getHeader(request.headers, "cf-connecting-ipv6");
    if (isGlobalIpv6(cfConnectingIpv6, proxies)) {
      return cfConnectingIpv6;
    }

    // CF-Connecting-IP: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
    const cfConnectingIp = getHeader(request.headers, "cf-connecting-ip");
    if (isGlobalIp(cfConnectingIp, proxies)) {
      return cfConnectingIp;
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  // Firebase https://github.com/arcjet/arcjet-js/issues/5383
  if (platform === "firebase") {
    const fahClientIp = getHeader(request.headers, "x-fah-client-ip");
    if (isGlobalIp(fahClientIp, proxies)) {
      return fahClientIp;
    }

    // https://cloud.google.com/functions/docs/reference/headers#x-forwarded-for
    // (and https://github.com/arcjet/arcjet-js/issues/5383).
    // The last are probably going to be proxies which have to be filtered with
    // `proxies`.
    const xForwardedFor = getHeader(request.headers, "x-forwarded-for");
    const xForwardedForItems = parseXForwardedFor(xForwardedFor);
    for (const item of xForwardedForItems.reverse()) {
      if (isGlobalIp(item, proxies)) {
        return item;
      }
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  // Fly.io: https://fly.io/docs/machines/runtime-environment/#fly_app_name
  if (platform === "fly-io") {
    // Fly-Client-IP: https://fly.io/docs/networking/request-headers/#fly-client-ip
    const flyClientIp = getHeader(request.headers, "fly-client-ip");
    if (isGlobalIp(flyClientIp, proxies)) {
      return flyClientIp;
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
    const xRealIp = getHeader(request.headers, "x-real-ip");
    if (isGlobalIp(xRealIp, proxies)) {
      return xRealIp;
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
      if (isGlobalIp(item, proxies)) {
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
      if (isGlobalIp(item, proxies)) {
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
    const trueClientIp = getHeader(request.headers, "true-client-ip");
    if (isGlobalIp(trueClientIp, proxies)) {
      return trueClientIp;
    }

    // If we are using a platform check and don't have a Global IP, we exit
    // early with an empty IP since the more generic headers shouldn't be
    // trusted over the platform-specific headers.
    return "";
  }

  // Standard headers used by Amazon EC2, Heroku, and others.
  const xClientIp = getHeader(request.headers, "x-client-ip");
  if (isGlobalIp(xClientIp, proxies)) {
    return xClientIp;
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
    if (isGlobalIp(item, proxies)) {
      return item;
    }
  }

  // DigitalOcean.
  // DO-Connecting-IP: https://www.digitalocean.com/community/questions/app-platform-client-ip
  const doConnectingIp = getHeader(request.headers, "do-connecting-ip");
  if (isGlobalIp(doConnectingIp, proxies)) {
    return doConnectingIp;
  }

  // Fastly and Firebase hosting header (When forwared to cloud function)
  // Fastly-Client-IP
  const fastlyClientIp = getHeader(request.headers, "fastly-client-ip");
  if (isGlobalIp(fastlyClientIp, proxies)) {
    return fastlyClientIp;
  }

  // Akamai
  // True-Client-IP
  const trueClientIp = getHeader(request.headers, "true-client-ip");
  if (isGlobalIp(trueClientIp, proxies)) {
    return trueClientIp;
  }

  // Default nginx proxy/fcgi; alternative to x-forwarded-for, used by some proxies
  // X-Real-IP
  const xRealIp = getHeader(request.headers, "x-real-ip");
  if (isGlobalIp(xRealIp, proxies)) {
    return xRealIp;
  }

  // Rackspace LB and Riverbed's Stingray?
  const xClusterClientIp = getHeader(request.headers, "x-cluster-client-ip");
  if (isGlobalIp(xClusterClientIp, proxies)) {
    return xClusterClientIp;
  }

  const xForwarded = getHeader(request.headers, "x-forwarded");
  if (isGlobalIp(xForwarded, proxies)) {
    return xForwarded;
  }

  const forwardedFor = getHeader(request.headers, "forwarded-for");
  if (isGlobalIp(forwardedFor, proxies)) {
    return forwardedFor;
  }

  const forwarded = getHeader(request.headers, "forwarded");
  if (isGlobalIp(forwarded, proxies)) {
    return forwarded;
  }

  // Google Cloud App Engine
  // X-Appengine-User-IP: https://cloud.google.com/appengine/docs/standard/reference/request-headers?tab=node.js
  const xAppEngineUserIp = getHeader(request.headers, "x-appengine-user-ip");
  if (isGlobalIp(xAppEngineUserIp, proxies)) {
    return xAppEngineUserIp;
  }

  return "";
}

/**
 * One of the CIDR ranges.
 */
export type Cidr = Ipv4Cidr | Ipv6Cidr;

/**
 * Find an IP address.
 *
 * @deprecated
 *   Use the named export `findIp` instead.
 */
export default findIp;
