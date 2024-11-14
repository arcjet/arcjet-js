import ArcjetHeaders from "@arcjet/headers";
import { runtime } from "@arcjet/runtime";

interface RequestLike {
  headers: Headers | Record<string, string | string[] | undefined>;
}

function isRequest(request: unknown): request is RequestLike {
  return (
    typeof request === "object" &&
    request !== null &&
    "headers" in request &&
    typeof request.headers === "object" &&
    request.headers !== null
  );
}

interface EventLike {
  request: RequestLike;

  setHeaders(headers: Record<string, string>): void;
}

function isEventLike(e: unknown): e is EventLike {
  // Can't use `event` as the name otherwise Next.js throws during build
  return (
    typeof e === "object" &&
    e !== null &&
    "request" in e &&
    isRequest(e.request) &&
    "setHeaders" in e &&
    typeof e.setHeaders === "function"
  );
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

function isResponseLike(response: unknown): response is ResponseLike {
  return (
    typeof response === "object" &&
    response !== null &&
    "setHeader" in response &&
    typeof response.setHeader === "function"
  );
}

type NextFn = (error?: unknown) => void;

const rt = runtime();

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

// Mapping of configuration options to the kebab-case names for the header
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
  // This is how Next.js defines the `NODE_ENV` variable
  env?: "production" | "development" | "test";
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
  // xPoweredBy?: boolean;
  xXssProtection?: boolean;
}

const CROSS_ORIGIN_EMBEDDER_POLICIES = new Set([
  "require-corp",
  "credentialless",
  "unsafe-none",
]);

const CROSS_ORIGIN_OPENER_POLICIES = new Set([
  "same-origin",
  "same-origin-allow-popups",
  "unsafe-none",
]);

const CROSS_ORIGIN_RESOURCE_POLICIES = new Set([
  "same-origin",
  "same-site",
  "cross-origin",
]);

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

const PERMITTED_CROSS_DOMAIN_POLICIES = new Set([
  "none",
  "master-only",
  "by-content-type",
  "all",
]);

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

export function nonce() {
  if (typeof crypto === "undefined") {
    throw new Error(
      "`globalThis.crypto` is not defined — please implement `nonce` for your platform",
    );
  }

  return `'nonce-${btoa(crypto.randomUUID())}'` as const;
}

export const defaultDirectives: CspDirectives = {
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
  scriptSrc: [nonce, "'strict-dynamic'"],
  styleSrc: ["'self'"],
  workerSrc: ["'self'"],
  upgradeInsecureRequests: true,
} as const;

export const defaults = {
  env: "production",
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

class ValidationError extends Error {
  constructor(message: string) {
    super(`validation error: ${message}`);
  }
}

function productionContentSecurityPolicyHeader(
  options: ContentSecurityPolicyConfig,
) {
  const cspEntries = [];
  for (const [optionKey, optionValues] of Object.entries(options.directives)) {
    const key = CONTENT_SECURITY_POLICY_DIRECTIVES.get(
      // @ts-expect-error because we're validating this option key
      optionKey,
    );
    if (!key) {
      throw new ValidationError(
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
        throw new ValidationError(
          `"${value}" must be quoted using single-quotes, e.g. "'${value}'"`,
        );
      }
      if (key === "sandbox") {
        if (!SANDBOX_DIRECTIVES.has(value)) {
          throw new ValidationError(
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

function developmentContentSecurityPolicyHeader(
  options: ContentSecurityPolicyConfig,
) {
  const cspEntries = [];
  for (const [optionKey, optionValues] of Object.entries(options.directives)) {
    const key = CONTENT_SECURITY_POLICY_DIRECTIVES.get(
      // @ts-expect-error because we're validating this option key
      optionKey,
    );
    if (!key) {
      throw new ValidationError(
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

    if (key === "script-src") {
      // Next.js requires `'unsafe-eval'` in development mode
      resolvedValues.add("'unsafe-eval'");
    }
    if (key === "style-src") {
      // Next.js requires `'unsafe-inline'` in development mode
      resolvedValues.add("'unsafe-inline'");
    }

    const values = Array.from(resolvedValues);

    const entry = `${key} ${values.join(" ")}`.trim();
    const entryWithSep = `${entry};`;
    cspEntries.push(entryWithSep);
  }
  return ["content-security-policy", cspEntries.join(" ")] as const;
}

class NextMiddlewareHeaders {
  headers: Set<string>;

  constructor() {
    this.headers = new Set();
  }

  add(header: string) {
    this.headers.add(header);
  }

  // This applies the needed headers to forward from Next.js middleware=
  // https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L22-L27
  apply(headers: Headers) {
    const addedHeaders = Array.from(this.headers);
    for (const headerName of addedHeaders) {
      const headerValue = headers.get(headerName);
      if (typeof headerValue !== "string") {
        throw new Error(`impossible: missing value for ${headerName}`);
      }
      headers.set(`x-middleware-request-${headerName}`, headerValue);
    }
    headers.set("x-middleware-override-headers", addedHeaders.join(","));
  }
}

function crossOriginEmbedderPolicyHeader(
  options: CrossOriginEmbedderPolicyConfig,
) {
  if (CROSS_ORIGIN_EMBEDDER_POLICIES.has(options.policy)) {
    return ["cross-origin-embedder-policy", options.policy];
  } else {
    throw new ValidationError(`invalid value for Cross-Origin-Embedder-Policy`);
  }
}

function crossOriginOpenerPolicyHeader(options: CrossOriginOpenerPolicyConfig) {
  if (CROSS_ORIGIN_OPENER_POLICIES.has(options.policy)) {
    return ["cross-origin-opener-policy", options.policy];
  } else {
    throw new ValidationError(`invalid value for Cross-Origin-Opener-Policy`);
  }
}

function crossOriginResourcePolicyHeader(
  options: CrossOriginResourcePolicyConfig,
) {
  if (CROSS_ORIGIN_RESOURCE_POLICIES.has(options.policy)) {
    return ["cross-origin-resource-policy", options.policy];
  } else {
    throw new ValidationError(`invalid value for Cross-Origin-Resource-Policy`);
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
        throw new ValidationError(`invalid value for Referrer-Policy`);
      }
    }

    return ["referrer-policy", Array.from(tokens).join(",")];
  }

  throw new ValidationError(
    "must provide at least one policy for Referrer-Policy",
  );
}

function strictTransportSecurityHeader(options: StrictTransportSecurityConfig) {
  let maxAge;

  if (options.maxAge >= 0 && Number.isFinite(options.maxAge)) {
    maxAge = Math.floor(options.maxAge);
  } else {
    throw new ValidationError(
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

  throw new ValidationError("invalid value for X-Frame-Options");
}

function xPermittedCrossDomainPoliciesHeader(
  options: XPermittedCrossDomainPoliciesConfig,
) {
  if (PERMITTED_CROSS_DOMAIN_POLICIES.has(options.permittedPolicies)) {
    return ["x-permitted-cross-domain-policies", options.permittedPolicies];
  } else {
    throw new ValidationError(
      `invalid value for X-Permitted-Cross-Domain-Policies`,
    );
  }
}

function xXssProtectionHeader() {
  return ["x-xss-protection", "0"];
}

export default function nosecone(options: NoseconeOptions = {}) {
  let {
    env = "development",
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

  return async (
    request: RequestLike | EventLike,
    response?: ResponseLike,
    next?: NextFn,
  ): Promise<any> => {
    if (isRequest(request)) {
      const forwardHeaders = new NextMiddlewareHeaders();
      const headers = new ArcjetHeaders(request.headers);

      if (contentSecurityPolicy) {
        let builder;
        if (env === "development" || env === "test") {
          builder = developmentContentSecurityPolicyHeader;
        } else {
          builder = productionContentSecurityPolicyHeader;
        }
        const [headerName, headerValue] = builder(contentSecurityPolicy);
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (crossOriginEmbedderPolicy) {
        const [headerName, headerValue] = crossOriginEmbedderPolicyHeader(
          crossOriginEmbedderPolicy,
        );
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (crossOriginOpenerPolicy) {
        const [headerName, headerValue] = crossOriginOpenerPolicyHeader(
          crossOriginOpenerPolicy,
        );
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (crossOriginResourcePolicy) {
        const [headerName, headerValue] = crossOriginResourcePolicyHeader(
          crossOriginResourcePolicy,
        );
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (originAgentCluster) {
        const [headerName, headerValue] = originAgentClusterHeader();
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (referrerPolicy) {
        const [headerName, headerValue] = referrerPolicyHeader(referrerPolicy);
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (strictTransportSecurity) {
        const [headerName, headerValue] = strictTransportSecurityHeader(
          strictTransportSecurity,
        );
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (xContentTypeOptions) {
        const [headerName, headerValue] = xContentTypeOptionsHeader();
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (xDnsPrefetchControl) {
        const [headerName, headerValue] =
          xDnsPrefetchControlHeader(xDnsPrefetchControl);
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (xDownloadOptions) {
        const [headerName, headerValue] = xDownloadOptionsHeader();
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (xFrameOptions) {
        const [headerName, headerValue] = xFrameOptionsHeader(xFrameOptions);
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (xPermittedCrossDomainPolicies) {
        const [headerName, headerValue] = xPermittedCrossDomainPoliciesHeader(
          xPermittedCrossDomainPolicies,
        );
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      if (xXssProtection) {
        const [headerName, headerValue] = xXssProtectionHeader();
        headers.set(headerName, headerValue);
        forwardHeaders.add(headerName);
      }

      // If we have a `Request` and we're in the `edge-light` runtime, we assume
      // that this is Next.js middleware
      if (rt === "edge-light") {
        // Setting specific headers is the way that Next implements middleware
        // See: https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L148
        headers.set("x-middleware-next", "1");
        forwardHeaders.apply(headers);

        return new Response(null, {
          headers,
        });
      }

      // TODO: Are there any frameworks that use `Request` in middleware other
      // than Next.js?
      throw new Error("must be run as Next.js middleware");
    }

    // If we have an RequestEvent from SvelteKit, we need to do some weird stuff
    if (isEventLike(request)) {
      const headers: Record<string, string> = {};

      if (contentSecurityPolicy) {
        let builder;
        // TOOD: Does SvelteKit need the extra unsafe values for dev?
        if (env === "development" || env === "test") {
          builder = developmentContentSecurityPolicyHeader;
        } else {
          builder = productionContentSecurityPolicyHeader;
        }
        const [headerName, headerValue] = builder(contentSecurityPolicy);
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

      request.setHeaders(headers);
      return;
    }

    if (isResponseLike(response) && typeof next === "function") {
      if (contentSecurityPolicy) {
        let builder;
        // TOOD: Does Express or Nest need the extra unsafe values for dev?
        if (env === "development" || env === "test") {
          builder = developmentContentSecurityPolicyHeader;
        } else {
          builder = productionContentSecurityPolicyHeader;
        }
        const [headerName, headerValue] = builder(contentSecurityPolicy);
        response.setHeader(headerName, headerValue);
      }

      if (crossOriginEmbedderPolicy) {
        const [headerName, headerValue] = crossOriginEmbedderPolicyHeader(
          crossOriginEmbedderPolicy,
        );
        response.setHeader(headerName, headerValue);
      }

      if (crossOriginOpenerPolicy) {
        const [headerName, headerValue] = crossOriginOpenerPolicyHeader(
          crossOriginOpenerPolicy,
        );
        response.setHeader(headerName, headerValue);
      }

      if (crossOriginResourcePolicy) {
        const [headerName, headerValue] = crossOriginResourcePolicyHeader(
          crossOriginResourcePolicy,
        );
        response.setHeader(headerName, headerValue);
      }

      if (originAgentCluster) {
        const [headerName, headerValue] = originAgentClusterHeader();
        response.setHeader(headerName, headerValue);
      }

      if (referrerPolicy) {
        const [headerName, headerValue] = referrerPolicyHeader(referrerPolicy);
        response.setHeader(headerName, headerValue);
      }

      if (strictTransportSecurity) {
        const [headerName, headerValue] = strictTransportSecurityHeader(
          strictTransportSecurity,
        );
        response.setHeader(headerName, headerValue);
      }

      if (xContentTypeOptions) {
        const [headerName, headerValue] = xContentTypeOptionsHeader();
        response.setHeader(headerName, headerValue);
      }

      if (xDnsPrefetchControl) {
        const [headerName, headerValue] =
          xDnsPrefetchControlHeader(xDnsPrefetchControl);
        response.setHeader(headerName, headerValue);
      }

      if (xDownloadOptions) {
        const [headerName, headerValue] = xDownloadOptionsHeader();
        response.setHeader(headerName, headerValue);
      }

      if (xFrameOptions) {
        const [headerName, headerValue] = xFrameOptionsHeader(xFrameOptions);
        response.setHeader(headerName, headerValue);
      }

      if (xPermittedCrossDomainPolicies) {
        const [headerName, headerValue] = xPermittedCrossDomainPoliciesHeader(
          xPermittedCrossDomainPolicies,
        );
        response.setHeader(headerName, headerValue);
      }

      if (xXssProtection) {
        const [headerName, headerValue] = xXssProtectionHeader();
        response.setHeader(headerName, headerValue);
      }

      next();
    }
  };
}
