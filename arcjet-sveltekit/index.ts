import { createConnectTransport as createConnectTransportNode } from "@connectrpc/connect-node";
import { createConnectTransport as createConnectTransportWeb } from "@connectrpc/connect-web";
import core, {
  ArcjetDecision,
  ArcjetOptions,
  Primitive,
  Product,
  ArcjetRequest,
  ExtraProps,
  RemoteClient,
  RemoteClientOptions,
  defaultBaseUrl,
  createRemoteClient,
  Arcjet,
} from "arcjet";
import findIP from "@arcjet/ip";
import ArcjetHeaders from "@arcjet/headers";
import { runtime } from "@arcjet/runtime";

// Re-export all named exports from the generic SDK
export * from "arcjet";

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

// The Vercel Adapter for SvelteKit could run on the Edge runtime, so we need to
// conditionally default the transport.
function defaultTransport(baseUrl: string) {
  if (runtime() === "edge-light") {
    return createConnectTransportWeb({
      baseUrl,
      interceptors: [
        /**
         * Ensures redirects are followed to properly support the Next.js/Vercel Edge
         * Runtime.
         * @see
         * https://github.com/connectrpc/connect-es/issues/749#issuecomment-1693507516
         */
        (next) => (req) => {
          req.init.redirect = "follow";
          return next(req);
        },
      ],
      fetch,
    });
  } else {
    return createConnectTransportNode({
      baseUrl,
      httpVersion: "2",
    });
  }
}

export function createSvelteKitRemoteClient(
  options?: RemoteClientOptions,
): RemoteClient {
  // The base URL for the Arcjet API. Will default to the standard production
  // API unless environment variable `ARCJET_BASE_URL` is set.
  const baseUrl = options?.baseUrl ?? defaultBaseUrl();

  // Transport is the HTTP client that the client uses to make requests.
  const transport = options?.transport ?? defaultTransport(baseUrl);

  // TODO(#223): Do we want to allow overrides to either of these? If not, we should probably define a separate type for `options`
  const sdkStack = "SVELTEKIT";
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  return createRemoteClient({ ...options, transport, sdkStack, sdkVersion });
}

interface Cookies {
  getAll(opts?: unknown): Array<{ name: string; value: string }>;
}

// Interface of fields that the Arcjet SvelteKit SDK expects on `RequestEvent`
// objects.
export interface ArcjetSvelteKitRequestEvent {
  cookies: Cookies;
  getClientAddress(): string;
  request: Request;
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
 * The ArcjetSvelteKit client provides a public `protect()` method to
 * make a decision about how a SvelteKit request should be handled.
 */
export interface ArcjetSvelteKit<Props extends PlainObject> {
  /**
   * Runs a `RequestEvent` through the configured protections. The request is
   * analyzed and then a decision made on whether to allow, deny, or challenge
   * the request.
   *
   * @param event - A `RequestEvent` provided to the handler.
   * @param props - Additonal properties required for running rules against a request.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(
    event: ArcjetSvelteKitRequestEvent,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...props: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;

  /**
   * Augments the client with another rule. Useful for varying rules based on
   * criteria in your handler—e.g. different rate limit for logged in users.
   *
   * @param rule The rule to add to this execution.
   * @returns An augmented {@link ArcjetSvelteKit} client.
   */
  withRule<Rule extends Primitive | Product>(
    rule: Rule,
  ): ArcjetSvelteKit<Simplify<Props & ExtraProps<Rule>>>;
}

function toArcjetRequest<Props extends PlainObject>(
  event: ArcjetSvelteKitRequestEvent,
  props: Props,
): ArcjetRequest<Props> {
  const cookies = cookiesToString(event.cookies.getAll());

  // We construct an ArcjetHeaders to normalize over Headers
  const headers = new ArcjetHeaders(event.request.headers);

  const ip = findIP(
    {
      ip: event.getClientAddress(),
    },
    headers,
  );
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

function withClient<const Rules extends (Primitive | Product)[]>(
  aj: Arcjet<ExtraProps<Rules>>,
): ArcjetSvelteKit<ExtraProps<Rules>> {
  return Object.freeze({
    withRule(rule: Primitive | Product) {
      const client = aj.withRule(rule);
      return withClient(client);
    },
    async protect(
      request: ArcjetSvelteKitRequestEvent,
      ...[props]: ExtraProps<Rules> extends WithoutCustomProps
        ? []
        : [ExtraProps<Rules>]
    ): Promise<ArcjetDecision> {
      // TODO(#220): The generic manipulations get really mad here, so we cast
      // Further investigation makes it seem like it has something to do with
      // the definition of `props` in the signature but it's hard to track down
      const req = toArcjetRequest(request, props ?? {}) as ArcjetRequest<
        ExtraProps<Rules>
      >;

      return aj.protect({}, req);
    },
  });
}

/**
 * Create a new {@link ArcjetSvelteKit} client. Always build your initial client
 * outside of a request handler so it persists across requests. If you need to
 * augment a client inside a handler, call the `withRule()` function on the base
 * client.
 *
 * @param options - Arcjet configuration options to apply to all requests.
 */
export default function arcjet<const Rules extends (Primitive | Product)[]>(
  options: ArcjetOptions<Rules>,
): ArcjetSvelteKit<Simplify<ExtraProps<Rules>>> {
  const client = options.client ?? createSvelteKitRemoteClient();

  const aj = core({ ...options, client });

  return withClient(aj);
}
