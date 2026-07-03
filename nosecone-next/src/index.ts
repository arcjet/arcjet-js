// oxlint-disable-next-line import/no-named-as-default
import nosecone, { defaults as baseDefaults } from "nosecone";
import type { Options } from "nosecone";

export { withVercelToolbar, type Options, type NoseconeOptions } from "nosecone";

type BaseDirectives = (typeof baseDefaults)["contentSecurityPolicy"]["directives"];

/**
 * Nosecone Next.js defaults.
 *
 * The type spells out the concrete directive shape rather than the wider
 * `Options`: consumers extend the defaults by spreading
 * `defaults.contentSecurityPolicy.directives`, so every directive must stay
 * a concrete readonly array, as it was before `isolatedDeclarations` required
 * an explicit annotation here. Everything is derived from `typeof
 * baseDefaults` so the type cannot drift from the `nosecone` package.
 */
export const defaults: Omit<typeof baseDefaults, "contentSecurityPolicy"> & {
  readonly contentSecurityPolicy: {
    readonly directives: Omit<BaseDirectives, "scriptSrc" | "styleSrc"> & {
      readonly scriptSrc: readonly (
        | BaseDirectives["scriptSrc"][number]
        | ReturnType<typeof nextScriptSrc>[number]
      )[];
      readonly styleSrc: readonly (
        | BaseDirectives["styleSrc"][number]
        | ReturnType<typeof nextStyleSrc>[number]
      )[];
    };
  };
} = {
  ...baseDefaults,
  contentSecurityPolicy: {
    directives: {
      ...baseDefaults.contentSecurityPolicy.directives,
      scriptSrc: [...baseDefaults.contentSecurityPolicy.directives.scriptSrc, ...nextScriptSrc()],
      styleSrc: [...baseDefaults.contentSecurityPolicy.directives.styleSrc, ...nextStyleSrc()],
    },
  },
};

export { nosecone };

/**
 * Create security headers.
 *
 * @deprecated
 *   Use the named export `nosecone` instead.
 */
export default nosecone;

// The helpers below carry explicit return types because they are part of the
// public type of `defaults` (via `typeof`/`ReturnType`), which
// `isolatedDeclarations` requires to be declarable without inference.
function createNonce(): `'nonce-${string}'` {
  return `'nonce-${btoa(crypto.randomUUID())}'`;
}

function nextScriptSrc():
  | readonly [typeof createNonce, "'unsafe-eval'"]
  | readonly [typeof createNonce] {
  return process.env.NODE_ENV === "development"
    ? // Next.js hot reloading relies on `eval` so we enable it in development
      ([createNonce, "'unsafe-eval'"] as const)
    : ([createNonce] as const);
}

// Matches a `Content-Security-Policy` nonce source such as `'nonce-abc123'`,
// capturing the value without the surrounding `'nonce-'` and `'` syntax. This
// mirrors how Next.js extracts the nonce from the header so that the value
// returned by `nonce` is the same one Next.js applies to its own scripts. See:
// https://github.com/vercel/next.js/blob/647d923a3f140f9f484415406feee05aae9fd179/packages/next/src/server/app-render/get-script-nonce-from-header.tsx
const nonceSourceRegex = /^'nonce-([A-Za-z0-9+/_-]+={0,2})'$/;

/**
 * Extract the nonce from a `Content-Security-Policy` header value.
 *
 * @param value
 *   Value of the `Content-Security-Policy` header.
 * @returns
 *   The nonce, or `undefined` if there is no nonce in the header.
 */
function nonceFromContentSecurityPolicy(value: string): string | undefined {
  const directives = value
    // Directives are split by `;`.
    .split(";")
    .map((directive) => directive.trim());

  // First try to find the `script-src` directive, otherwise fall back to
  // `default-src`, matching the directives Next.js inspects.
  const directive =
    directives.find((directive) => directive.startsWith("script-src")) ??
    directives.find((directive) => directive.startsWith("default-src"));

  if (!directive) {
    return undefined;
  }

  // Skip the directive name (the first token) and return the first nonce.
  for (const source of directive.split(/\s+/).slice(1)) {
    const match = source.trim().match(nonceSourceRegex);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

/**
 * Get the `Content-Security-Policy` nonce for the current request.
 *
 * Nosecone generates a unique nonce for every request when the
 * `Content-Security-Policy` is configured with our defaults. Next.js applies
 * that nonce to the scripts it renders automatically, but third-party scripts
 * that do not use the Next.js `<Script>` component need the value passed in
 * manually. For example, PostHog requires the nonce in its `init` call.
 *
 * Call this from a Server Component, Route Handler, or anywhere else
 * `next/headers` is available. The page must be dynamically rendered for the
 * nonce to be available — see the example in the `README`.
 *
 * @returns
 *   The nonce for the current request, or `undefined` if the
 *   `Content-Security-Policy` is disabled or does not contain a nonce.
 */
export async function nonce(): Promise<string | undefined> {
  // Imported dynamically so that `next/headers`, which is server-only, is not
  // pulled into the Edge middleware bundle when `createMiddleware` is imported.
  const { headers } = await import("next/headers");
  const headerList = await headers();

  // Next.js copies the `Content-Security-Policy` response header set by our
  // middleware onto the request headers, so we can read the per-request nonce
  // back out of it here.
  const contentSecurityPolicy =
    headerList.get("content-security-policy") ??
    headerList.get("content-security-policy-report-only");

  if (typeof contentSecurityPolicy !== "string") {
    return undefined;
  }

  return nonceFromContentSecurityPolicy(contentSecurityPolicy);
}

function nextStyleSrc() {
  return ["'unsafe-inline'"] as const;
}

/**
 * Create Next.js middleware that sets secure headers on every request.
 *
 * @param options
 *   Configuration to provide to Nosecone.
 * @returns
 *   Next.js middleware that sets secure headers.
 */
export function createMiddleware(options: Options = defaults) {
  return async (): Promise<Response> => {
    const headers = nosecone(options);
    // Setting this specific header is the way that Next.js implements
    // middleware. See:
    // https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L148
    // Note: we don't create the `x-middleware-override-headers` header so
    // the original headers pass through
    headers.set("x-middleware-next", "1");

    return new Response(null, { headers });
  };
}
