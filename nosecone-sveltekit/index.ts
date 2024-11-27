import nosecone, {
  CONTENT_SECURITY_POLICY_DIRECTIVES,
  QUOTED,
  defaults as baseDefaults,
  NoseconeValidationError,
} from "nosecone";
import type { CspDirectives, NoseconeOptions } from "nosecone";
import type { Handle, KitConfig } from "@sveltejs/kit";

export const defaults = {
  ...baseDefaults,
  directives: {
    ...baseDefaults.contentSecurityPolicy.directives,
    scriptSrc: ["'strict-dynamic'"],
  },
} as const;

// We export `nosecone` as the default so it can be used with `new Response()`
export default nosecone;

/**
 * Create a SvelteKit hook that sets secure headers on every request.
 *
 * @param options: Configuration to provide to Nosecone
 * @returns A SvelteKit hook that sets secure headers
 */
export function createHook(options: NoseconeOptions = defaults): Handle {
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

type SvelteKitCsp = Exclude<KitConfig["csp"], undefined>;

export type ContentSecurityPolicyConfig = {
  mode?: SvelteKitCsp["mode"];
  directives?: CspDirectives;
  // TODO: Support `reportOnly`
};

function unquote(value?: string) {
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

    // TODO: Add validations for SvelteKit CSP directives

    const values = Array.from(resolvedValues);

    if (key === "upgrade-insecure-requests") {
      sveltekitDirectives[key] = true;
    } else {
      // @ts-ignore because we're mapping to SvelteKit options
      sveltekitDirectives[key] = values.map(unquote);
    }
  }

  return sveltekitDirectives;
}

export function csp(
  options: ContentSecurityPolicyConfig = { mode: "auto" },
): SvelteKitCsp {
  return {
    mode: options.mode ? options.mode : "auto",
    directives: directivesToSvelteKitConfig(
      options.directives ?? defaults.contentSecurityPolicy.directives,
    ),
  };
}
