import assert from "node:assert/strict";
import test from "node:test";
import { parseProxy } from "../index.js";

test("parseProxy", async (t) => {
  await t.test("handles strings proxies without parsing", () => {
    const proxy = parseProxy("127.0.0.1");
    assert.equal(proxy, "127.0.0.1");
  });

  await t.test("parses IPv4 CIDR address", () => {
    const proxy = parseProxy("1.1.1.1/22");
    assert(typeof proxy === "object");
    assert.equal(proxy.type, "v4");
    assert.equal(proxy.parts.length, 4);
    assert.equal(proxy.partSize, 8);
    assert.equal(proxy.bits, 22);
  });

  await t.test(
    "fails to parse IPv4 CIDR address if bits is out of range",
    () => {
      assert.throws(() => {
        parseProxy("103.21.244.0/99");
      }, /invalid CIDR address: incorrect amount of bits/);
    },
  );

  await t.test(
    "fails to parse IPv4 CIDR address if bits is not numeric",
    () => {
      assert.throws(() => {
        parseProxy("103.21.244.0/aa");
      }, /invalid CIDR address: incorrect amount of bits/);
    },
  );

  await t.test(
    "fails to parse IPv4 CIDR address if contains more than one `/`",
    () => {
      assert.throws(() => {
        parseProxy("103.21.244.0/1/2");
      }, /invalid CIDR address: must be exactly 2 parts/);
    },
  );

  await t.test("fails if cannot parse IPv4 address", () => {
    assert.throws(() => {
      parseProxy("103.a.244.0/1");
    }, /invalid CIDR address: could not parse IP address/);
  });

  await t.test("parses IPv6 CIDR address", () => {
    const proxy = parseProxy("2400:cb00::/32");
    assert(typeof proxy === "object");
    assert.equal(proxy.type, "v6");
    assert.equal(proxy.parts.length, 8);
    assert.equal(proxy.partSize, 16);
    assert.equal(proxy.bits, 32);
  });

  await t.test(
    "fails to parse IPv6 CIDR address if bits is out of range",
    () => {
      assert.throws(() => {
        parseProxy("2400:cb00::/256");
      }, /invalid CIDR address: incorrect amount of bits/);
    },
  );

  await t.test(
    "fails to parse IPv6 CIDR address if bits is not numeric",
    () => {
      assert.throws(() => {
        parseProxy("2400:cb00::/aa");
      }, /invalid CIDR address: incorrect amount of bits/);
    },
  );

  await t.test(
    "fails to parse IPv6 CIDR address if bits is not numeric",
    () => {
      assert.throws(() => {
        parseProxy("2400:cb00::/1/2");
      }, /invalid CIDR address: must be exactly 2 parts/);
    },
  );

  await t.test("fails if cannot parse IPv6 address", () => {
    assert.throws(() => {
      parseProxy("2400:cx00::/1");
    }, /invalid CIDR address: could not parse IP address/);
  });
});

test("Cloudflare IPv4 ranges", async (t) => {
  // Cloudflare IPv4 ranges via https://www.cloudflare.com/ips-v4/
  const ipv4Ranges = [
    { cidr: "173.245.48.0/20", ip: [173, 245, 63, 254] },
    { cidr: "103.21.244.0/22", ip: [103, 21, 247, 254] },
    { cidr: "103.22.200.0/22", ip: [103, 22, 203, 254] },
    { cidr: "103.31.4.0/22", ip: [103, 31, 7, 254] },
    { cidr: "141.101.64.0/18", ip: [141, 101, 127, 254] },
    { cidr: "108.162.192.0/18", ip: [108, 162, 255, 254] },
    { cidr: "190.93.240.0/20", ip: [190, 93, 255, 254] },
    { cidr: "188.114.96.0/20", ip: [188, 114, 111, 254] },
    { cidr: "197.234.240.0/22", ip: [197, 234, 243, 254] },
    { cidr: "198.41.128.0/17", ip: [198, 41, 255, 254] },
    { cidr: "162.158.0.0/15", ip: [162, 159, 255, 254] },
    { cidr: "104.16.0.0/13", ip: [104, 23, 255, 254] },
    { cidr: "104.24.0.0/14", ip: [104, 27, 255, 254] },
    { cidr: "172.64.0.0/13", ip: [172, 71, 255, 254] },
    { cidr: "131.0.72.0/22", ip: [131, 0, 75, 254] },
  ];

  for (const { cidr, ip } of ipv4Ranges) {
    const readableIP = ip.join(".");
    await t.test(`knows ${readableIP} is in ${cidr} range`, () => {
      const proxy = parseProxy(cidr);
      assert(typeof proxy === "object");
      assert.equal(proxy.contains(ip), true);
    });
  }
});

test("Cloudflare IPv6 ranges", async (t) => {
  // Cloudflare IPv6 ranges via https://www.cloudflare.com/ips-v6/
  const ipv6Ranges = [
    {
      cidr: "2400:cb00::/32",
      ip: [0x2400, 0xcb00, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
    {
      cidr: "2606:4700::/32",
      ip: [0x2606, 0x4700, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
    {
      cidr: "2803:f800::/32",
      ip: [0x2803, 0xf800, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
    {
      cidr: "2405:b500::/32",
      ip: [0x2405, 0xb500, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
    {
      cidr: "2405:8100::/32",
      ip: [0x2405, 0x8100, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
    {
      cidr: "2a06:98c0::/29",
      ip: [0x2a06, 0x98c7, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
    {
      cidr: "2c0f:f248::/32",
      ip: [0x2c0f, 0xf248, 0xffff, 0xffff, 0xffff, 0xffff, 0xffff, 0xfffe],
    },
  ];

  for (const { cidr, ip } of ipv6Ranges) {
    const readableIP = ip.map((val) => val.toString(16)).join(":");
    await t.test(`knows ${readableIP} is in ${cidr} range`, () => {
      const proxy = parseProxy(cidr);
      assert(typeof proxy === "object");
      assert.equal(proxy.contains(ip), true);
    });
  }
});
