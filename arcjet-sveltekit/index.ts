import core from "arcjet";
import type {
  ArcjetDecision,
  ArcjetOptions as CoreOptions,
  Primitive,
  Product,
  ArcjetRequest,
  ExtraProps,
  Arcjet,
  CharacteristicProps,
} from "arcjet";
import findIp, { parseProxy } from "@arcjet/ip";
import { ArcjetHeaders } from "@arcjet/headers";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import { env } from "$env/dynamic/private";

// Re-export all named exports from the generic SDK
export * from "arcjet";

// TODO: Deduplicate with other packages
function errorMessage(err: unknown): string {
  if (err) {
    if (typeof err === "string") {
      return err;
    }

    if (
      typeof err === "object" &&
      "message" in err &&
      typeof err.message === "string"
    ) {
      return err.message;
    }
  }

  return "Unknown problem";
}

// Type helpers from https://github.com/sindresorhus/type-fest but adjusted for
// our use.
//
// Simplify:
// https://github.com/sindresorhus/type-fest/blob/964466c9d59c711da57a5297ad954c13132a0001/source/simplify.d.ts
// EmptyObject:
// https://github.com/sindresorhus/type-fest/blob/b9723d4785f01f8d2487c09ee5871a1f615781aa/source/empty-object.d.ts
//
// Licensed: MIT License Copyright (c) Sindre Sorhus <sindresorhus@gmail.com>
// (https://sindresorhus.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: The above copyright
// notice and this permission notice shall be included in all copies or
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};
declare const emptyObjectSymbol: unique symbol;
type WithoutCustomProps = {
  [emptyObjectSymbol]?: never;
};

type PlainObject = {
  [key: string]: unknown;
};

/**
 * Configuration for {@linkcode createRemoteClient}.
 */
export type RemoteClientOptions = {
  /**
   * Base URI for HTTP requests to Decide API (optional).
   *
   * Defaults to the environment variable `ARCJET_BASE_URL` (if that value
   * is known and allowed) and the standard production API otherwise.
   */
  baseUrl?: string;

  /**
   * Timeout in milliseconds for the Decide API (optional).
   *
   * Defaults to `500` in production and `1000` in development.
   */
  timeout?: number;
};

/**
 * Create a remote client.
 *
 * @param options
 *   Configuration (optional).
 * @returns
 *   Client.
 */
export function createRemoteClient(options?: RemoteClientOptions) {
  const url = options?.baseUrl ?? baseUrl(env);
  const timeout = options?.timeout ?? (isDevelopment(env) ? 1000 : 500);

  // Transport is the HTTP client that the client uses to make requests.
  const transport = createTransport(url);

  const sdkStack = "SVELTEKIT";
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  return createClient({
    transport,
    baseUrl: url,
    timeout,
    sdkStack,
    sdkVersion,
  });
}

/**
 * Cookies.
 *
 * This is the minimum interface similar to SvelteKit’s `Cookies`.
 *
 * @see https://svelte.dev/docs/kit/@sveltejs-kit#Cookies
 */
interface Cookies {
  /**
   * Gets all cookies that were previously set with `cookies.set`,
   * or from the request headers.
   *
   * @param options
   *   Configuration, passed directly to `cookie.parse`.
   *   See documentation [here](https://github.com/jshttp/cookie#cookieparsestr-options)
   * @returns
   *   Array of parsed cookies.
   */
  getAll(options?: unknown): Array<{ name: string; value: string }>;
}

/**
 * Request for the SvelteKit integration of Arcjet.
 *
 * This is the minimum interface similar to `RequestEvent`.
 *
 * @see https://svelte.dev/docs/kit/@sveltejs-kit#RequestEvent
 */
export interface ArcjetSvelteKitRequestEvent {
  /**
   * Get or set cookies related to the current request.
   */
  cookies: Cookies;
  /**
   * Client’s IP address, set by the adapter.
   */
  getClientAddress(): string;
  /**
   * Original request object.
   */
  request: Request;
  /**
   * Requested URL.
   */
  url: URL;
}

function cookiesToString(
  cookies: Array<{ name: string; value: string }> = [],
): string {
  return cookies
    .map((v) => `${v.name}=${encodeURIComponent(v.value)}`)
    .join("; ");
}

/**
 * Configuration for the SvelteKit integration of Arcjet.
 *
 * @template Rules
 *   List of rules.
 * @template Characteristics
 *   Characteristics to track a user by.
 */
export type ArcjetOptions<
  Rules extends [...Array<Primitive | Product>],
  Characteristics extends readonly string[],
> = Simplify<
  CoreOptions<Rules, Characteristics> & {
    /**
     * IP addresses and CIDR ranges of trusted load balancers and proxies
     * (optional, example: `["100.100.100.100", "100.100.100.0/24"]`).
     */
    proxies?: Array<string>;
  }
>;

/**
 * Instance of the SvelteKit integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a SvelteKit
 * request event should be handled.
 *
 * @template Props
 *   Configuration.
 */
export interface ArcjetSvelteKit<Props extends PlainObject> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param event
   *   Details about the {@linkcode ArcjetSvelteKitRequestEvent} that Arcjet
   *   needs to make a decision.
   * @param rest
   *   Additional properties required for running rules against a request.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   */
  protect(
    event: ArcjetSvelteKitRequestEvent,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...rest: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;

  /**
   * Augment the client with another rule.
   *
   * Useful for varying rules based on criteria in your handler such as
   * different rate limit for logged in users.
   *
   * @template Rule
   *   Type of rule.
   * @param rule
   *   Rule to add to Arcjet.
   * @returns
   *   Arcjet instance augmented with the given rule.
   */
  withRule<Rule extends Primitive | Product>(
    rule: Rule,
  ): ArcjetSvelteKit<Simplify<Props & ExtraProps<Rule>>>;
}

/**
 * Create a new SvelteKit integration of Arcjet.
 *
 * > 👉 **Tip**:
 * > build your initial base client with as many rules as possible outside of a
 * > request handler;
 * > if you need more rules inside handlers later then you can call `withRule()`
 * > on that base client.
 *
 * @template Rules
 *   List of rules.
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration.
 * @returns
 *   SvelteKit integration of Arcjet.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetSvelteKit<
  Simplify<ExtraProps<Rules> & CharacteristicProps<Characteristics>>
> {
  const client = options.client ?? createRemoteClient();

  const log = options.log
    ? options.log
    : new Logger({
        level: logLevel(env),
      });

  const proxies = Array.isArray(options.proxies)
    ? options.proxies.map(parseProxy)
    : undefined;

  if (isDevelopment(env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function toArcjetRequest<Props extends PlainObject>(
    event: ArcjetSvelteKitRequestEvent,
    props: Props,
  ): ArcjetRequest<Props> {
    const cookies = cookiesToString(event.cookies.getAll());

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(event.request.headers);

    let ip = findIp(
      {
        ip: event.getClientAddress(),
        headers,
      },
      { platform: platform(env), proxies },
    );
    if (ip === "") {
      // If the `ip` is empty but we're in development mode, we default the IP
      // so the request doesn't fail.
      if (isDevelopment(env)) {
        ip = "127.0.0.1";
      } else {
        log.warn(
          `Client IP address is missing. If this is a dev environment set the ARCJET_ENV env var to "development"`,
        );
      }
    }
    const method = event.request.method;
    const host = headers.get("host") ?? "";
    const path = event.url.pathname;
    const query = event.url.search;
    const protocol = event.url.protocol;

    return {
      ...props,
      ip,
      method,
      protocol,
      host,
      path,
      headers,
      cookies,
      query,
    };
  }

  function withClient<Props extends PlainObject>(
    aj: Arcjet<Props>,
  ): ArcjetSvelteKit<Props> {
    const client: ArcjetSvelteKit<Props> = {
      withRule(rule) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(request, props?) {
        // Cast of `{}` because here we switch from `undefined` (or
        // `WithoutCustomProps`) to `Props`.
        const req = toArcjetRequest(request, props ?? ({} as Props));

        const getBody = async () => {
          try {
            const clonedRequest = request.request.clone();
            // Awaited to throw if it rejects and we'll just return undefined
            const body = await clonedRequest.text();
            return body;
          } catch (e) {
            log.error("failed to get request body: %s", errorMessage(e));
            return;
          }
        };

        return aj.protect({ getBody }, req);
      },
    };

    return Object.freeze(client);
  }

  const aj = core({ ...options, client, log });

  return withClient(aj);
}
