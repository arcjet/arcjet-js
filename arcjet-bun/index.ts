/// <reference types="bun-types/bun.d.ts" />
import { createConnectTransport } from "@connectrpc/connect-node";
import core, {
  ArcjetDecision,
  ArcjetOptions,
  Primitive,
  Product,
  Runtime,
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
import type { Server } from "bun";

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

export function createBunRemoteClient(
  options?: RemoteClientOptions,
): RemoteClient {
  // The base URL for the Arcjet API. Will default to the standard production
  // API unless environment variable `ARCJET_BASE_URL` is set.
  const baseUrl = options?.baseUrl ?? defaultBaseUrl();

  // Transport is the HTTP client that the client uses to make requests.
  const transport =
    options?.transport ??
    createConnectTransport({
      baseUrl,
      httpVersion: "1.1",
    });

  // TODO(#223): Do we want to allow overrides to either of these? If not, we should probably define a separate type for `options`
  const sdkStack = "BUN";
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  return createRemoteClient({ ...options, transport, sdkStack, sdkVersion });
}

/**
 * The ArcjetBun client provides a public `protect()` method to
 * make a decision about how a Bun.sh request should be handled.
 */
export interface ArcjetBun<Props extends PlainObject> {
  get runtime(): Runtime;
  /**
   * Runs a request through the configured protections. The request is
   * analyzed and then a decision made on whether to allow, deny, or challenge
   * the request.
   *
   * @param request - A `Request` provided to the fetch handler.
   * @param props - Additonal properties required for running rules against a request.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(
    request: Request,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...props: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;

  /**
   * Augments the client with another rule. Useful for varying rules based on
   * criteria in your handler—e.g. different rate limit for logged in users.
   *
   * @param rule The rule to add to this execution.
   * @returns An augmented {@link ArcjetBun} client.
   */
  withRule<Rule extends Primitive | Product>(
    rule: Rule,
  ): ArcjetBun<Simplify<Props & ExtraProps<Rule>>>;

  /**
   * Wraps the Bun.sh `fetch` handler to provide additional Request details
   * when calling the SDK's `protect()` function.
   *
   * @param fetch: The user provided `fetch` handler
   */
  handler(
    fetch: (
      this: Server,
      request: Request,
      server: Server,
    ) => Response | Promise<Response>,
  ): (
    this: Server,
    request: Request,
    server: Server,
  ) => Response | Promise<Response>;
}

// This is provided with an `ipCache` where it attempts to lookup the IP. This
// is primarily a workaround to the API design in Bun that requires access to
// the `Server` to lookup an IP.
function toArcjetRequest<Props extends PlainObject>(
  ipCache: WeakMap<Request, string>,
  request: Request,
  props: Props,
): ArcjetRequest<Props> {
  const cookies = request.headers.get("cookie") ?? undefined;

  // We construct an ArcjetHeaders to normalize over Headers
  const headers = new ArcjetHeaders(request.headers);

  const url = new URL(request.url);
  const ip = findIP(
    {
      ip: ipCache.get(request),
    },
    headers,
  );

  return {
    ...props,
    ip,
    method: request.method,
    protocol: url.protocol,
    host: url.host,
    path: url.pathname,
    headers,
    cookies,
    query: url.search,
  };
}

function withClient<const Rules extends (Primitive | Product)[]>(
  aj: Arcjet<ExtraProps<Rules>>,
): ArcjetBun<ExtraProps<Rules>> {
  // Assuming the `handler()` function was used around Bun's fetch handler
  // this WeakMap should be populated with IP addresses inspected via
  // `server.requestIP()`
  const ipCache = new WeakMap<Request, string>();

  return Object.freeze({
    get runtime() {
      return aj.runtime;
    },
    withRule(rule: Primitive | Product) {
      const client = aj.withRule(rule);
      return withClient(client);
    },
    async protect(
      request: Request,
      ...[props]: ExtraProps<Rules> extends WithoutCustomProps
        ? []
        : [ExtraProps<Rules>]
    ): Promise<ArcjetDecision> {
      // TODO(#220): The generic manipulations get really mad here, so we cast
      // Further investigation makes it seem like it has something to do with
      // the definition of `props` in the signature but it's hard to track down
      const req = toArcjetRequest(
        ipCache,
        request,
        props ?? {},
      ) as ArcjetRequest<ExtraProps<Rules>>;

      return aj.protect(req);
    },
    handler(
      fetch: (
        this: Server,
        request: Request,
        server: Server,
      ) => Response | Promise<Response>,
    ) {
      return async function (
        request: Request,
        server: Server,
      ): Promise<Response> {
        const socketAddress = server.requestIP(request);
        if (socketAddress) {
          ipCache.set(request, socketAddress.address);
        }

        return fetch.call(server, request, server);
      };
    },
  });
}

/**
 * Create a new {@link ArcjetBun} client. Always build your initial client
 * outside of a request handler so it persists across requests. If you need to
 * augment a client inside a handler, call the `withRule()` function on the base
 * client.
 *
 * @param options - Arcjet configuration options to apply to all requests.
 */
export default function arcjet<const Rules extends (Primitive | Product)[]>(
  options: ArcjetOptions<Rules>,
): ArcjetBun<Simplify<ExtraProps<Rules>>> {
  const client = options.client ?? createBunRemoteClient();

  const aj = core({ ...options, client });

  return withClient(aj);
}
