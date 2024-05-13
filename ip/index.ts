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

function isIPv4Tuple(
  octets?: ArrayLike<number>,
): octets is [number, number, number, number] {
  if (typeof octets === "undefined") {
    return false;
  }

  return octets.length === 4;
}

function isIPv6Tuple(
  octets?: ArrayLike<number>,
): octets is [number, number, number, number, number, number, number, number] {
  if (typeof octets === "undefined") {
    return false;
  }

  return octets.length === 8;
}

function u16FromBytes(bytes: [number, number]) {
  const u8 = new Uint8Array(bytes);
  return new Uint16Array(u8.buffer)[0];
}

function u32FromBytes(bytes: [number, number, number, number]) {
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

      let nextCharAsDigit = () => {
        return p.readAtomically((p) => {
          const c = p.readChar();
          if (c) {
            const n = parseInt(c, radix);
            if (!isNaN(n)) {
              return n;
            }
          }
        });
      };

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
            let [one, two, three, four] = ipv4;
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

function isGlobalIPv4(s?: unknown): s is string {
  if (typeof s !== "string") {
    return false;
  }

  const parser = new Parser(s);
  const octets = parser.readIPv4Address();

  if (!isIPv4Tuple(octets)) {
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

  // TODO: Evaluate if we need to allow other IPv4 addresses in development,
  // such as "This network"
  if (process.env["NODE_ENV"] === "production") {
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

function isGlobalIPv6(s?: unknown): s is string {
  if (typeof s !== "string") {
    return false;
  }

  const parser = new Parser(s);
  const segments = parser.readIPv6Address();

  if (!isIPv6Tuple(segments)) {
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

  // TODO: Evaluate if we need to allow other IPv6 addresses in development,
  // such as "Unique local range" or "Unspecified address"
  if (process.env["NODE_ENV"] === "production") {
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

function isGlobalIP(s?: unknown): s is string {
  if (isGlobalIPv4(s)) {
    return true;
  }

  if (isGlobalIPv6(s)) {
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

export interface RequestLike {
  ip?: unknown;

  socket?: PartialSocket;

  info?: PartialInfo;

  requestContext?: PartialRequestContext;
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
function findIP(request: RequestLike, headers: Headers): string {
  if (isGlobalIP(request.ip)) {
    return request.ip;
  }

  // Standard headers used by Amazon EC2, Heroku, and others.
  const xClientIP = headers.get("x-client-ip");
  if (isGlobalIP(xClientIP)) {
    return xClientIP;
  }

  // Load-balancers (AWS ELB) or proxies.
  const xForwardedFor = headers.get("x-forwarded-for");
  const xForwardedForItems = parseXForwardedFor(xForwardedFor);
  // As per MDN X-Forwarded-For Headers documentation at
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
  // We may find more than one IP in the `x-forwarded-for` header. We want to
  // iterate left-to-right, since left-most IP will be closest to the client,
  // and we'll return the first public IP in the list.
  for (const item of xForwardedForItems) {
    if (isGlobalIP(item)) {
      return item;
    }
  }

  // Cloudflare.
  // CF-Connecting-IP: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
  const cfConnectingIP = headers.get("cf-connecting-ip");
  if (isGlobalIP(cfConnectingIP)) {
    return cfConnectingIP;
  }

  // TODO: CF-Connecting-IPv6: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ipv6

  // DigitalOcean.
  // DO-Connecting-IP: https://www.digitalocean.com/community/questions/app-platform-client-ip
  const doConnectingIP = headers.get("do-connecting-ip");
  if (isGlobalIP(doConnectingIP)) {
    return doConnectingIP;
  }

  // Fastly and Firebase hosting header (When forwared to cloud function)
  // Fastly-Client-IP
  const fastlyClientIP = headers.get("fastly-client-ip");
  if (isGlobalIP(fastlyClientIP)) {
    return fastlyClientIP;
  }

  // Akamai and Cloudflare
  // True-Client-IP
  const trueClientIP = headers.get("true-client-ip");
  if (isGlobalIP(trueClientIP)) {
    return trueClientIP;
  }

  // Fly.io
  // Fly-Client-IP: https://fly.io/docs/networking/request-headers/#fly-client-ip
  const flyClientIP = headers.get("fly-client-ip");
  if (isGlobalIP(flyClientIP)) {
    return flyClientIP;
  }

  // Default nginx proxy/fcgi; alternative to x-forwarded-for, used by some proxies
  // X-Real-IP
  const xRealIP = headers.get("x-real-ip");
  if (isGlobalIP(xRealIP)) {
    return xRealIP;
  }

  // Rackspace LB and Riverbed's Stingray?
  const xClusterClientIP = headers.get("x-cluster-client-ip");
  if (isGlobalIP(xClusterClientIP)) {
    return xClusterClientIP;
  }

  const xForwarded = headers.get("x-forwarded");
  if (isGlobalIP(xForwarded)) {
    return xForwarded;
  }

  const forwardedFor = headers.get("forwarded-for");
  if (isGlobalIP(forwardedFor)) {
    return forwardedFor;
  }

  const forwarded = headers.get("forwarded");
  if (isGlobalIP(forwarded)) {
    return forwarded;
  }

  // Google Cloud App Engine
  // X-Appengine-User-IP: https://cloud.google.com/appengine/docs/standard/reference/request-headers?tab=node.js
  const xAppEngineUserIP = headers.get("x-appengine-user-ip");
  if (isGlobalIP(xAppEngineUserIP)) {
    return xAppEngineUserIP;
  }

  const socketRemoteAddress = request.socket?.remoteAddress;
  if (isGlobalIP(socketRemoteAddress)) {
    return socketRemoteAddress;
  }

  const infoRemoteAddress = request.info?.remoteAddress;
  if (isGlobalIP(infoRemoteAddress)) {
    return infoRemoteAddress;
  }

  // AWS Api Gateway + Lambda
  const requestContextIdentitySourceIP =
    request.requestContext?.identity?.sourceIp;
  if (isGlobalIP(requestContextIdentitySourceIP)) {
    return requestContextIdentitySourceIP;
  }

  // Cloudflare fallback
  // Cf-Pseudo-IPv4: https://blog.cloudflare.com/eliminating-the-last-reasons-to-not-enable-ipv6/#introducingpseudoipv4
  const cfPseudoIPv4 = headers.get("cf-pseudo-ipv4");
  if (isGlobalIP(cfPseudoIPv4)) {
    return cfPseudoIPv4;
  }

  return "";
}

export default findIP;
