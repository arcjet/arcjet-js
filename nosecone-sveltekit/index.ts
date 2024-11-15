import nosecone, { defaultDirectives, defaults } from "nosecone";
import type { CspDirectives, NoseconeOptions } from "nosecone";

function applySvelteKitDefaults(options: NoseconeOptions): NoseconeOptions {
  if (
    typeof options.contentSecurityPolicy === "undefined" ||
    !options.contentSecurityPolicy
  ) {
    return options;
  }

  return {
    ...options,
    contentSecurityPolicy: false,
  };
}

// Setting specific headers is the way that Next implements middleware
// See: https://github.com/vercel/next.js/blob/5c45d58cd058a9683e435fd3a1a9b8fede8376c3/packages/next/src/server/web/spec-extension/response.ts#L148
function nextMiddlewareHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const forwardedHeaders: Record<string, string> = {
    "x-middleware-next": "1",
  };

  // This applies the needed headers to forward from Next.js middleware
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

export function createHook(options: NoseconeOptions = defaults) {
  return async ({
    event,
    resolve,
  }: {
    event: { setHeaders: any };
    resolve: any;
  }): Promise<Response> => {
    const opts = applySvelteKitDefaults(options);
    const headers = nosecone(opts);
    event.setHeaders(headers);
    return resolve(event);
  };
}

// TODO: Take config and use it to set directives
export function csp() {
  return {
    mode: "auto",
    directives: {
      "default-src": ["self"],
    },
  };
}
