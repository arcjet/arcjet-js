import assert from "node:assert/strict";
import test from "node:test";
import { cloudflare, findIp, parseProxy, type ProxyService } from "../dist/index.js";

// The real client IP for the customer report lived only in `cf-connecting-ip`
// while every other header carried the Cloudflare edge address.
const CF_EDGE_IPV4 = "162.159.113.135";
const REAL_CLIENT_IPV6 = "2a02:a474:d3aa:0:c52e:6ee1:fe29:80f9";

test("cloudflare", async (t) => {
  await t.test("returns a proxy service descriptor", () => {
    const service = cloudflare();
    assert.equal(service.kind, "service");
    assert.equal(service.name, "cloudflare");
    assert(service.ranges.length > 0);
    assert.deepEqual(
      service.clientIp.map((entry) => entry.header),
      ["cf-connecting-ipv6", "cf-connecting-ip"],
    );
    for (const entry of service.clientIp) {
      assert.equal(entry.format, "ip");
    }
  });

  await t.test("accepts overridden ranges", () => {
    const service = cloudflare({ ranges: ["203.0.113.0/24"] });
    assert.deepEqual(service.ranges, ["203.0.113.0/24"]);
  });

  await t.test("ignores a non-array `ranges` override", () => {
    // @ts-expect-error -- testing runtime robustness against bad input.
    const service = cloudflare({ ranges: "203.0.113.0/24" });
    assert(service.ranges.length > 0);
  });

  await t.test("falls back to defaults for an empty `ranges` override", () => {
    // An empty list would silently disable Cloudflare detection, so it must
    // fall back to the bundled ranges rather than be trusted as-is.
    const service = cloudflare({ ranges: [] });
    assert(service.ranges.length > 0);
  });

  await t.test("ignores `null` options", () => {
    const service = cloudflare(null);
    assert(service.ranges.length > 0);
  });
});

test("findIp with proxy services", async (t) => {
  await t.test(
    "reads the real client IP from `cf-connecting-ip` (Cloudflare in front of Vercel)",
    () => {
      const headers = new Headers([
        ["x-real-ip", CF_EDGE_IPV4],
        ["x-vercel-forwarded-for", CF_EDGE_IPV4],
        ["x-forwarded-for", CF_EDGE_IPV4],
        ["cf-connecting-ip", REAL_CLIENT_IPV6],
      ]);

      assert.equal(
        findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
        REAL_CLIENT_IPV6,
      );
    },
  );

  await t.test("prefers `cf-connecting-ipv6` over `cf-connecting-ip`", () => {
    const headers = new Headers([
      ["x-real-ip", CF_EDGE_IPV4],
      ["cf-connecting-ipv6", REAL_CLIENT_IPV6],
      ["cf-connecting-ip", "8.8.8.8"],
    ]);

    assert.equal(
      findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
      REAL_CLIENT_IPV6,
    );
  });

  await t.test("trims a whitespace-padded `ip` client header", () => {
    const headers = new Headers([
      ["x-real-ip", CF_EDGE_IPV4],
      ["cf-connecting-ip", "  8.8.8.8  "],
    ]);

    assert.equal(
      findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
      "8.8.8.8",
    );
  });

  await t.test("reads an IPv4 client from `cf-connecting-ip`", () => {
    const headers = new Headers([
      ["x-real-ip", CF_EDGE_IPV4],
      ["cf-connecting-ip", "8.8.8.8"],
    ]);

    assert.equal(
      findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
      "8.8.8.8",
    );
  });

  await t.test(
    "does not trust `cf-connecting-ip` when the request is not from Cloudflare (spoofing)",
    () => {
      // An attacker hits Vercel directly. Vercel reports the attacker's real IP
      // in `x-real-ip`; the spoofed `cf-connecting-ip` must be ignored because
      // the hop is not a Cloudflare address.
      const headers = new Headers([
        ["x-real-ip", "8.8.8.8"],
        ["cf-connecting-ip", "9.9.9.9"],
      ]);

      assert.equal(
        findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
        "8.8.8.8",
      );
    },
  );

  await t.test(
    "returns empty when the Cloudflare hop has no usable client IP header",
    () => {
      const headers = new Headers([["x-real-ip", CF_EDGE_IPV4]]);

      assert.equal(
        findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
        "",
      );
    },
  );

  await t.test(
    "skips a Cloudflare hop whose client IP header is itself non-global",
    () => {
      const headers = new Headers([
        ["x-real-ip", CF_EDGE_IPV4],
        ["cf-connecting-ip", "127.0.0.1"],
      ]);

      assert.equal(
        findIp({ headers }, { platform: "vercel", proxies: [cloudflare()] }),
        "",
      );
    },
  );

  await t.test("resolves a service edge found on `request.ip`", () => {
    const headers = new Headers([["cf-connecting-ip", "8.8.4.4"]]);

    assert.equal(
      findIp({ ip: CF_EDGE_IPV4, headers }, { proxies: [cloudflare()] }),
      "8.8.4.4",
    );
  });

  await t.test(
    "returns empty for a service edge on `request.ip` when headers are unusable",
    () => {
      assert.equal(
        findIp(
          // Headers intentionally invalid to exercise the safety guard.
          { ip: CF_EDGE_IPV4, headers: null as unknown as Headers },
          { proxies: [cloudflare()] },
        ),
        "",
      );
    },
  );

  await t.test(
    "supports a service with an `ips` (X-Forwarded-For style) client header and a pre-parsed range",
    () => {
      // A custom service whose range is already a parsed `Cidr` and whose client
      // header is a comma separated list.
      const service: ProxyService = {
        kind: "service",
        name: "example",
        ranges: [parseProxy("8.8.8.0/24")],
        clientIp: [{ header: "x-original-forwarded-for", format: "ips" }],
      };

      const headers = new Headers([
        ["x-forwarded-for", "8.8.8.8"],
        // First entry is a documentation (non-global) range and must be skipped.
        ["x-original-forwarded-for", "203.0.113.1, 1.2.3.4"],
      ]);

      assert.equal(findIp({ headers }, { proxies: [service] }), "1.2.3.4");
    },
  );

  await t.test("ignores `null` entries in `proxies`", () => {
    const headers = new Headers([["x-forwarded-for", "8.8.8.8"]]);

    assert.equal(
      findIp(
        { headers },
        // `null` is not valid per the types but the runtime must tolerate it.
        { proxies: [null as unknown as string, cloudflare()] },
      ),
      "8.8.8.8",
    );
  });
});
