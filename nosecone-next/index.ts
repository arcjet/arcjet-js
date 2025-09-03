import nosecone, { defaults as baseDefaults } from "nosecone";
import type { Options } from "nosecone";

export {
  withVercelToolbar,
  type Options,
  type NoseconeOptions,
} from "nosecone";

/**
 * Nosecone Next.js defaults.
 */
export const defaults = {
  ...baseDefaults,
  contentSecurityPolicy: {
    directives: {
      ...baseDefaults.contentSecurityPolicy.directives,
      scriptSrc: [
        ...baseDefaults.contentSecurityPolicy.directives.scriptSrc,
        ...nextScriptSrc(),
      ],
      styleSrc: [
        ...baseDefaults.contentSecurityPolicy.directives.styleSrc,
        ...nextStyleSrc(),
      ],
    },
  },
} as const;

export { nosecone };

/**
 * Create security headers.
 *
 * @deprecated
 *   Use the named export `nosecone` instead.
 */
export default nosecone;

function nonce() {
  return `'nonce-${btoa(crypto.randomUUID())}'` as const;
}

function nextScriptSrc() {
  return process.env.NODE_ENV === "development"
    ? // Next.js hot reloading relies on `eval` so we enable it in development
      ([nonce, "'unsafe-eval'"] as const)
    : ([nonce] as const);
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
