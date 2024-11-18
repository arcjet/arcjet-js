import nosecone, { defaults } from "nosecone";
import type { CspDirectives, NoseconeOptions } from "nosecone";

// We export `nosecone` as the default so it can be used with `new Response()`
export default nosecone;

function nonce() {
  return `'nonce-${btoa(crypto.randomUUID())}'` as const;
}

const defaultDirectives = defaults.contentSecurityPolicy.directives;

function applyNextDefaults(options: NoseconeOptions): NoseconeOptions {
  if (
    typeof options.contentSecurityPolicy === "undefined" ||
    !options.contentSecurityPolicy
  ) {
    return options;
  }

  const directives =
    options.contentSecurityPolicy === true ||
    typeof options.contentSecurityPolicy.directives === "undefined"
      ? defaultDirectives
      : options.contentSecurityPolicy.directives;

  let scriptSrc: CspDirectives["scriptSrc"];
  if (directives.scriptSrc === true) {
    scriptSrc = defaultDirectives.scriptSrc;
  } else {
    scriptSrc = directives.scriptSrc;
  }
  if (scriptSrc) {
    const scriptSrcSet = new Set(scriptSrc);
    scriptSrcSet.delete("'self'");
    scriptSrcSet.add(nonce());
    scriptSrcSet.add("'strict-dynamic'");
    // Next.js hot reloading relies on `eval` so we enable it in development
    if (process.env.NODE_ENV === "development") {
      scriptSrcSet.add("'unsafe-eval'");
    }
    scriptSrc = Array.from(scriptSrcSet);
  }

  let styleSrc: CspDirectives["styleSrc"];
  if (directives.styleSrc === true) {
    styleSrc = defaultDirectives.styleSrc;
  } else {
    styleSrc = directives.styleSrc;
  }
  if (styleSrc) {
    const styleSrcSet = new Set(styleSrc);
    styleSrcSet.add("'unsafe-inline'");
    styleSrc = Array.from(styleSrcSet);
  }

  return {
    ...options,
    contentSecurityPolicy: {
      directives: {
        ...directives,
        scriptSrc,
        styleSrc,
      },
    },
  };
}

// Setting specific headers is the way that Next.js implements middleware
// See: https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L148
function nextMiddlewareHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const forwardedHeaders: Record<string, string> = {
    "x-middleware-next": "1",
  };

  // This applies the logic to forward headers from Next.js middleware
  // https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L22-L27
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (typeof headerValue !== "string") {
      throw new Error(`impossible: missing value for ${headerName}`);
    }
    forwardedHeaders[`x-middleware-request-${headerName}`] = headerValue;
  }
  forwardedHeaders["x-middleware-override-headers"] =
    Object.keys(headers).join(",");

  return forwardedHeaders;
}

/**
 * Create Next.js middleware that sets secure headers on every request.
 *
 * @param options: Configuration to provide to Nosecone
 * @returns Next.js middleware that sets secure headers
 */
export function createMiddleware(options: NoseconeOptions = defaults) {
  return async () => {
    const opts = applyNextDefaults(options);
    const headers = nosecone(opts);

    return new Response(null, {
      headers: {
        ...headers,
        ...nextMiddlewareHeaders(headers),
      },
    });
  };
}
