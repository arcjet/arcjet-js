import { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  NextFetchEvent,
  NextMiddleware,
  NextRequest,
  NextResponse,
} from "next/server.js";
import arcjet, {
  ArcjetDecision,
  ArcjetOptions,
  Primitive,
  Product,
  ArcjetHeaders,
  Runtime,
  ArcjetRequest,
  ExtraProps,
  RemoteClient,
  RemoteClientOptions,
  defaultBaseUrl,
  createRemoteClient,
} from "arcjet";
import findIP from "@arcjet/ip";
import { NextMiddlewareResult } from "next/dist/server/web/types.js";

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

/**
 * Ensures redirects are followed to properly support the Next.js/Vercel Edge
 * Runtime.
 * @see
 * https://github.com/connectrpc/connect-es/issues/749#issuecomment-1693507516
 */
const followRedirectsInterceptor: Interceptor = (next) => (req) => {
  req.init.redirect = "follow";
  return next(req);
};

export function createNextRemoteClient(
  options?: RemoteClientOptions,
): RemoteClient {
  // The base URL for the Arcjet API. Will default to the standard production
  // API unless environment variable `ARCJET_BASE_URL` is set.
  const baseUrl = options?.baseUrl ?? defaultBaseUrl();

  // Transport is the HTTP client that the client uses to make requests.
  // The Connect Node client doesn't work on edge runtimes: https://github.com/bufbuild/connect-es/pull/589
  // so set the transport using connect-web. The interceptor is required for it work in the edge runtime.
  const transport =
    options?.transport ??
    createConnectTransport({
      baseUrl,
      interceptors: [followRedirectsInterceptor],
      fetch,
    });

  // TODO(#223): Do we want to allow overrides to either of these? If not, we should probably define a separate type for `options`
  const sdkStack = "NEXTJS";
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  return createRemoteClient({ ...options, transport, sdkStack, sdkVersion });
}

// Interface of fields that the Arcjet Next.js SDK expects on `Request` objects.
// This is the minimum interface that can be supplied via `NextRequest` and `NextApiRequest`
// in order for only 1 API to exist no matter which runtime the end-user targets
export interface ArcjetNextRequest {
  headers?: Record<string, string | string[] | undefined> | Headers;

  socket?: Partial<{ remoteAddress: string }>;

  info?: Partial<{ remoteAddress: string }>;

  requestContext?: Partial<{ identity: Partial<{ sourceIp: string }> }>;

  method?: string;

  httpVersion?: string;

  url?: string;

  ip?: string;

  nextUrl?: NextRequest["nextUrl"];
}

export interface ArcjetNext<Props extends PlainObject> {
  get runtime(): Runtime;
  /**
   * Protects an API route when running under the default runtime (non-edge).
   * For API routes running on the Edge Runtime, use `protect()`. The request is
   * analyzed and then a decision made on whether to allow, deny, or challenge
   * the request.
   *
   * @param req - A `NextApiRequest` or `NextRequest` provided to the request handler.
   * @param props - Additonal properties required for running rules against a request.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(
    request: ArcjetNextRequest,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...props: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;
}

/**
 * This is the main class for Arcjet when using Next.js. It provides several
 * methods for protecting Next.js routes depending on whether they are using the
 * Edge or Serverless Functions runtime.
 */
/**
 * Create a new Arcjet Next client. If possible, call this outside of the
 * request context so it persists across requests.
 *
 * @param key - The key to identify the site in Arcjet.
 * @param options - Arcjet configuration options to apply to all requests.
 * These can be overriden on a per-request basis by providing them to the
 * `protect()` or `protectApi` methods.
 */
export default function arcjetNext<const Rules extends (Primitive | Product)[]>(
  options: ArcjetOptions<Rules>,
): ArcjetNext<Simplify<ExtraProps<Rules>>> {
  const client = options.client ?? createNextRemoteClient();

  const aj = arcjet({ ...options, client });

  return Object.freeze({
    get runtime() {
      return aj.runtime;
    },
    async protect(
      request: ArcjetNextRequest,
      ...[props]: ExtraProps<Rules> extends WithoutCustomProps
        ? []
        : [ExtraProps<Rules>]
    ): Promise<ArcjetDecision> {
      // We construct an ArcjetHeaders to normalize over Headers
      const headers = new ArcjetHeaders(request.headers);

      const ip = findIP(request, headers);
      const method = request.method ?? "";
      const host = headers.get("host") ?? "";
      let path;
      // TODO(#224): nextUrl has formatting logic when you `toString` but we don't account for that here
      if (typeof request.nextUrl !== "undefined") {
        path = request.nextUrl.pathname + "?" + request.nextUrl.search;
      } else {
        path = request.url ?? "";
      }

      let extra: { [key: string]: string } = {};

      // If we're running on Vercel, we can add some extra information
      if (process.env["VERCEL"]) {
        // Vercel ID https://vercel.com/docs/concepts/edge-network/headers
        extra["vercel-id"] = headers.get("x-vercel-id") ?? "";
        // Vercel deployment URL
        // https://vercel.com/docs/concepts/edge-network/headers
        extra["vercel-deployment-url"] =
          headers.get("x-vercel-deployment-url") ?? "";
        // Vercel git commit SHA
        // https://vercel.com/docs/concepts/projects/environment-variables/system-environment-variables
        extra["vercel-git-commit-sha"] =
          process.env["VERCEL_GIT_COMMIT_SHA"] ?? "";
        extra["vercel-git-commit-sha"] =
          process.env["VERCEL_GIT_COMMIT_SHA"] ?? "";
      }

      const decision = await aj.protect({
        ...props,
        ip,
        method,
        protocol: "",
        host,
        path,
        headers,
        extra,
        // TODO(#220): The generic manipulations get really mad here, so we just cast it
      } as ArcjetRequest<Rules>);

      return decision;
    },
  });
}

/**
 * Protects your Next.js application using Arcjet middleware.
 *
 * @param arcjet An instantiated Arcjet SDK
 * @param middleware Any existing middleware you'd like to be called after
 * Arcjet decides a request is allowed.
 * @returns If the request is allowed, the next middleware or handler will be
 * called. If the request is denied, a `Response` will be returned immediately
 * and the no further middleware or handlers will be called.
 */
export function createMiddleware(
  arcjet: ArcjetNext<WithoutCustomProps>,
  existingMiddleware?: NextMiddleware,
): NextMiddleware {
  return async function middleware(
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> {
    let decision = await arcjet.protect(request);

    if (decision.isDenied()) {
      // TODO(#222): Content type negotiation using `Accept` header
      if (decision.reason.isRateLimit()) {
        return NextResponse.json(
          { code: 429, message: "Too Many Requests" },
          { status: 429 },
        );
      } else {
        return NextResponse.json(
          { code: 403, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else {
      if (typeof existingMiddleware === "function") {
        return existingMiddleware(request, event);
      } else {
        return NextResponse.next();
      }
    }
  };
}

/**
 * Wraps a Next.js page route, edge middleware, or an API route running on the
 * Edge Runtime.
 *
 * @param arcjet An instantiated Arcjet SDK
 * @param handler The request handler to wrap
 * @returns If the request is allowed, the wrapped `handler` will be called. If
 * the request is denied, a `Response` will be returned based immediately and
 * the wrapped `handler` will never be called.
 */
export function withArcjet(
  arcjet: ArcjetNext<WithoutCustomProps>,
  handler: (...args: any[]) => any,
) {
  return async (request: ArcjetNextRequest, ...rest: unknown[]) => {
    const decision = await arcjet.protect(request);
    if (decision.isDenied()) {
      // TODO(#222): Content type negotiation using `Accept` header
      if (decision.reason.isRateLimit()) {
        return NextResponse.json(
          { code: 429, message: "Too Many Requests" },
          { status: 429 },
        );
      } else {
        return NextResponse.json(
          { code: 403, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else {
      return handler(request, ...rest);
    }
  };
}
