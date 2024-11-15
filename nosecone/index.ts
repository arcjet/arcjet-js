// Based on https://github.com/josh-hemphill/csp-typed-directives/blob/latest/src/csp.types.ts
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

type ActionSource = "'strict-dynamic'" | "'report-sample'";
type BaseSource =
  | "'self'"
  | "'unsafe-eval'"
  | "'unsafe-hashes'"
  | "'unsafe-inline'"
  | "'wasm-unsafe-eval'"
  | "'none'";
type CryptoSource = `'${"nonce" | "sha256" | "sha384" | "sha512"}-${string}'`;
type FrameSource = HostSource | SchemeSource | "'self'" | "'none'";
type HostNameScheme = `${string}.${string}` | "localhost";
type HostSource = `${HostProtocolSchemes}${HostNameScheme}${PortScheme}`;
type HostProtocolSchemes = `${string}://` | "";
type PortScheme = `:${number}` | "" | ":*";
type SchemeSource =
  | "http:"
  | "https:"
  | "data:"
  | "mediastream:"
  | "blob:"
  | "filesystem:";
type Source = HostSource | SchemeSource | CryptoSource | BaseSource;
type StaticOrDynamic<S> = boolean | null | ReadonlyArray<S | (() => S)>;

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

type ReferrerPolicyToken =
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
  directives: Readonly<CspDirectives>;
}

export interface CrossOriginEmbedderPolicyConfig {
  policy: "require-corp" | "credentialless" | "unsafe-none";
}

export interface CrossOriginOpenerPolicyConfig {
  policy: "same-origin" | "same-origin-allow-popups" | "unsafe-none";
}

export interface CrossOriginResourcePolicyConfig {
  policy: "same-origin" | "same-site" | "cross-origin";
}

export interface ReferrerPolicyConfig {
  policy: ReadonlyArray<ReferrerPolicyToken>;
}

export interface StrictTransportSecurityConfig {
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

export interface XDNsPrefetchControlConfig {
  allow: boolean;
}

export interface XFrameOptionsConfig {
  action: "deny" | "sameorigin";
}

export interface XPermittedCrossDomainPoliciesConfig {
  permittedPolicies: "none" | "master-only" | "by-content-type" | "all";
}

export interface NoseconeOptions {
  contentSecurityPolicy?: ContentSecurityPolicyConfig | boolean;
  crossOriginEmbedderPolicy?: CrossOriginEmbedderPolicyConfig | boolean;
  crossOriginOpenerPolicy?: CrossOriginOpenerPolicyConfig | boolean;
  crossOriginResourcePolicy?: CrossOriginResourcePolicyConfig | boolean;
  originAgentCluster?: boolean;
  referrerPolicy?: ReferrerPolicyConfig | boolean;
  strictTransportSecurity?: StrictTransportSecurityConfig | boolean;
  xContentTypeOptions?: boolean;
  xDnsPrefetchControl?: XDNsPrefetchControlConfig | boolean;
  xDownloadOptions?: boolean;
  xFrameOptions?: XFrameOptionsConfig | boolean;
  xPermittedCrossDomainPolicies?: XPermittedCrossDomainPoliciesConfig | boolean;
  xXssProtection?: boolean;
}

// Map of configuration options to the kebab-case names for
// `Content-Security-Policy` directives
const CONTENT_SECURITY_POLICY_DIRECTIVES = new Map<keyof CspDirectives, string>(
  [
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
  ],
);

// Set of valid `Cross-Origin-Embedder-Policy` values
const CROSS_ORIGIN_EMBEDDER_POLICIES = new Set([
  "require-corp",
  "credentialless",
  "unsafe-none",
]);

// Set of valid `Cross-Origin-Opener-Policy` values
const CROSS_ORIGIN_OPENER_POLICIES = new Set([
  "same-origin",
  "same-origin-allow-popups",
  "unsafe-none",
]);

// Set of valid `Cross-Origin-Resource-Policy` values
const CROSS_ORIGIN_RESOURCE_POLICIES = new Set([
  "same-origin",
  "same-site",
  "cross-origin",
]);

// Set of valid `Resource-Policy` tokens
const REFERRER_POLICIES = new Set([
  "no-referrer",
  "no-referrer-when-downgrade",
  "same-origin",
  "origin",
  "strict-origin",
  "origin-when-cross-origin",
  "strict-origin-when-cross-origin",
  "unsafe-url",
  "",
]);

// Set of valid `X-Permitted-Cross-Domain-Policies` values
const PERMITTED_CROSS_DOMAIN_POLICIES = new Set([
  "none",
  "master-only",
  "by-content-type",
  "all",
]);

// Set of valid values for the `sandbox` directive of `Content-Security-Policy`
const SANDBOX_DIRECTIVES = new Set([
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
]);

// Set of values that need to be quoted in `Content-Security-Policy`
const QUOTED = new Set([
  "self",
  "unsafe-eval",
  "unsafe-hashes",
  "unsafe-inline",
  "none",
  "strict-dynamic",
  "report-sample",
  "wasm-unsafe-eval",
  "script",
]);

export const defaultDirectives = {
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
    directives: defaultDirectives,
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

function resolveValue(v: (() => string) | string) {
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

function contentSecurityPolicyHeader(options: ContentSecurityPolicyConfig) {
  const cspEntries = [];
  for (const [optionKey, optionValues] of Object.entries(options.directives)) {
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
      if (QUOTED.has(value)) {
        throw new NoseconeValidationError(
          `"${value}" must be quoted using single-quotes, e.g. "'${value}'"`,
        );
      }
      if (key === "sandbox") {
        if (!SANDBOX_DIRECTIVES.has(value)) {
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

function crossOriginEmbedderPolicyHeader(
  options: CrossOriginEmbedderPolicyConfig,
) {
  if (CROSS_ORIGIN_EMBEDDER_POLICIES.has(options.policy)) {
    return ["cross-origin-embedder-policy", options.policy];
  } else {
    throw new NoseconeValidationError(
      `invalid value for Cross-Origin-Embedder-Policy`,
    );
  }
}

function crossOriginOpenerPolicyHeader(options: CrossOriginOpenerPolicyConfig) {
  if (CROSS_ORIGIN_OPENER_POLICIES.has(options.policy)) {
    return ["cross-origin-opener-policy", options.policy];
  } else {
    throw new NoseconeValidationError(
      `invalid value for Cross-Origin-Opener-Policy`,
    );
  }
}

function crossOriginResourcePolicyHeader(
  options: CrossOriginResourcePolicyConfig,
) {
  if (CROSS_ORIGIN_RESOURCE_POLICIES.has(options.policy)) {
    return ["cross-origin-resource-policy", options.policy];
  } else {
    throw new NoseconeValidationError(
      `invalid value for Cross-Origin-Resource-Policy`,
    );
  }
}

function originAgentClusterHeader() {
  return ["origin-agent-cluster", "?1"];
}

function referrerPolicyHeader(options: ReferrerPolicyConfig) {
  if (Array.isArray(options.policy) && options.policy.length > 0) {
    const tokens = new Set<ReferrerPolicyToken>();
    for (const token of options.policy) {
      if (REFERRER_POLICIES.has(token)) {
        tokens.add(token);
      } else {
        throw new NoseconeValidationError(`invalid value for Referrer-Policy`);
      }
    }

    return ["referrer-policy", Array.from(tokens).join(",")];
  }

  throw new NoseconeValidationError(
    "must provide at least one policy for Referrer-Policy",
  );
}

function strictTransportSecurityHeader(options: StrictTransportSecurityConfig) {
  let maxAge;

  if (options.maxAge >= 0 && Number.isFinite(options.maxAge)) {
    maxAge = Math.floor(options.maxAge);
  } else {
    throw new NoseconeValidationError(
      "must provide a positive integer for the maxAge of Strict-Transport-Security",
    );
  }
  const directives: string[] = [`max-age=${maxAge}`];

  if (options.includeSubDomains) {
    directives.push("includeSubDomains");
  }

  if (options.preload) {
    directives.push("preload");
  }

  return ["strict-transport-security", directives.join("; ")];
}

function xContentTypeOptionsHeader() {
  return ["x-content-type-options", "nosniff"];
}

function xDnsPrefetchControlHeader(options: XDNsPrefetchControlConfig) {
  const headerValue = options.allow ? "on" : "off";
  return ["x-dns-prefetch-control", headerValue];
}

function xDownloadOptionsHeader() {
  return ["x-download-options", "noopen"];
}

function xFrameOptionsHeader(options: XFrameOptionsConfig) {
  if (typeof options.action === "string") {
    const headerValue = options.action.toUpperCase();
    if (headerValue === "SAMEORIGIN" || headerValue === "DENY") {
      return ["x-frame-options", headerValue];
    }
  }

  throw new NoseconeValidationError("invalid value for X-Frame-Options");
}

function xPermittedCrossDomainPoliciesHeader(
  options: XPermittedCrossDomainPoliciesConfig,
) {
  if (PERMITTED_CROSS_DOMAIN_POLICIES.has(options.permittedPolicies)) {
    return ["x-permitted-cross-domain-policies", options.permittedPolicies];
  } else {
    throw new NoseconeValidationError(
      `invalid value for X-Permitted-Cross-Domain-Policies`,
    );
  }
}

function xXssProtectionHeader() {
  return ["x-xss-protection", "0"];
}

export default function nosecone(options: NoseconeOptions = defaults) {
  /* eslint-disable prefer-const */
  let {
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
  } = options;
  /* eslint-enable prefer-const */

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

  const headers: Record<string, string> = {};

  if (contentSecurityPolicy) {
    const [headerName, headerValue] = contentSecurityPolicyHeader(
      contentSecurityPolicy,
    );
    headers[headerName] = headerValue;
  }

  if (crossOriginEmbedderPolicy) {
    const [headerName, headerValue] = crossOriginEmbedderPolicyHeader(
      crossOriginEmbedderPolicy,
    );
    headers[headerName] = headerValue;
  }

  if (crossOriginOpenerPolicy) {
    const [headerName, headerValue] = crossOriginOpenerPolicyHeader(
      crossOriginOpenerPolicy,
    );
    headers[headerName] = headerValue;
  }

  if (crossOriginResourcePolicy) {
    const [headerName, headerValue] = crossOriginResourcePolicyHeader(
      crossOriginResourcePolicy,
    );
    headers[headerName] = headerValue;
  }

  if (originAgentCluster) {
    const [headerName, headerValue] = originAgentClusterHeader();
    headers[headerName] = headerValue;
  }

  if (referrerPolicy) {
    const [headerName, headerValue] = referrerPolicyHeader(referrerPolicy);
    headers[headerName] = headerValue;
  }

  if (strictTransportSecurity) {
    const [headerName, headerValue] = strictTransportSecurityHeader(
      strictTransportSecurity,
    );
    headers[headerName] = headerValue;
  }

  if (xContentTypeOptions) {
    const [headerName, headerValue] = xContentTypeOptionsHeader();
    headers[headerName] = headerValue;
  }

  if (xDnsPrefetchControl) {
    const [headerName, headerValue] =
      xDnsPrefetchControlHeader(xDnsPrefetchControl);
    headers[headerName] = headerValue;
  }

  if (xDownloadOptions) {
    const [headerName, headerValue] = xDownloadOptionsHeader();
    headers[headerName] = headerValue;
  }

  if (xFrameOptions) {
    const [headerName, headerValue] = xFrameOptionsHeader(xFrameOptions);
    headers[headerName] = headerValue;
  }

  if (xPermittedCrossDomainPolicies) {
    const [headerName, headerValue] = xPermittedCrossDomainPoliciesHeader(
      xPermittedCrossDomainPolicies,
    );
    headers[headerName] = headerValue;
  }

  if (xXssProtection) {
    const [headerName, headerValue] = xXssProtectionHeader();
    headers[headerName] = headerValue;
  }

  return headers;
}
