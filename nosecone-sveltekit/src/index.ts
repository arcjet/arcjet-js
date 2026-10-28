// oxlint-disable-next-line import/no-named-as-default
import nosecone, {
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  QUOTED,
  defaults as baseDefaults,
  NoseconeValidationError,
} from "nosecone";
import type { CspDirectives, Options } from "nosecone";

export { withVercelToolbar, type Options, type NoseconeOptions } from "nosecone";

/**
 * Nosecone SvelteKit defaults.
 */
export const defaults = {
  ...baseDefaults,
  directives: {
    ...baseDefaults.contentSecurityPolicy.directives,
    scriptSrc: ["'strict-dynamic'"],
  },
} as const;

export { nosecone };

// SvelteKit 2 exports `Handle` and `KitConfig` from `@sveltejs/kit`, SvelteKit 3
// exports `Handle` from `@sveltejs/kit/hooks` and its config from
// `@sveltejs/kit/vite`. Declare the shapes we need so our types work with both.

/**
 * SvelteKit `handle` hook.
 */
type Handle = <Event>(input: {
  event: Event;
  resolve: (event: Event) => Promise<Response> | Response;
}) => Promise<Response>;

/**
 * SvelteKit `csp` configuration.
 */
type SvelteKitCsp = {
  mode?: "hash" | "nonce" | "auto";
  directives?: Record<string, string[] | boolean>;
};

/**
 * Create security headers.
 *
 * @deprecated
 *   Use the named export `nosecone` instead.
 */
export default nosecone;

/**
 * Create a SvelteKit hook that sets secure headers on every request.
 *
 * @param options
 *   Configuration to provide to Nosecone.
 * @returns
 *   SvelteKit hook that sets secure headers.
 */
export function createHook(options: Options = defaults): Handle {
  return async ({ event, resolve }) => {
    const response = await resolve(event);

    const headers = nosecone(options);
    for (const [headerName, headerValue] of headers.entries()) {
      // Only add headers that aren't already set. For example, SvelteKit will
      // likely have added `Content-Security-Policy` if configured with `csp`
      if (!response.headers.has(headerName)) {
        response.headers.set(headerName, headerValue);
      }
    }

    return response;
  };
}

/**
 * Content Security Policy configuration for SvelteKit.
 */
export type ContentSecurityPolicyConfig = {
  /**
   * Mode of the `Content-Security-Policy` header.
   */
  mode?: SvelteKitCsp["mode"] | undefined;
  /**
   * Directives to use in the `Content-Security-Policy` header.
   */
  directives?: CspDirectives | undefined;
  // TODO: Support `reportOnly`
};

function unquote(value: string) {
  for (const [unquoted, quoted] of QUOTED) {
    if (value === quoted) {
      return unquoted;
    }
  }

  return value;
}

function resolveValue(v: (() => string) | string) {
  if (typeof v === "function") {
    return v();
  } else {
    return v;
  }
}

function directivesToSvelteKitConfig(
  directives: Readonly<CspDirectives>,
): SvelteKitCsp["directives"] {
  const sveltekitDirectives: SvelteKitCsp["directives"] = {};
  for (const [optionKey, optionValues] of Object.entries(directives)) {
    const key = CONTENT_SECURITY_POLICY_DIRECTIVES.get(optionKey);
    if (!key) {
      throw new NoseconeValidationError(`${optionKey} is not a Content-Security-Policy directive`);
    }

    // Skip anything falsey
    if (!optionValues) {
      continue;
    }

    // TODO: What do we want to do if array is empty? I think they work differently for some directives
    const resolvedValues = Array.isArray(optionValues)
      ? new Set(optionValues.map(resolveValue))
      : new Set<string>();

    // TODO: Add validations for SvelteKit CSP directives

    const values = Array.from(resolvedValues);

    if (key === "upgrade-insecure-requests") {
      sveltekitDirectives[key] = true;
    } else {
      sveltekitDirectives[key] = values.map(unquote);
    }
  }

  return sveltekitDirectives;
}

/**
 * Create a SvelteKit Content Security Policy configuration.
 *
 * @param options
 *   Configuration.
 * @returns
 *   SvelteKit Content Security Policy configuration.
 */
export function csp(options?: ContentSecurityPolicyConfig): SvelteKitCsp {
  return {
    mode: options?.mode ? options.mode : "auto",
    directives:
      directivesToSvelteKitConfig(
        options?.directives ?? defaults.contentSecurityPolicy.directives,
      ) || {},
  };
}
