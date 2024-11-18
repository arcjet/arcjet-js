import assert from "node:assert";
import { describe, it } from "node:test";

import nosecone, {
  createContentSecurityPolicy,
  createContentTypeOptions,
  createCrossOriginEmbedderPolicy,
  createCrossOriginOpenerPolicy,
  createCrossOriginResourcePolicy,
  createDnsPrefetchControl,
  createDownloadOptions,
  createFrameOptions,
  createOriginAgentCluster,
  createPermittedCrossDomainPolicies,
  createReferrerPolicy,
  createStrictTransportSecurity,
  createXssProtection,
  NoseconeValidationError,
} from "../index";

describe("nosecone", () => {
  describe("NoseconeValidationError", () => {
    it("prefixes the error", () => {
      const err = new NoseconeValidationError("test");
      assert(err.message.startsWith("validation error:"));
    });
  });

  describe("createContentSecurityPolicy", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createContentSecurityPolicy();
      assert.deepStrictEqual(policy, [
        "content-security-policy",
        "base-uri 'none'; child-src 'none'; connect-src 'self'; default-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' blob: data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; upgrade-insecure-requests;",
      ]);
    });

    it("uses default directive if none provided", () => {
      const policy = createContentSecurityPolicy({});
      assert.deepStrictEqual(policy, [
        "content-security-policy",
        "base-uri 'none'; child-src 'none'; connect-src 'self'; default-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' blob: data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; upgrade-insecure-requests;",
      ]);
    });

    it("builds the header with options", () => {
      const policy = createContentSecurityPolicy({
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
        },
      });
      assert.deepStrictEqual(policy, [
        "content-security-policy",
        "default-src 'none'; script-src 'none'; style-src 'none';",
      ]);
    });

    it("resolve functions in directives", () => {
      const policy = createContentSecurityPolicy({
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [() => "'nonce-123456'", "'strict-dynamic'"],
          styleSrc: ["'self'"],
        },
      });
      assert.deepStrictEqual(policy, [
        "content-security-policy",
        "default-src 'self'; script-src 'nonce-123456' 'strict-dynamic'; style-src 'self';",
      ]);
    });

    it("throws if provided an unsupported directive", () => {
      assert.throws(
        () => {
          createContentSecurityPolicy({
            directives: {
              // @ts-expect-error
              invalid: "directive",
            },
          });
        },
        {
          message:
            "validation error: invalid is not a Content-Security-Policy directive",
        },
      );
    });

    it("throws if provided an unquoted value", () => {
      assert.throws(
        () => {
          createContentSecurityPolicy({
            directives: {
              // @ts-expect-error
              defaultSrc: ["self"],
            },
          });
        },
        {
          message: `validation error: "self" must be quoted using single-quotes, e.g. "'self'"`,
        },
      );
    });

    it("throws if provided an invalid sandbox value", () => {
      assert.throws(
        () => {
          createContentSecurityPolicy({
            directives: {
              // @ts-expect-error
              sandbox: ["invalid"],
            },
          });
        },
        {
          message:
            "validation error: invalid sandbox value in Content-Security-Policy",
        },
      );
    });

    it("skips falsey values", () => {
      const policy = createContentSecurityPolicy({
        directives: {
          defaultSrc: false,
          scriptSrc: null,
          styleSrc: undefined,
        },
      });
      assert.deepStrictEqual(policy, ["content-security-policy", ""]);
    });
  });

  describe("createCrossOriginEmbedderPolicy", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createCrossOriginEmbedderPolicy();
      assert.deepStrictEqual(policy, [
        "cross-origin-embedder-policy",
        "require-corp",
      ]);
    });

    it("uses default policy if none provided", () => {
      const policy = createCrossOriginEmbedderPolicy({});
      assert.deepStrictEqual(policy, [
        "cross-origin-embedder-policy",
        "require-corp",
      ]);
    });

    it("builds the header with options", () => {
      const policy = createCrossOriginEmbedderPolicy({
        policy: "credentialless",
      });
      assert.deepStrictEqual(policy, [
        "cross-origin-embedder-policy",
        "credentialless",
      ]);
    });

    it("throws if provided an invalid policy", () => {
      assert.throws(
        () => {
          createCrossOriginEmbedderPolicy({
            // @ts-expect-error
            policy: "invalid",
          });
        },
        {
          message:
            "validation error: invalid value for Cross-Origin-Embedder-Policy",
        },
      );
    });
  });

  describe("createCrossOriginOpenerPolicy", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createCrossOriginOpenerPolicy();
      assert.deepStrictEqual(policy, [
        "cross-origin-opener-policy",
        "same-origin",
      ]);
    });

    it("uses default policy if none provided", () => {
      const policy = createCrossOriginOpenerPolicy({});
      assert.deepStrictEqual(policy, [
        "cross-origin-opener-policy",
        "same-origin",
      ]);
    });

    it("builds the header with options", () => {
      const policy = createCrossOriginOpenerPolicy({
        policy: "same-origin-allow-popups",
      });
      assert.deepStrictEqual(policy, [
        "cross-origin-opener-policy",
        "same-origin-allow-popups",
      ]);
    });

    it("throws if provided an invalid policy", () => {
      assert.throws(
        () => {
          createCrossOriginOpenerPolicy({
            // @ts-expect-error
            policy: "invalid",
          });
        },
        {
          message:
            "validation error: invalid value for Cross-Origin-Opener-Policy",
        },
      );
    });
  });

  describe("createCrossOriginResourcePolicy", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createCrossOriginResourcePolicy();
      assert.deepStrictEqual(policy, [
        "cross-origin-resource-policy",
        "same-origin",
      ]);
    });

    it("uses default policy if none provided", () => {
      const policy = createCrossOriginResourcePolicy({});
      assert.deepStrictEqual(policy, [
        "cross-origin-resource-policy",
        "same-origin",
      ]);
    });

    it("builds the header with options", () => {
      const policy = createCrossOriginResourcePolicy({
        policy: "cross-origin",
      });
      assert.deepStrictEqual(policy, [
        "cross-origin-resource-policy",
        "cross-origin",
      ]);
    });

    it("throws if provided an invalid policy", () => {
      assert.throws(
        () => {
          createCrossOriginResourcePolicy({
            // @ts-expect-error
            policy: "invalid",
          });
        },
        {
          message:
            "validation error: invalid value for Cross-Origin-Resource-Policy",
        },
      );
    });
  });

  describe("createOriginAgentCluster", () => {
    it("builds the header", () => {
      const policy = createOriginAgentCluster();
      assert.deepStrictEqual(policy, ["origin-agent-cluster", "?1"]);
    });
  });

  describe("createReferrerPolicy", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createReferrerPolicy();
      assert.deepStrictEqual(policy, ["referrer-policy", "no-referrer"]);
    });

    it("uses default policy if none provided", () => {
      const policy = createReferrerPolicy({});
      assert.deepStrictEqual(policy, ["referrer-policy", "no-referrer"]);
    });

    it("builds the header with options", () => {
      const policy = createReferrerPolicy({
        policy: ["origin-when-cross-origin", "no-referrer-when-downgrade"],
      });
      assert.deepStrictEqual(policy, [
        "referrer-policy",
        "origin-when-cross-origin,no-referrer-when-downgrade",
      ]);
    });

    it("throws if provided policy is not array", () => {
      assert.throws(
        () => {
          createReferrerPolicy({
            // @ts-expect-error
            policy: "invalid",
          });
        },
        {
          message: "validation error: must provide array for Referrer-Policy",
        },
      );
    });

    it("throws if provided policy is empty", () => {
      assert.throws(
        () => {
          createReferrerPolicy({
            policy: [],
          });
        },
        {
          message:
            "validation error: must provide at least one policy for Referrer-Policy",
        },
      );
    });

    it("throws if provided invalid policy", () => {
      assert.throws(
        () => {
          createReferrerPolicy({
            policy: [
              // @ts-expect-error
              "invalid",
            ],
          });
        },
        {
          message: "validation error: invalid value for Referrer-Policy",
        },
      );
    });
  });

  describe("createStrictTransportSecurity", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createStrictTransportSecurity();
      assert.deepStrictEqual(policy, [
        "strict-transport-security",
        "max-age=31536000; includeSubDomains",
      ]);
    });

    it("uses default policy if none provided", () => {
      const policy = createStrictTransportSecurity({});
      assert.deepStrictEqual(policy, [
        "strict-transport-security",
        "max-age=31536000; includeSubDomains",
      ]);
    });

    it("builds the header with options", () => {
      const policy = createStrictTransportSecurity({
        maxAge: 10,
        includeSubDomains: false,
        preload: true,
      });
      assert.deepStrictEqual(policy, [
        "strict-transport-security",
        "max-age=10; preload",
      ]);
    });

    it("can disable includeSubDomains and preload", () => {
      const policy = createStrictTransportSecurity({
        includeSubDomains: false,
        preload: false,
      });
      assert.deepStrictEqual(policy, [
        "strict-transport-security",
        "max-age=31536000",
      ]);
    });

    it("rounds maxAge down if decimal", () => {
      const policy = createStrictTransportSecurity({
        maxAge: 100.22,
      });
      assert.deepStrictEqual(policy, [
        "strict-transport-security",
        "max-age=100; includeSubDomains",
      ]);
    });

    it("throws if maxAge is not finite", () => {
      assert.throws(
        () => {
          createStrictTransportSecurity({
            maxAge: Infinity,
          });
        },
        {
          message:
            "validation error: must provide a finite, positive integer for the maxAge of Strict-Transport-Security",
        },
      );
    });

    it("throws if maxAge is negative", () => {
      assert.throws(
        () => {
          createStrictTransportSecurity({
            maxAge: -1,
          });
        },
        {
          message:
            "validation error: must provide a finite, positive integer for the maxAge of Strict-Transport-Security",
        },
      );
    });
  });

  describe("createContentTypeOptions", () => {
    it("builds the header", () => {
      const policy = createContentTypeOptions();
      assert.deepStrictEqual(policy, ["x-content-type-options", "nosniff"]);
    });
  });

  describe("createDnsPrefetchControl", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createDnsPrefetchControl();
      assert.deepStrictEqual(policy, ["x-dns-prefetch-control", "off"]);
    });

    it("uses default policy if none provided", () => {
      const policy = createDnsPrefetchControl({});
      assert.deepStrictEqual(policy, ["x-dns-prefetch-control", "off"]);
    });

    it("builds the header with options", () => {
      const policy = createDnsPrefetchControl({
        allow: true,
      });
      assert.deepStrictEqual(policy, ["x-dns-prefetch-control", "on"]);
    });
  });

  describe("createDownloadOptions", () => {
    it("builds the header", () => {
      const policy = createDownloadOptions();
      assert.deepStrictEqual(policy, ["x-download-options", "noopen"]);
    });
  });

  describe("createFrameOptions", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createFrameOptions();
      assert.deepStrictEqual(policy, ["x-frame-options", "SAMEORIGIN"]);
    });

    it("uses default policy if none provided", () => {
      const policy = createFrameOptions({});
      assert.deepStrictEqual(policy, ["x-frame-options", "SAMEORIGIN"]);
    });

    it("builds the header with options", () => {
      const policy = createFrameOptions({
        action: "deny",
      });
      assert.deepStrictEqual(policy, ["x-frame-options", "DENY"]);
    });

    it("throws if action is not string", () => {
      assert.throws(
        () => {
          createFrameOptions({
            // @ts-expect-error
            action: 12345,
          });
        },
        {
          message: "validation error: invalid value for X-Frame-Options",
        },
      );
    });

    it("throws if action is not valid", () => {
      assert.throws(
        () => {
          createFrameOptions({
            // @ts-expect-error
            action: "invalid",
          });
        },
        {
          message: "validation error: invalid value for X-Frame-Options",
        },
      );
    });
  });

  describe("createPermittedCrossDomainPolicies", () => {
    it("uses default configuration if no options provided", () => {
      const policy = createPermittedCrossDomainPolicies();
      assert.deepStrictEqual(policy, [
        "x-permitted-cross-domain-policies",
        "none",
      ]);
    });

    it("uses default policy if none provided", () => {
      const policy = createPermittedCrossDomainPolicies({});
      assert.deepStrictEqual(policy, [
        "x-permitted-cross-domain-policies",
        "none",
      ]);
    });

    it("builds the header with options", () => {
      const policy = createPermittedCrossDomainPolicies({
        permittedPolicies: "master-only",
      });
      assert.deepStrictEqual(policy, [
        "x-permitted-cross-domain-policies",
        "master-only",
      ]);
    });

    it("throws if provided an invalid permittedPolicies", () => {
      assert.throws(
        () => {
          createPermittedCrossDomainPolicies({
            // @ts-expect-error
            permittedPolicies: "invalid",
          });
        },
        {
          message:
            "validation error: invalid value for X-Permitted-Cross-Domain-Policies",
        },
      );
    });
  });

  describe("createXssProtection", () => {
    it("builds the header", () => {
      const policy = createXssProtection();
      assert.deepStrictEqual(policy, ["x-xss-protection", "0"]);
    });
  });

  describe("nosecone", () => {
    it("uses default configuration if no options provided", () => {
      const headers = nosecone();
      assert.deepStrictEqual(headers, {
        "content-security-policy":
          "base-uri 'none'; child-src 'none'; connect-src 'self'; default-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' blob: data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; upgrade-insecure-requests;",
        "cross-origin-embedder-policy": "require-corp",
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-resource-policy": "same-origin",
        "origin-agent-cluster": "?1",
        "referrer-policy": "no-referrer",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
        "x-dns-prefetch-control": "off",
        "x-download-options": "noopen",
        "x-frame-options": "SAMEORIGIN",
        "x-permitted-cross-domain-policies": "none",
        "x-xss-protection": "0",
      });
    });

    it("uses default configuration if field not provided", () => {
      const headers = nosecone({});
      assert.deepStrictEqual(headers, {
        "content-security-policy":
          "base-uri 'none'; child-src 'none'; connect-src 'self'; default-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' blob: data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; upgrade-insecure-requests;",
        "cross-origin-embedder-policy": "require-corp",
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-resource-policy": "same-origin",
        "origin-agent-cluster": "?1",
        "referrer-policy": "no-referrer",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
        "x-dns-prefetch-control": "off",
        "x-download-options": "noopen",
        "x-frame-options": "SAMEORIGIN",
        "x-permitted-cross-domain-policies": "none",
        "x-xss-protection": "0",
      });
    });

    it("disables header with explicit false", () => {
      const headers = nosecone({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
        referrerPolicy: false,
        strictTransportSecurity: false,
        xContentTypeOptions: false,
        xDnsPrefetchControl: false,
        xDownloadOptions: false,
        xFrameOptions: false,
        xPermittedCrossDomainPolicies: false,
        xXssProtection: false,
      });
      assert.deepStrictEqual(headers, {});
    });

    it("enabled default header with explicit true", () => {
      const headers = nosecone({
        contentSecurityPolicy: true,
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: true,
        originAgentCluster: true,
        referrerPolicy: true,
        strictTransportSecurity: true,
        xContentTypeOptions: true,
        xDnsPrefetchControl: true,
        xDownloadOptions: true,
        xFrameOptions: true,
        xPermittedCrossDomainPolicies: true,
        xXssProtection: true,
      });
      assert.deepStrictEqual(headers, {
        "content-security-policy":
          "base-uri 'none'; child-src 'none'; connect-src 'self'; default-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' blob: data:; manifest-src 'self'; media-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; upgrade-insecure-requests;",
        "cross-origin-embedder-policy": "require-corp",
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-resource-policy": "same-origin",
        "origin-agent-cluster": "?1",
        "referrer-policy": "no-referrer",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
        "x-dns-prefetch-control": "off",
        "x-download-options": "noopen",
        "x-frame-options": "SAMEORIGIN",
        "x-permitted-cross-domain-policies": "none",
        "x-xss-protection": "0",
      });
    });
  });
});
