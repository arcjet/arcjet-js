//#region index.js
function parseXForwardedFor(value) {
	if (typeof value !== "string") return [];
	const forwardedIps = [];
	for (const item of value.split(",")) forwardedIps.push(item.trim());
	return forwardedIps;
}
function isIpv4Cidr(cidr) {
	return typeof cidr === "object" && cidr !== null && "type" in cidr && typeof cidr.type === "string" && cidr.type === "v4" && "contains" in cidr && typeof cidr.contains === "function";
}
function isIpv6Cidr(cidr) {
	return typeof cidr === "object" && cidr !== null && "type" in cidr && typeof cidr.type === "string" && cidr.type === "v6" && "contains" in cidr && typeof cidr.contains === "function";
}
function isTrustedProxy(ip, segments, proxies) {
	if (Array.isArray(proxies) && proxies.length > 0) return proxies.some((proxy) => {
		if (typeof proxy === "string") return proxy === ip;
		if (isIpv4Tuple(segments) && isIpv4Cidr(proxy)) return proxy.contains(segments);
		if (isIpv6Tuple(segments) && isIpv6Cidr(proxy)) return proxy.contains(segments);
		return false;
	});
	return false;
}
function cidrContains(cidr, ip) {
	let part = 0;
	let shift;
	let cidrBits = cidr.bits;
	while (cidrBits > 0) {
		shift = cidr.partSize - cidrBits;
		if (shift < 0) shift = 0;
		if (ip[part] >> shift !== cidr.parts[part] >> shift) return false;
		cidrBits -= cidr.partSize;
		part += 1;
	}
	return true;
}
var Ipv4Cidr = class {
	type = "v4";
	partSize = 8;
	parts;
	bits;
	constructor(parts, bits) {
		this.bits = bits;
		this.parts = parts;
		Object.freeze(this);
	}
	contains(ip) {
		return cidrContains(this, ip);
	}
};
var Ipv6Cidr = class {
	type = "v6";
	partSize = 16;
	parts;
	bits;
	constructor(parts, bits) {
		this.bits = bits;
		this.parts = parts;
		Object.freeze(this);
	}
	contains(ip) {
		return cidrContains(this, ip);
	}
};
function parseCidr(cidr) {
	const cidrParts = cidr.split("/");
	if (cidrParts.length !== 2) throw new Error("invalid CIDR address: must be exactly 2 parts");
	const parser = new Parser(cidrParts[0]);
	const maybeIpv4 = parser.readIpv4Address();
	if (isIpv4Tuple(maybeIpv4)) {
		const bits = parseInt(cidrParts[1], 10);
		if (isNaN(bits) || bits < 0 || bits > 32) throw new Error("invalid CIDR address: incorrect amount of bits");
		return new Ipv4Cidr(maybeIpv4, bits);
	}
	const maybeIpv6 = parser.readIpv6Address();
	if (isIpv6Tuple(maybeIpv6)) {
		const bits = parseInt(cidrParts[1], 10);
		if (isNaN(bits) || bits < 0 || bits > 128) throw new Error("invalid CIDR address: incorrect amount of bits");
		return new Ipv6Cidr(maybeIpv6, bits);
	}
	throw new Error("invalid CIDR address: could not parse IP address");
}
function isCidr(address) {
	return address.includes("/");
}
/**
* Parse CIDR addresses and keep non-CIDR IP addresses.
*
* @param value
*   Value to parse.
* @returns
*   Parsed {@linkcode Cidr} if range or given `value` if IP.
*/
function parseProxy(value) {
	if (isCidr(value)) return parseCidr(value);
	else return value;
}
function isIpv4Tuple(segements) {
	if (typeof segements === "undefined") return false;
	return segements.length === 4;
}
function isIpv6Tuple(segements) {
	if (typeof segements === "undefined") return false;
	return segements.length === 8;
}
function u16FromBytes(bytes) {
	const u8 = new Uint8Array(bytes);
	return new Uint16Array(u8.buffer)[0];
}
function u32FromBytes(bytes) {
	const u8 = new Uint8Array(bytes);
	return new Uint32Array(u8.buffer)[0];
}
var Parser = class {
	state;
	constructor(input) {
		this.state = input;
	}
	readAtomically(inner) {
		const state = this.state;
		const result = inner(this);
		if (typeof result === "undefined") this.state = state;
		return result;
	}
	peakChar() {
		return this.state[0];
	}
	readChar() {
		const b = this.state[0];
		this.state = this.state.slice(1);
		return b;
	}
	readGivenChar(target) {
		return this.readAtomically((p) => {
			const c = p.readChar();
			if (c === target) return c;
		});
	}
	readSeparator(sep, index, inner) {
		return this.readAtomically((p) => {
			if (index > 0) {
				if (typeof p.readGivenChar(sep) === "undefined") return;
			}
			return inner(p);
		});
	}
	readNumber(radix, maxDigits, allowZeroPrefix = false) {
		return this.readAtomically((p) => {
			let result = 0;
			let digitCount = 0;
			const hasLeadingZero = p.peakChar() === "0";
			function nextCharAsDigit() {
				return p.readAtomically((p) => {
					const c = p.readChar();
					if (c) {
						const n = parseInt(c, radix);
						if (!isNaN(n)) return n;
					}
				});
			}
			for (let digit = nextCharAsDigit(); digit !== void 0; digit = nextCharAsDigit()) {
				result = result * radix;
				result = result + digit;
				digitCount += 1;
				if (typeof maxDigits !== "undefined") {
					if (digitCount > maxDigits) return;
				}
			}
			if (digitCount === 0) return;
			else if (!allowZeroPrefix && hasLeadingZero && digitCount > 1) return;
			else return result;
		});
	}
	readIpv4Address() {
		return this.readAtomically((p) => {
			const groups = [];
			for (let idx = 0; idx < 4; idx++) {
				const result = p.readSeparator(".", idx, (p) => {
					return p.readNumber(10, 3, false);
				});
				if (result === void 0) return;
				else groups.push(result);
			}
			return groups;
		});
	}
	readIpv6Address() {
		const readGroups = (p, groups) => {
			const limit = groups.length;
			for (const i of groups.keys()) {
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
				if (typeof group !== "undefined") groups[i] = group;
				else return [i, false];
			}
			return [groups.length, false];
		};
		return this.readAtomically((p) => {
			const head = new Uint16Array(8);
			const [headSize, headIpv4] = readGroups(p, head);
			if (headSize === 8) return head;
			if (headIpv4) return;
			if (typeof p.readGivenChar(":") === "undefined") return;
			if (typeof p.readGivenChar(":") === "undefined") return;
			const tail = new Uint16Array(7);
			const limit = 8 - (headSize + 1);
			const [tailSize, _] = readGroups(p, tail.subarray(0, limit));
			head.set(tail.slice(0, tailSize), 8 - tailSize);
			return head;
		});
	}
	readPort() {
		return this.readAtomically((p) => {
			if (typeof p.readGivenChar(":") !== "undefined") return p.readNumber(10, void 0, true);
		});
	}
	readScopeId() {
		return this.readAtomically((p) => {
			if (typeof p.readGivenChar("%") !== "undefined") return p.readNumber(10, void 0, true);
		});
	}
};
const IPV4_BROADCAST = u32FromBytes([
	255,
	255,
	255,
	255
]);
function isGlobalIpv4(s, proxies) {
	if (typeof s !== "string") return false;
	const parser = new Parser(s);
	const octets = parser.readIpv4Address();
	if (!isIpv4Tuple(octets)) return false;
	if (isTrustedProxy(s, octets, proxies)) return false;
	parser.readPort();
	if (parser.state.length !== 0) return false;
	if (octets[0] === 0) return false;
	if (octets[0] === 10) return false;
	if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;
	if (octets[0] === 192 && octets[1] === 168) return false;
	if (octets[0] === 127) return false;
	if (octets[0] === 100 && (octets[1] & 192) === 64) return false;
	if (octets[0] === 169 && octets[1] === 254) return false;
	if (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) return false;
	if (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) return false;
	if (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) return false;
	if (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) return false;
	if (octets[0] === 198 && (octets[1] & 254) === 18) return false;
	const isBroadcast = u32FromBytes(octets) === IPV4_BROADCAST;
	if ((octets[0] & 240) === 240 && !isBroadcast) return false;
	if (isBroadcast) return false;
	for (const octet of octets) if (octet < 0 || octet > 255) return false;
	return true;
}
function isGlobalIpv6(s, proxies) {
	if (typeof s !== "string") return false;
	const parser = new Parser(s);
	const segments = parser.readIpv6Address();
	if (!isIpv6Tuple(segments)) return false;
	if (isTrustedProxy(s, segments, proxies)) return false;
	parser.readScopeId();
	if (parser.state.length !== 0) return false;
	if (segments[0] === 0 && segments[1] === 0 && segments[2] === 0 && segments[3] === 0 && segments[4] === 0 && segments[5] === 0 && segments[6] === 0 && segments[7] === 0) return false;
	if (segments[0] === 0 && segments[1] === 0 && segments[2] === 0 && segments[3] === 0 && segments[4] === 0 && segments[5] === 0 && segments[6] === 0 && segments[7] === 1) return false;
	if (segments[0] === 0 && segments[1] === 0 && segments[2] === 0 && segments[3] === 0 && segments[4] === 0 && segments[5] === 65535) return false;
	if (segments[0] === 100 && segments[1] === 65435 && segments[2] === 1) return false;
	if (segments[0] === 256 && segments[1] === 0 && segments[2] === 0 && segments[3] === 0) return false;
	if (segments[0] === 8193 && segments[1] < 512) {
		if (segments[0] === 8193 && segments[1] === 1 && segments[2] === 0 && segments[3] === 0 && segments[4] === 0 && segments[5] === 0 && segments[6] === 0 && segments[7] === 1) return true;
		if (segments[0] === 8193 && segments[1] === 1 && segments[2] === 0 && segments[3] === 0 && segments[4] === 0 && segments[5] === 0 && segments[6] === 0 && segments[7] === 2) return true;
		if (segments[0] === 8193 && segments[1] === 3) return true;
		if (segments[0] === 8193 && segments[1] === 4 && segments[2] === 274) return true;
		if (segments[0] === 8193 && segments[1] >= 32 && segments[1] <= 47) return true;
		return false;
	}
	if (segments[0] === 8193 && segments[1] === 3512) return false;
	if ((segments[0] & 65024) === 64512) return false;
	if ((segments[0] & 65472) === 65152) return false;
	return true;
}
function isGlobalIp(s, proxies) {
	if (isGlobalIpv4(s, proxies)) return true;
	if (isGlobalIpv6(s, proxies)) return true;
	return false;
}
function isHeaders(val) {
	return typeof val.get === "function";
}
function getHeader(headers, headerKey) {
	if (isHeaders(headers)) return headers.get(headerKey);
	else {
		const headerValue = headers[headerKey];
		if (Array.isArray(headerValue)) return headerValue.join(",");
		else return headerValue;
	}
}
/**
* Find a client IP address on a request-like object.
*
* @param request
*   Request-like object.
* @param [options]
*   Configuration (optional).
* @returns
*   Found IP address; empty string if not found.
*/
function findIp(request, options) {
	const { platform, proxies: rawProxies } = options || {};
	const proxies = [];
	if (Array.isArray(rawProxies)) for (const cidrOrIp of rawProxies) {
		if (typeof cidrOrIp === "string") proxies.push(parseProxy(cidrOrIp));
		if (isIpv4Cidr(cidrOrIp) || isIpv6Cidr(cidrOrIp)) proxies.push(cidrOrIp);
	}
	if (isGlobalIp(request.ip, proxies)) return request.ip;
	const socketRemoteAddress = request.socket?.remoteAddress;
	if (isGlobalIp(socketRemoteAddress, proxies)) return socketRemoteAddress;
	const infoRemoteAddress = request.info?.remoteAddress;
	if (isGlobalIp(infoRemoteAddress, proxies)) return infoRemoteAddress;
	const requestContextIdentitySourceIp = request.requestContext?.identity?.sourceIp;
	if (isGlobalIp(requestContextIdentitySourceIp, proxies)) return requestContextIdentitySourceIp;
	if (typeof request.headers !== "object" || request.headers === null) return "";
	if (platform === "cloudflare") {
		const cfConnectingIpv6 = getHeader(request.headers, "cf-connecting-ipv6");
		if (isGlobalIpv6(cfConnectingIpv6, proxies)) return cfConnectingIpv6;
		const cfConnectingIp = getHeader(request.headers, "cf-connecting-ip");
		if (isGlobalIp(cfConnectingIp, proxies)) return cfConnectingIp;
		return "";
	}
	if (platform === "firebase") {
		const fahClientIp = getHeader(request.headers, "x-fah-client-ip");
		if (isGlobalIp(fahClientIp, proxies)) return fahClientIp;
		const xForwardedForItems = parseXForwardedFor(getHeader(request.headers, "x-forwarded-for"));
		for (const item of xForwardedForItems.reverse()) if (isGlobalIp(item, proxies)) return item;
		return "";
	}
	if (platform === "fly-io") {
		const flyClientIp = getHeader(request.headers, "fly-client-ip");
		if (isGlobalIp(flyClientIp, proxies)) return flyClientIp;
		return "";
	}
	if (platform === "vercel") {
		const xRealIp = getHeader(request.headers, "x-real-ip");
		if (isGlobalIp(xRealIp, proxies)) return xRealIp;
		const xVercelForwardedForItems = parseXForwardedFor(getHeader(request.headers, "x-vercel-forwarded-for"));
		for (const item of xVercelForwardedForItems.reverse()) if (isGlobalIp(item, proxies)) return item;
		const xForwardedForItems = parseXForwardedFor(getHeader(request.headers, "x-forwarded-for"));
		for (const item of xForwardedForItems.reverse()) if (isGlobalIp(item, proxies)) return item;
		return "";
	}
	if (platform === "render") {
		const trueClientIp = getHeader(request.headers, "true-client-ip");
		if (isGlobalIp(trueClientIp, proxies)) return trueClientIp;
		return "";
	}
	const xForwardedForItems = parseXForwardedFor(getHeader(request.headers, "x-forwarded-for"));
	for (const item of xForwardedForItems.reverse()) if (isGlobalIp(item, proxies)) return item;
	const xClientIp = getHeader(request.headers, "x-client-ip");
	if (isGlobalIp(xClientIp, proxies)) return xClientIp;
	const doConnectingIp = getHeader(request.headers, "do-connecting-ip");
	if (isGlobalIp(doConnectingIp, proxies)) return doConnectingIp;
	const fastlyClientIp = getHeader(request.headers, "fastly-client-ip");
	if (isGlobalIp(fastlyClientIp, proxies)) return fastlyClientIp;
	const trueClientIp = getHeader(request.headers, "true-client-ip");
	if (isGlobalIp(trueClientIp, proxies)) return trueClientIp;
	const xRealIp = getHeader(request.headers, "x-real-ip");
	if (isGlobalIp(xRealIp, proxies)) return xRealIp;
	const xClusterClientIp = getHeader(request.headers, "x-cluster-client-ip");
	if (isGlobalIp(xClusterClientIp, proxies)) return xClusterClientIp;
	const xForwarded = getHeader(request.headers, "x-forwarded");
	if (isGlobalIp(xForwarded, proxies)) return xForwarded;
	const forwardedFor = getHeader(request.headers, "forwarded-for");
	if (isGlobalIp(forwardedFor, proxies)) return forwardedFor;
	const forwarded = getHeader(request.headers, "forwarded");
	if (isGlobalIp(forwarded, proxies)) return forwarded;
	const xAppEngineUserIp = getHeader(request.headers, "x-appengine-user-ip");
	if (isGlobalIp(xAppEngineUserIp, proxies)) return xAppEngineUserIp;
	return "";
}
//#endregion
export { findIp as default, findIp, parseProxy };
