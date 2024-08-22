import type { NextApiResponse } from "next";
import { NextResponse } from "next/server.js";
import type {
  NextFetchEvent,
  NextMiddleware,
  NextRequest,
} from "next/server.js";
import type { NextMiddlewareResult } from "next/dist/server/web/types.js";
import core from "arcjet";
import type {
  ArcjetDecision,
  ArcjetOptions,
  Primitive,
  Product,
  ArcjetRequest,
  ExtraProps,
  Arcjet,
  CharacteristicProps,
} from "arcjet";
import findIP from "@arcjet/ip";
import ArcjetHeaders from "@arcjet/headers";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";

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

export type RemoteClientOptions = {
  baseUrl?: string;
  timeout?: number;
};

export function createRemoteClient(options?: RemoteClientOptions) {
  // The base URL for the Arcjet API. Will default to the standard production
  // API unless environment variable `ARCJET_BASE_URL` is set.
  const url = options?.baseUrl ?? baseUrl(process.env);

  // The timeout for the Arcjet API in milliseconds. This is set to a low value
  // in production so calls fail open.
  const timeout = options?.timeout ?? (isDevelopment(process.env) ? 1000 : 500);

  // Transport is the HTTP client that the client uses to make requests.
  const transport = createTransport(url);

  const sdkStack = "NEXTJS";
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  return createClient({
    transport,
    baseUrl: url,
    timeout,
    sdkStack,
    sdkVersion,
  });
}

// Interface of fields that the Arcjet Next.js SDK expects on `Request` objects.
// This is the minimum interface that can be supplied via `NextRequest` and `NextApiRequest`
// in order for only 1 API to exist no matter which runtime the end-user targets
export interface ArcjetNextRequest {
  headers?: Record<string, string | string[] | undefined> | Headers;

  socket?: Partial<{ remoteAddress: string; encrypted: boolean }>;

  info?: Partial<{ remoteAddress: string }>;

  requestContext?: Partial<{ identity: Partial<{ sourceIp: string }> }>;

  method?: string;

  httpVersion?: string;

  url?: string;

  ip?: string;

  nextUrl?: Partial<{ pathname: string; search: string; protocol: string }>;

  cookies?:
    | {
        [Symbol.iterator](): IterableIterator<
          [string, { name: string; value: string }]
        >;
      }
    | Partial<{ [key: string]: string }>;

  clone?: () => Request;
  body?: unknown;
}

function isIterable(val: any): val is Iterable<any> {
  return typeof val?.[Symbol.iterator] === "function";
}

function cookiesToArray(
  cookies?: ArcjetNextRequest["cookies"],
): { name: string; value: string }[] {
  if (typeof cookies === "undefined") {
    return [];
  }

  if (isIterable(cookies)) {
    return Array.from(cookies).map(([_, cookie]) => cookie);
  } else {
    return Object.entries(cookies).map(([name, value]) => ({
      name,
      value: value ?? "",
    }));
  }
}

function cookiesToString(cookies?: ArcjetNextRequest["cookies"]): string {
  // This is essentially the implementation of `RequestCookies#toString` in
  // Next.js but normalized for NextApiRequest cookies object
  return cookiesToArray(cookies)
    .map((v) => `${v.name}=${encodeURIComponent(v.value)}`)
    .join("; ");
}

/**
 * The ArcjetNext client provides a public `protect()` method to
 * make a decision about how a Next.js request should be handled.
 */
export interface ArcjetNext<Props extends PlainObject> {
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

  /**
   * Augments the client with another rule. Useful for varying rules based on
   * criteria in your handler—e.g. different rate limit for logged in users.
   *
   * @param rule The rule to add to this execution.
   * @returns An augmented {@link ArcjetNext} client.
   */
  withRule<Rule extends Primitive | Product>(
    rule: Rule,
  ): ArcjetNext<Simplify<Props & ExtraProps<Rule>>>;
}

/**
 * Create a new {@link ArcjetNext} client. Always build your initial client
 * outside of a request handler so it persists across requests. If you need to
 * augment a client inside a handler, call the `withRule()` function on the base
 * client.
 *
 * @param options - Arcjet configuration options to apply to all requests.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNext<
  Simplify<ExtraProps<Rules> & CharacteristicProps<Characteristics>>
> {
  const client = options.client ?? createRemoteClient();

  const log = options.log
    ? options.log
    : new Logger({
        level: logLevel(process.env),
      });

  function toArcjetRequest<Props extends PlainObject>(
    request: ArcjetNextRequest,
    props: Props,
  ): ArcjetRequest<Props> {
    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    let ip = findIP(request, headers, { platform: platform(process.env) });
    if (ip === "") {
      // If the `ip` is empty but we're in development mode, we default the IP
      // so the request doesn't fail.
      if (isDevelopment(process.env)) {
        log.warn("Using 127.0.0.1 as IP address in development mode");
        ip = "127.0.0.1";
      } else {
        log.warn(
          `Client IP address is missing. If this is a dev environment set the ARCJET_ENV env var to "development"`,
        );
      }
    }
    const method = request.method ?? "";
    const host = headers.get("host") ?? "";
    let path = "";
    let query = "";
    let protocol = "";
    // TODO(#36): nextUrl has formatting logic when you `toString` but
    // we don't account for that here
    if (typeof request.nextUrl !== "undefined") {
      path = request.nextUrl.pathname ?? "";
      if (typeof request.nextUrl.search !== "undefined") {
        query = request.nextUrl.search;
      }
      if (typeof request.nextUrl.protocol !== "undefined") {
        protocol = request.nextUrl.protocol;
      }
    } else {
      if (typeof request.socket?.encrypted !== "undefined") {
        protocol = request.socket.encrypted ? "https:" : "http:";
      } else {
        protocol = "http:";
      }
      // Do some very simple validation, but also try/catch around URL parsing
      if (
        typeof request.url !== "undefined" &&
        request.url !== "" &&
        host !== ""
      ) {
        try {
          const url = new URL(request.url, `${protocol}//${host}`);
          path = url.pathname;
          query = url.search;
          protocol = url.protocol;
        } catch {
          // If the parsing above fails, just set the path as whatever url we
          // received.
          path = request.url ?? "";
          log.warn('Unable to parse URL. Using "%s" as `path`.', path);
        }
      } else {
        path = request.url ?? "";
      }
    }
    const cookies = cookiesToString(request.cookies);

    const extra: { [key: string]: string } = {};

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
    return {
      ...props,
      ...extra,
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
  ): ArcjetNext<ExtraProps<Rules>> {
    return Object.freeze({
      withRule(rule: Primitive | Product) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(
        request: ArcjetNextRequest,
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

        const getBody = async () => {
          try {
            if (typeof request.clone === "function") {
              const cloned = request.clone();
              return await cloned.text();
            } else if (typeof request.body === "string") {
              return;
            } else if (
              typeof request.body !== "undefined" &&
              // BigInt cannot be serialized with JSON.stringify
              typeof request.body !== "bigint"
            ) {
              return JSON.stringify(request.body);
            } else {
              log.warn("no body available");
              return;
            }
          } catch (e) {
            log.error("failed to get request body: %s", errorMessage(e));
            return;
          }
        };

        return aj.protect({ getBody }, req);
      },
    });
  }

  const aj = core({ ...options, client, log });

  return withClient(aj);
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
 * @param arcjet An instantiated Arcjet SDK
 * @param handler The request handler to wrap
 * @returns If the request is allowed, the wrapped `handler` will be called. If
 * the request is denied, a `Response` will be returned based immediately and
 * the wrapped `handler` will never be called.
 */
export function withArcjet<Args extends [ArcjetNextRequest, ...unknown[]], Res>(
  arcjet: ArcjetNext<WithoutCustomProps>,
  handler: (...args: Args) => Promise<Res>,
) {
  return async (...args: Args) => {
    const request = args[0];
    const response = args[1];
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
      return handler(...args);
    }
  };
}
