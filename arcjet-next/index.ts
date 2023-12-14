import type { IncomingMessage } from "http";
import { Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { NextApiResponse } from "next";
import {
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
  NextResponse,
} from "next/server.js";
import type { NextMiddlewareResult } from "next/dist/server/web/types.js";
import arcjet, {
  ArcjetDecision,
  ArcjetOptions,
  Primitive,
  Product,
  ArcjetHeaders,
  Runtime,
  ArcjetRequest,
  EmptyObject,
  ExtraProps,
  RemoteClient,
  RemoteClientOptions,
  defaultBaseUrl,
  createRemoteClient,
} from "arcjet";
import findIP from "@arcjet/ip";

// Re-export all named exports from the generic SDK
export * from "arcjet";

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

export interface ArcjetNext<Rules extends (Primitive | Product)[]> {
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
    ...props: ExtraProps<Rules> extends EmptyObject ? [] : [ExtraProps<Rules>]
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
): ArcjetNext<Rules> {
  const client = options.client ?? createNextRemoteClient();

  const aj = arcjet({ ...options, client });

  return Object.freeze({
    get runtime() {
      return aj.runtime;
    },
    async protect(
      request: ArcjetNextRequest,
      ...[props]: ExtraProps<Rules> extends EmptyObject
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
 * Protects your Next.js application using Arcjet middleware. It will
 * automatically detect if the request is an API request or a page request and
 * return the appropriate response.
 *
 * @param key Your Arcjet key.
 * @param options Configuration options.
 * @param options.mode The mode to run in: `dry-run` or `live` (default:
 * `dry-run`). In `dry-run` mode, all requests will be allowed and you can
 * review what the action would have been from your dashboard. In `live` mode,
 * requests will be allowed, challenged or blocked based on the returned
 * decision.
 * @return A `NextResponse` instance that can be passed back to the client.
 */
export function createMiddleware<const Rules extends (Primitive | Product)[]>(
  // TODO(#221): This type needs to be tightened to only allow Primitives or Products that don't have extra props
  options: ArcjetOptions<Rules>,
  existingMiddleware?: NextMiddleware,
): NextMiddleware {
  const aj = arcjetNext(options);

  return async function middleware(
    request: NextRequest,
    event: NextFetchEvent,
  ): Promise<NextMiddlewareResult> {
    let decision = await aj.protect(request);

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

function isNextApiResponse(val: unknown): val is NextApiResponse {
  if (val === null) {
    return false;
  }

  if (typeof val !== "object") {
    return false;
  }

  if (!("status" in val)) {
    return false;
  }

  if (!("json" in val)) {
    return false;
  }

  if (typeof val.status !== "function" || typeof val.json !== "function") {
    return false;
  }

  return true;
}

/**
 * Wraps a Next.js page route, edge middleware, or an API route running on the
 * Edge Runtime.
 *
 * @param key Your Arcjet key.
 * @param options Configuration options.
 * @param options.mode The mode to run in: `dry-run` or `live` (default:
 * `dry-run`). In `dry-run` mode, all requests will be allowed and you can
 * review what the action would have been from your dashboard. In `live` mode,
 * requests will be allowed, challenged or blocked based on the returned
 * decision.
 * @returns If the request is allowed, the wrapped handler will be called. If
 * the request is blocked, a `NextApiResponse` instance will be returned based
 * on the configured decision response.
 */
export function withArcjet<
  Req extends IncomingMessage | Request,
  Rest extends unknown[],
  Res,
>(
  // TODO(#221): This type needs to be tightened to only allow Primitives or Products that don't have extra props
  arcjet: ArcjetNext<(Primitive<EmptyObject> | Product<EmptyObject>)[]>,
  handler: (request: Req, ...rest: Rest) => Promise<Res>,
) {
  return async (request: Req, ...rest: Rest) => {
    const response = rest[0];
    const decision = await arcjet.protect(request);
    if (decision.isDenied()) {
      if (isNextApiResponse(response)) {
        // TODO(#222): Content type negotiation using `Accept` header
        if (decision.reason.isRateLimit()) {
          return response
            .status(429)
            .json({ code: 429, message: "Too Many Requests" });
        } else {
          return response.status(403).json({ code: 403, message: "Forbidden" });
        }
      } else {
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
      }
    } else {
      return handler(request, ...rest);
    }
  };
}
