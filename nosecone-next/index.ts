import nosecone, { defaults as baseDefaults } from "nosecone";
import type { NoseconeOptions } from "nosecone";

export const defaults = {
  ...baseDefaults,
  contentSecurityPolicy: {
    directives: {
      ...baseDefaults.contentSecurityPolicy.directives,
      scriptSrc:
        // Replace the defaults to remove `'self'`
        process.env.NODE_ENV === "development"
          ? ([nonce, "'strict-dynamic'"] as const)
          : // Next.js hot reloading relies on `eval` so we enable it in development
            ([nonce, "'strict-dynamic'", "'unsafe-eval'"] as const),
      styleSrc: [
        ...baseDefaults.contentSecurityPolicy.directives.styleSrc,
        "'unsafe-inline'",
      ],
    },
  },
} as const;

// We export `nosecone` as the default so it can be used with `new Response()`
export default nosecone;

function nonce() {
  return `'nonce-${btoa(crypto.randomUUID())}'` as const;
}

/**
 * Create Next.js middleware that sets secure headers on every request.
 *
 * @param options: Configuration to provide to Nosecone
 * @returns Next.js middleware that sets secure headers
 */
export function createMiddleware(options: NoseconeOptions = defaults) {
  return async () => {
    const headers = nosecone(options);

    return new Response(null, {
      headers: {
        ...headers,
        // Setting this specific header is the way that Next.js implements
        // middleware. See:
        // https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L148
        // Note: we don't create the `x-middleware-override-headers` header so
        // the original headers pass through
        "x-middleware-next": "1",
      },
    });
  };
}
