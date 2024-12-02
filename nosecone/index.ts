// Types based on
// https://github.com/josh-hemphill/csp-typed-directives/blob/6e2cbc6d3cc18bbdc9b13d42c4556e786e28b243/src/csp.types.ts
//
// MIT License
//
// Copyright (c) 2021-present, Joshua Hemphill
// Copyright (c) 2021, Tecnico Corporation
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export type ActionSource = "'strict-dynamic'" | "'report-sample'";
export type BaseSource =
  | "'self'"
  | "'unsafe-eval'"
  | "'unsafe-hashes'"
  | "'unsafe-inline'"
  | "'wasm-unsafe-eval'"
  | "'none'";
export type CryptoSource =
  `'${"nonce" | "sha256" | "sha384" | "sha512"}-${string}'`;
export type FrameSource = HostSource | SchemeSource | "'self'" | "'none'";
export type HostNameScheme = `${string}.${string}` | "localhost";
export type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;
export type HostProtocolSchemes = `${string}://` | "";
export type PortScheme = `:${number}` | "" | ":*";
export type SchemeSource =
  | "http:"
  | "https:"
  | "data:"
  | "mediastream:"
  | "blob:"
  | "filesystem:";
export type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
export type StaticOrDynamic<S> = boolean | null | ReadonlyArray<S | (() => S)>;

export interface CspDirectives {
  baseUri?: StaticOrDynamic<Source | ActionSource>;
  childSrc?: StaticOrDynamic<Source>;
  defaultSrc?: StaticOrDynamic<Source | ActionSource>;
  frameSrc?: StaticOrDynamic<Source>;
  workerSrc?: StaticOrDynamic<Source>;
  connectSrc?: StaticOrDynamic<Source>;
  fontSrc?: StaticOrDynamic<Source>;
  imgSrc?: StaticOrDynamic<Source>;
  manifestSrc?: StaticOrDynamic<Source>;
  mediaSrc?: StaticOrDynamic<Source>;
  objectSrc?: StaticOrDynamic<Source>;
  prefetchSrc?: StaticOrDynamic<Source>;
  scriptSrc?: StaticOrDynamic<Source | ActionSource>;
  scriptSrcElem?: StaticOrDynamic<Source>;
  scriptSrcAttr?: StaticOrDynamic<Source>;
  styleSrc?: StaticOrDynamic<Source | ActionSource>;
  styleSrcElem?: StaticOrDynamic<Source>;
  styleSrcAttr?: StaticOrDynamic<Source>;
  sandbox?: ReadonlyArray<
    | "allow-downloads-without-user-activation"
    | "allow-forms"
    | "allow-modals"
    | "allow-orientation-lock"
    | "allow-pointer-lock"
    | "allow-popups"
    | "allow-popups-to-escape-sandbox"
    | "allow-presentation"
    | "allow-same-origin"
    | "allow-scripts"
    | "allow-storage-access-by-user-activation"
    | "allow-top-navigation"
    | "allow-top-navigation-by-user-activation"
  >;
  formAction?: StaticOrDynamic<Source | ActionSource>;
  frameAncestors?: StaticOrDynamic<HostSource | SchemeSource | FrameSource>;
  navigateTo?: StaticOrDynamic<Source | ActionSource>;
  reportUri?: string[];
  reportTo?: string[];
  requireTrustedTypesFor?: ReadonlyArray<"script">;
  trustedTypes?: ReadonlyArray<"none" | "allow-duplicates" | "*" | string>;
  upgradeInsecureRequests?: boolean;
}

export type ReferrerPolicyToken =
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "same-origin"
  | "origin"
  | "strict-origin"
  | "origin-when-cross-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url"
  | "";

export interface ContentSecurityPolicyConfig {
  directives?: Readonly<CspDirectives>;
}

export interface CrossOriginEmbedderPolicyConfig {
  policy?: "require-corp" | "credentialless" | "unsafe-none";
}

export interface CrossOriginOpenerPolicyConfig {
  policy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none";
}

export interface CrossOriginResourcePolicyConfig {
  policy?: "same-origin" | "same-site" | "cross-origin";
}

export interface ReferrerPolicyConfig {
  policy?: ReadonlyArray<ReferrerPolicyToken>;
}

export interface StrictTransportSecurityConfig {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

export interface DnsPrefetchControlConfig {
  allow?: boolean;
}

export interface FrameOptionsConfig {
  action?: "deny" | "sameorigin";
}

export interface PermittedCrossDomainPoliciesConfig {
  permittedPolicies?: "none" | "master-only" | "by-content-type" | "all";
}

export interface NoseconeOptions {
  /**
   * Configure the `Content-Security-Policy` header, which helps mitigate a
   * large number of attacks, such as cross-site scripting.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link ContentSecurityPolicyConfig} to configure individual
   * items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
   * - https://owasp.org/www-project-secure-headers/#content-security-policy
   */
  contentSecurityPolicy?: ContentSecurityPolicyConfig | boolean;
  /**
   * Configure the `Cross-Origin-Embedder-Policy` header, which helps control
   * what resources can be loaded cross-origin.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link CrossOriginEmbedderPolicyConfig} to configure individual
   * items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
   * - https://owasp.org/www-project-secure-headers/#cross-origin-embedder-policy
   */
  crossOriginEmbedderPolicy?: CrossOriginEmbedderPolicyConfig | boolean;
  /**
   * Configure the `Cross-Origin-Opener-Policy` header, which helps
   * process-isolate your page.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link CrossOriginOpenerPolicyConfig} to configure individual
   * items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy
   * - https://owasp.org/www-project-secure-headers/#cross-origin-opener-policy
   */
  crossOriginOpenerPolicy?: CrossOriginOpenerPolicyConfig | boolean;
  /**
   * Configure the `Cross-Origin-Resource-Policy` header, which blocks others
   * from loading your resources cross-origin in some cases.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link CrossOriginResourcePolicyConfig} to configure individual
   * items.
   *
   * See also:
   * - https://resourcepolicy.fyi/
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy
   * - https://owasp.org/www-project-secure-headers/#cross-origin-resource-policy
   */
  crossOriginResourcePolicy?: CrossOriginResourcePolicyConfig | boolean;
  /**
   * Configure the `Origin-Agent-Cluster` header, which provides a mechanism to
   * allow web applications to isolate their origins from other processes.
   *
   * Enable with defaults by specifying `true` or disable by specifying `false`.
   *
   * See also:
   * - https://whatpr.org/html/6214/origin.html#origin-keyed-agent-clusters
   */
  originAgentCluster?: boolean;
  /**
   * Configure the `Referrer-Policy` header, which controls what information is
   * set in the `Referer` request header.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link ReferrerPolicyConfig} to configure individual items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/Security/Referer_header:_privacy_and_security_concerns
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
   * - https://owasp.org/www-project-secure-headers/#referrer-policy
   */
  referrerPolicy?: ReferrerPolicyConfig | boolean;
  /**
   * Configure the `Strict-Transport-Security` header, which tells browsers to
   * prefer HTTPS instead of insecure HTTP.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link StrictTransportSecurityConfig} to configure individual
   * items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
   * - https://owasp.org/www-project-secure-headers/#strict-transport-security
   */
  strictTransportSecurity?: StrictTransportSecurityConfig | boolean;
  /**
   * Configure the `X-Content-Type-Options` header, which helps mitigate MIME
   * type sniffing that can cause security issues.
   *
   * Enable with defaults by specifying `true` or disable by specifying `false`.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/MIME_types#mime_sniffing
   * - https://owasp.org/www-project-secure-headers/#x-content-type-options
   */
  xContentTypeOptions?: boolean;
  /**
   * Configure the `X-DNS-Prefetch-Control` header, which helps control DNS
   * prefetching to improve user privacy at the expense of performance.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link DnsPrefetchControlConfig} to configure individual items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
   */
  xDnsPrefetchControl?: DnsPrefetchControlConfig | boolean;
  /**
   * Configure the `X-Download-Options` header, which prevents a user from
   * opening a file directly in Internet Explorer 8 to avoid prevent script
   * injection.
   *
   * Enable with defaults by specifying `true` or disable by specifying `false`.
   *
   * See also:
   * - https://learn.microsoft.com/en-us/archive/blogs/ie/ie8-security-part-v-comprehensive-protection#mime-handling-force-save
   */
  xDownloadOptions?: boolean;
  /**
   * Configure the `X-Frame-Options` header, which help mitigate clickjacking
   * attacks in legacy browsers. This header is superceded by a directive in the
   * `Content-Security-Policy` header.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link FrameOptionsConfig} to configure individual items.
   *
   * See also:
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
   * - https://owasp.org/www-project-secure-headers/#x-frame-options
   */
  xFrameOptions?: FrameOptionsConfig | boolean;
  /**
   * Configure the `X-Permitted-Cross-Domain-Policies` header, which tells some
   * clients, like Adobe products, your domain's policy for loading cross-domain
   * content.
   *
   * Enable with defaults by specifying `true`, disable by specifying `false`,
   * or provide {@link PermittedCrossDomainPoliciesConfig} to configure
   * individual items.
   *
   * See also:
   * - https://owasp.org/www-project-secure-headers/#x-permitted-cross-domain-policies
   */
  xPermittedCrossDomainPolicies?: PermittedCrossDomainPoliciesConfig | boolean;
  /**
   * Disable the `X-XSS-Protection` header, which could introduce a browser
   * side-channel in legacy browsers if enabled.
   *
   * Disable it by specifying `true` or avoid setting the header by specifying
   * `false`.
   *
   * See also:
   * - https://github.com/helmetjs/helmet/issues/230
   * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
   * - https://owasp.org/www-project-secure-headers/#x-xss-protection
   * - https://portswigger.net/daily-swig/new-xs-leak-techniques-reveal-fresh-ways-to-expose-user-information
   */
  xXssProtection?: boolean;
}

// Map of configuration options to the kebab-case names for
// `Content-Security-Policy` directives
export const CONTENT_SECURITY_POLICY_DIRECTIVES = new Map([
  ["baseUri", "base-uri"],
  ["childSrc", "child-src"],
  ["defaultSrc", "default-src"],
  ["frameSrc", "frame-src"],
  ["workerSrc", "worker-src"],
  ["connectSrc", "connect-src"],
  ["fontSrc", "font-src"],
  ["imgSrc", "img-src"],
  ["manifestSrc", "manifest-src"],
  ["mediaSrc", "media-src"],
  ["objectSrc", "object-src"],
  ["prefetchSrc", "prefetch-src"],
  ["scriptSrc", "script-src"],
  ["scriptSrcElem", "script-src-elem"],
  ["scriptSrcAttr", "script-src-attr"],
  ["styleSrc", "style-src"],
  ["styleSrcElem", "style-src-elem"],
  ["styleSrcAttr", "style-src-attr"],
  ["sandbox", "sandbox"],
  ["formAction", "form-action"],
  ["frameAncestors", "frame-ancestors"],
  ["navigateTo", "navigate-to"],
  ["reportUri", "report-uri"],
  ["reportTo", "report-to"],
  ["requireTrustedTypesFor", "require-trusted-types-for"],
  ["trustedTypes", "trusted-types"],
  ["upgradeInsecureRequests", "upgrade-insecure-requests"],
] as const);

// Set of valid `Cross-Origin-Embedder-Policy` values
export const CROSS_ORIGIN_EMBEDDER_POLICIES = new Set([
  "require-corp",
  "credentialless",
  "unsafe-none",
] as const);

// Set of valid `Cross-Origin-Opener-Policy` values
export const CROSS_ORIGIN_OPENER_POLICIES = new Set([
  "same-origin",
  "same-origin-allow-popups",
  "unsafe-none",
] as const);

// Set of valid `Cross-Origin-Resource-Policy` values
export const CROSS_ORIGIN_RESOURCE_POLICIES = new Set([
  "same-origin",
  "same-site",
  "cross-origin",
] as const);

// Set of valid `Resource-Policy` tokens
export const REFERRER_POLICIES = new Set([
  "no-referrer",
  "no-referrer-when-downgrade",
  "same-origin",
  "origin",
  "strict-origin",
  "origin-when-cross-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
  "",
] as const);

// Set of valid `X-Permitted-Cross-Domain-Policies` values
export const PERMITTED_CROSS_DOMAIN_POLICIES = new Set([
  "none",
  "master-only",
  "by-content-type",
  "all",
] as const);

// Set of valid values for the `sandbox` directive of `Content-Security-Policy`
export const SANDBOX_DIRECTIVES = new Set([
  "allow-downloads-without-user-activation",
  "allow-forms",
  "allow-modals",
  "allow-orientation-lock",
  "allow-pointer-lock",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-presentation",
  "allow-same-origin",
  "allow-scripts",
  "allow-storage-access-by-user-activation",
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
] as const);

// Mapping of values that need to be quoted in `Content-Security-Policy`;
// however, it does not include `nonce-*` or `sha*-*` because those are dynamic
export const QUOTED = new Map([
  ["self", "'self'"],
  ["unsafe-eval", "'unsafe-eval'"],
  ["unsafe-hashes", "'unsafe-hashes'"],
  ["unsafe-inline", "'unsafe-inline'"],
  ["none", "'none'"],
  ["strict-dynamic", "'strict-dynamic'"],
  ["report-sample", "'report-sample'"],
  ["wasm-unsafe-eval", "'wasm-unsafe-eval'"],
  ["script", "'script'"],
] as const);

const directives = {
  baseUri: ["'none'"],
  childSrc: ["'none'"],
  connectSrc: ["'self'"],
  defaultSrc: ["'self'"],
  fontSrc: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  frameSrc: ["'none'"],
  imgSrc: ["'self'", "blob:", "data:"],
  manifestSrc: ["'self'"],
  mediaSrc: ["'self'"],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'"],
  workerSrc: ["'self'"],
  upgradeInsecureRequests: true,
} as const;

export const defaults = {
  contentSecurityPolicy: {
    directives,
  },
  crossOriginEmbedderPolicy: {
    policy: "require-corp",
  },
  crossOriginOpenerPolicy: {
    policy: "same-origin",
  },
  crossOriginResourcePolicy: {
    policy: "same-origin",
  },
  originAgentCluster: true,
  referrerPolicy: {
    policy: ["no-referrer"],
  },
  strictTransportSecurity: {
    maxAge: 365 * 24 * 60 * 60,
    includeSubDomains: true,
    preload: false,
  },
  xContentTypeOptions: true,
  xDnsPrefetchControl: {
    allow: false,
  },
  xDownloadOptions: true,
  xFrameOptions: {
    action: "sameorigin",
  },
  xPermittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },
  xXssProtection: true,
} as const;

function resolveValue<S extends string>(v: (() => S) | S): S {
  if (typeof v === "function") {
    return v();
  } else {
    return v;
  }
}

export class NoseconeValidationError extends Error {
  constructor(message: string) {
    super(`validation error: ${message}`);
  }
}

// Header defaults and construction inspired by
// https://github.com/helmetjs/helmet/tree/9a8e6d5322aad6090394b0bb2e81448c5f5b3e74
//
// The MIT License
//
// Copyright (c) 2012-2024 Evan Hahn, Adam Baldwin
//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// 'Software'), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
// CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

export function createContentSecurityPolicy(
  {
    directives = defaults.contentSecurityPolicy.directives,
  }: ContentSecurityPolicyConfig = defaults.contentSecurityPolicy,
) {
  const cspEntries = [];
  for (const [optionKey, optionValues] of Object.entries(directives)) {
    const key = CONTENT_SECURITY_POLICY_DIRECTIVES.get(
      // @ts-expect-error because we're validating this option key
      optionKey,
    );
    if (!key) {
      throw new NoseconeValidationError(
        `${optionKey} is not a Content-Security-Policy directive`,
      );
    }

    // Skip anything falsey
    if (!optionValues) {
      continue;
    }

    // TODO: What do we want to do if array is empty? I think they work differently for some directives
    const resolvedValues = Array.isArray(optionValues)
      ? new Set(optionValues.map(resolveValue))
      : new Set<string>();

    // TODO: Add more validation
    for (const value of resolvedValues) {
      if (
        QUOTED.has(
          // @ts-expect-error because we are validation this value
          value,
        )
      ) {
        throw new NoseconeValidationError(
          `"${value}" must be quoted using single-quotes, e.g. "'${value}'"`,
        );
      }
      if (key === "sandbox") {
        if (
          !SANDBOX_DIRECTIVES.has(
            // @ts-expect-error because we are validation this value
            value,
          )
        ) {
          throw new NoseconeValidationError(
            "invalid sandbox value in Content-Security-Policy",
          );
        }
      }
    }

    const values = Array.from(resolvedValues);

    const entry = `${key} ${values.join(" ")}`.trim();
    const entryWithSep = `${entry};`;
    cspEntries.push(entryWithSep);
  }
  return ["content-security-policy", cspEntries.join(" ")] as const;
}

export function createCrossOriginEmbedderPolicy(
  {
    policy = defaults.crossOriginEmbedderPolicy.policy,
  }: CrossOriginEmbedderPolicyConfig = defaults.crossOriginEmbedderPolicy,
) {
  if (CROSS_ORIGIN_EMBEDDER_POLICIES.has(policy)) {
    return ["cross-origin-embedder-policy", policy] as const;
  } else {
    throw new NoseconeValidationError(
      `invalid value for Cross-Origin-Embedder-Policy`,
    );
  }
}

export function createCrossOriginOpenerPolicy(
  {
    policy = defaults.crossOriginOpenerPolicy.policy,
  }: CrossOriginOpenerPolicyConfig = defaults.crossOriginOpenerPolicy,
) {
  if (CROSS_ORIGIN_OPENER_POLICIES.has(policy)) {
    return ["cross-origin-opener-policy", policy] as const;
  } else {
    throw new NoseconeValidationError(
      `invalid value for Cross-Origin-Opener-Policy`,
    );
  }
}

export function createCrossOriginResourcePolicy(
  {
    policy = defaults.crossOriginResourcePolicy.policy,
  }: CrossOriginResourcePolicyConfig = defaults.crossOriginResourcePolicy,
) {
  if (CROSS_ORIGIN_RESOURCE_POLICIES.has(policy)) {
    return ["cross-origin-resource-policy", policy] as const;
  } else {
    throw new NoseconeValidationError(
      `invalid value for Cross-Origin-Resource-Policy`,
    );
  }
}

export function createOriginAgentCluster() {
  return ["origin-agent-cluster", "?1"] as const;
}

export function createReferrerPolicy(
  {
    policy = defaults.referrerPolicy.policy,
  }: ReferrerPolicyConfig = defaults.referrerPolicy,
) {
  if (Array.isArray(policy)) {
    if (policy.length > 0) {
      const tokens = new Set<ReferrerPolicyToken>();
      for (const token of policy) {
        if (REFERRER_POLICIES.has(token)) {
          tokens.add(token);
        } else {
          throw new NoseconeValidationError(
            `invalid value for Referrer-Policy`,
          );
        }
      }

      return ["referrer-policy", Array.from(tokens).join(",")] as const;
    } else {
      throw new NoseconeValidationError(
        "must provide at least one policy for Referrer-Policy",
      );
    }
  }

  throw new NoseconeValidationError("must provide array for Referrer-Policy");
}

export function createStrictTransportSecurity(
  {
    maxAge = defaults.strictTransportSecurity.maxAge,
    includeSubDomains = defaults.strictTransportSecurity.includeSubDomains,
    preload = defaults.strictTransportSecurity.preload,
  }: StrictTransportSecurityConfig = defaults.strictTransportSecurity,
) {
  if (maxAge >= 0 && Number.isFinite(maxAge)) {
    maxAge = Math.floor(maxAge);
  } else {
    throw new NoseconeValidationError(
      "must provide a finite, positive integer for the maxAge of Strict-Transport-Security",
    );
  }
  const directives: string[] = [`max-age=${maxAge}`];

  if (includeSubDomains) {
    directives.push("includeSubDomains");
  }

  if (preload) {
    directives.push("preload");
  }

  return ["strict-transport-security", directives.join("; ")] as const;
}

export function createContentTypeOptions() {
  return ["x-content-type-options", "nosniff"] as const;
}

export function createDnsPrefetchControl(
  {
    allow = defaults.xDnsPrefetchControl.allow,
  }: DnsPrefetchControlConfig = defaults.xDnsPrefetchControl,
) {
  const headerValue = allow ? "on" : "off";
  return ["x-dns-prefetch-control", headerValue] as const;
}

export function createDownloadOptions() {
  return ["x-download-options", "noopen"] as const;
}

export function createFrameOptions(
  {
    action = defaults.xFrameOptions.action,
  }: FrameOptionsConfig = defaults.xFrameOptions,
) {
  if (typeof action === "string") {
    const headerValue = action.toUpperCase();
    if (headerValue === "SAMEORIGIN" || headerValue === "DENY") {
      return ["x-frame-options", headerValue] as const;
    }
  }

  throw new NoseconeValidationError("invalid value for X-Frame-Options");
}

export function createPermittedCrossDomainPolicies(
  {
    permittedPolicies = defaults.xPermittedCrossDomainPolicies
      .permittedPolicies,
  }: PermittedCrossDomainPoliciesConfig = defaults.xPermittedCrossDomainPolicies,
) {
  if (PERMITTED_CROSS_DOMAIN_POLICIES.has(permittedPolicies)) {
    return ["x-permitted-cross-domain-policies", permittedPolicies] as const;
  } else {
    throw new NoseconeValidationError(
      `invalid value for X-Permitted-Cross-Domain-Policies`,
    );
  }
}

export function createXssProtection() {
  return ["x-xss-protection", "0"] as const;
}

export default function nosecone({
  contentSecurityPolicy = defaults.contentSecurityPolicy,
  crossOriginEmbedderPolicy = defaults.crossOriginEmbedderPolicy,
  crossOriginOpenerPolicy = defaults.crossOriginOpenerPolicy,
  crossOriginResourcePolicy = defaults.crossOriginResourcePolicy,
  originAgentCluster = defaults.originAgentCluster,
  referrerPolicy = defaults.referrerPolicy,
  strictTransportSecurity = defaults.strictTransportSecurity,
  xContentTypeOptions = defaults.xContentTypeOptions,
  xDnsPrefetchControl = defaults.xDnsPrefetchControl,
  xDownloadOptions = defaults.xDownloadOptions,
  xFrameOptions = defaults.xFrameOptions,
  xPermittedCrossDomainPolicies = defaults.xPermittedCrossDomainPolicies,
  xXssProtection = defaults.xXssProtection,
}: NoseconeOptions = defaults) {
  if (contentSecurityPolicy === true) {
    contentSecurityPolicy = defaults.contentSecurityPolicy;
  }
  if (crossOriginEmbedderPolicy === true) {
    crossOriginEmbedderPolicy = defaults.crossOriginEmbedderPolicy;
  }
  if (crossOriginOpenerPolicy === true) {
    crossOriginOpenerPolicy = defaults.crossOriginOpenerPolicy;
  }
  if (crossOriginResourcePolicy === true) {
    crossOriginResourcePolicy = defaults.crossOriginResourcePolicy;
  }
  if (referrerPolicy === true) {
    referrerPolicy = defaults.referrerPolicy;
  }
  if (strictTransportSecurity === true) {
    strictTransportSecurity = defaults.strictTransportSecurity;
  }
  if (xDnsPrefetchControl === true) {
    xDnsPrefetchControl = defaults.xDnsPrefetchControl;
  }
  if (xFrameOptions === true) {
    xFrameOptions = defaults.xFrameOptions;
  }
  if (xPermittedCrossDomainPolicies === true) {
    xPermittedCrossDomainPolicies = defaults.xPermittedCrossDomainPolicies;
  }

  const headers = new Headers();

  if (contentSecurityPolicy) {
    const [headerName, headerValue] = createContentSecurityPolicy(
      contentSecurityPolicy,
    );
    headers.set(headerName, headerValue);
  }

  if (crossOriginEmbedderPolicy) {
    const [headerName, headerValue] = createCrossOriginEmbedderPolicy(
      crossOriginEmbedderPolicy,
    );
    headers.set(headerName, headerValue);
  }

  if (crossOriginOpenerPolicy) {
    const [headerName, headerValue] = createCrossOriginOpenerPolicy(
      crossOriginOpenerPolicy,
    );
    headers.set(headerName, headerValue);
  }

  if (crossOriginResourcePolicy) {
    const [headerName, headerValue] = createCrossOriginResourcePolicy(
      crossOriginResourcePolicy,
    );
    headers.set(headerName, headerValue);
  }

  if (originAgentCluster) {
    const [headerName, headerValue] = createOriginAgentCluster();
    headers.set(headerName, headerValue);
  }

  if (referrerPolicy) {
    const [headerName, headerValue] = createReferrerPolicy(referrerPolicy);
    headers.set(headerName, headerValue);
  }

  if (strictTransportSecurity) {
    const [headerName, headerValue] = createStrictTransportSecurity(
      strictTransportSecurity,
    );
    headers.set(headerName, headerValue);
  }

  if (xContentTypeOptions) {
    const [headerName, headerValue] = createContentTypeOptions();
    headers.set(headerName, headerValue);
  }

  if (xDnsPrefetchControl) {
    const [headerName, headerValue] =
      createDnsPrefetchControl(xDnsPrefetchControl);
    headers.set(headerName, headerValue);
  }

  if (xDownloadOptions) {
    const [headerName, headerValue] = createDownloadOptions();
    headers.set(headerName, headerValue);
  }

  if (xFrameOptions) {
    const [headerName, headerValue] = createFrameOptions(xFrameOptions);
    headers.set(headerName, headerValue);
  }

  if (xPermittedCrossDomainPolicies) {
    const [headerName, headerValue] = createPermittedCrossDomainPolicies(
      xPermittedCrossDomainPolicies,
    );
    headers.set(headerName, headerValue);
  }

  if (xXssProtection) {
    const [headerName, headerValue] = createXssProtection();
    headers.set(headerName, headerValue);
  }

  return headers;
}

/**
 * Augment some Nosecone configuration with the values necessary for using the
 * Vercel Toolbar.
 *
 * Follows the guidance at
 * https://vercel.com/docs/workflow-collaboration/vercel-toolbar/managing-toolbar#using-a-content-security-policy
 *
 * @param config Base configuration for you application
 * @returns Augmented configuration to allow Vercel Toolbar
 */
export function withVercelToolbar(config: NoseconeOptions) {
  let contentSecurityPolicy = config.contentSecurityPolicy;
  if (contentSecurityPolicy === true) {
    contentSecurityPolicy = defaults.contentSecurityPolicy;
  }

  let augmentedContentSecurityPolicy = contentSecurityPolicy;
  if (contentSecurityPolicy) {
    let scriptSrc = contentSecurityPolicy.directives?.scriptSrc;
    if (scriptSrc === true) {
      scriptSrc = defaults.contentSecurityPolicy.directives.scriptSrc;
    }

    let connectSrc = contentSecurityPolicy.directives?.connectSrc;
    if (connectSrc === true) {
      connectSrc = defaults.contentSecurityPolicy.directives.connectSrc;
    }

    let imgSrc = contentSecurityPolicy.directives?.imgSrc;
    if (imgSrc === true) {
      imgSrc = defaults.contentSecurityPolicy.directives.imgSrc;
    }

    let frameSrc = contentSecurityPolicy.directives?.frameSrc;
    if (frameSrc === true) {
      frameSrc = defaults.contentSecurityPolicy.directives.frameSrc;
    }

    let styleSrc = contentSecurityPolicy.directives?.styleSrc;
    if (styleSrc === true) {
      styleSrc = defaults.contentSecurityPolicy.directives.styleSrc;
    }

    let fontSrc = contentSecurityPolicy.directives?.fontSrc;
    if (fontSrc === true) {
      fontSrc = defaults.contentSecurityPolicy.directives.fontSrc;
    }

    augmentedContentSecurityPolicy = {
      ...contentSecurityPolicy,
      directives: {
        ...contentSecurityPolicy.directives,
        scriptSrc: scriptSrc
          ? [
              ...scriptSrc.filter(
                (v) => v !== "'none'" && v !== "https://vercel.live",
              ),
              "https://vercel.live",
            ]
          : scriptSrc,
        connectSrc: connectSrc
          ? [
              ...connectSrc.filter(
                (v) =>
                  v !== "'none'" &&
                  v !== "https://vercel.live" &&
                  v !== "wss://ws-us3.pusher.com",
              ),
              "https://vercel.live",
              "wss://ws-us3.pusher.com",
            ]
          : connectSrc,
        imgSrc: imgSrc
          ? [
              ...imgSrc.filter(
                (v) =>
                  v !== "'none'" &&
                  v !== "https://vercel.live" &&
                  v !== "https://vercel.com" &&
                  v !== "data:" &&
                  v !== "blob:",
              ),
              "https://vercel.live",
              "https://vercel.com",
              "data:",
              "blob:",
            ]
          : imgSrc,
        frameSrc: frameSrc
          ? [
              ...frameSrc.filter(
                (v) => v !== "'none'" && v !== "https://vercel.live",
              ),
              "https://vercel.live",
            ]
          : frameSrc,
        styleSrc: styleSrc
          ? [
              ...styleSrc.filter(
                (v) =>
                  v !== "'none'" &&
                  v !== "https://vercel.live" &&
                  v !== "'unsafe-inline'",
              ),
              "https://vercel.live",
              "'unsafe-inline'",
            ]
          : styleSrc,
        fontSrc: fontSrc
          ? [
              ...fontSrc.filter(
                (v) =>
                  v !== "'none'" &&
                  v !== "https://vercel.live" &&
                  v !== "https://assets.vercel.com",
              ),
              "https://vercel.live",
              "https://assets.vercel.com",
            ]
          : fontSrc,
      },
    };
  }

  let crossOriginEmbedderPolicy = config.crossOriginEmbedderPolicy;
  if (crossOriginEmbedderPolicy === true) {
    crossOriginEmbedderPolicy = defaults.crossOriginEmbedderPolicy;
  }

  let augmentedCrossOriginEmbedderPolicy = crossOriginEmbedderPolicy;
  if (crossOriginEmbedderPolicy) {
    augmentedCrossOriginEmbedderPolicy = {
      policy: crossOriginEmbedderPolicy.policy
        ? "unsafe-none"
        : crossOriginEmbedderPolicy.policy,
    };
  }

  return {
    ...config,
    contentSecurityPolicy: augmentedContentSecurityPolicy,
    crossOriginEmbedderPolicy: augmentedCrossOriginEmbedderPolicy,
  } as const;
}
