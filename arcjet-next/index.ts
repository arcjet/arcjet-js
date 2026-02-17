import type { NextApiRequest, NextApiResponse } from "next";
import { NextResponse } from "next/server.js";
import { headers, cookies } from "next/headers.js";
import type {
  NextFetchEvent,
  NextMiddleware,
  NextRequest,
} from "next/server.js";
import type { NextMiddlewareResult } from "next/dist/server/web/types.js";
import core from "arcjet";
import type {
  ArcjetDecision,
  ArcjetOptions as CoreOptions,
  ArcjetRuleResult,
  ArcjetRule,
  Primitive,
  Product,
  ArcjetRequest,
  ExtraProps,
  Arcjet,
  CharacteristicProps,
} from "arcjet";
import { readBodyWeb } from "@arcjet/body";
import { findIp, parseProxy } from "@arcjet/ip";
import { ArcjetHeaders } from "@arcjet/headers";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";

// Re-export all named exports from the generic SDK
export * from "arcjet";

let warnedForAutomaticBodyRead = false;

/**
 * Get minimal request details (cookies, headers).
 *
 * This function can be used in server components, server actions,
 * route handlers, and middleware.
 *
 * @returns
 *   Promise that resolves to the request details.
 */
export async function request(): Promise<ArcjetNextRequest> {
  const hdrs = await headers();
  const cook = await cookies();

  const cookieEntries = cook
    .getAll()
    .map((cookie) => [cookie.name, cookie.value]);

  return {
    headers: hdrs,
    cookies: Object.fromEntries(cookieEntries),
  };
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

type PlainObject = {
  [key: string]: unknown;
};

/**
 * Dynamically generate whether zero or one `properties` object must or can be passed.
 */
type MaybeProperties<T> =
  // If all properties of `T` are optional:
  { [P in keyof T]?: T[P] } extends T
    ? // If `T` has no properties at all:
      T extends { [emptyObjectSymbol]?: never }
      ? // Then it is assumed that nothing can be passed.
        []
      : // Then it is assumed that the object can be omitted.
        [properties?: T]
    : // Then it is assumed the object must be passed.
      [properties: T];

/**
 * Additional options that can be passed to protect() method.
 *
 * @template DisableAutoIp
 *   Whether automatic IP detection is disabled.
 */
type ProtectOptions<DisableAutoIp extends boolean | undefined> =
  DisableAutoIp extends true ? { ipSrc: string } : { ipSrc?: string };

/**
 * Combined properties and options for protect() method.
 *
 * @template Props
 *   Properties required for running rules.
 * @template DisableAutoIp
 *   Whether automatic IP detection is disabled.
 */
type PropsWithOptions<
  Props extends PlainObject,
  DisableAutoIp extends boolean | undefined,
> = Props & ProtectOptions<DisableAutoIp>;

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
  const url = options?.baseUrl ?? baseUrl(process.env);
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

/**
 * Request for the Next.js integration of Arcjet.
 *
 * This is the minimum interface that can be supplied via
 * {@linkcode NextRequest} and {@linkcode NextApiRequest},
 * but also from our {@linkcode request} helper in server components,
 * server actions, route handlers, and middleware.
 */
export interface ArcjetNextRequest {
  /**
   * Headers of the request.
   */
  headers?: Record<string, string | string[] | undefined> | Headers;

  /**
   * `net.Socket` object associated with the connection.
   *
   * This field is available on Express requests,
   * as those inherit from Node `http.IncomingMessage`.
   *
   * See <https://nodejs.org/api/http.html#messagesocket>.
   */
  socket?: Partial<{ remoteAddress: string; encrypted: boolean }>;

  /**
   * Some platforms pass `info`.
   */
  info?: Partial<{ remoteAddress: string }>;

  /**
   * Some platforms pass info in `requestContext`.
   */
  requestContext?: Partial<{ identity: Partial<{ sourceIp: string }> }>;

  /**
   * HTTP method of the request.
   */
  method?: string;

  /**
   * In case of server request, the HTTP version sent by the client.
   *
   * See <https://nodejs.org/api/http.html#messagehttpversion>.
   */
  httpVersion?: string;

  /**
   * URL.
   */
  url?: string;

  /**
   * IP address of the client.
   */
  ip?: string;

  /**
   * Next.js URL, with lots of info, but this is what we use.
   */
  nextUrl?: Partial<{ pathname: string; search: string; protocol: string }>;

  /**
   * Object of `cookies` from header.
   */
  cookies?:
    | {
        [Symbol.iterator](): IterableIterator<
          [string, { name: string; value: string }]
        >;
      }
    | Partial<{ [key: string]: string }>;

  /**
   * Clones the request.
   *
   * @returns
   *   Cloned request.
   */
  clone?: () => Request;

  /**
   * Body of the request.
   */
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
 * Configuration for the Next.js integration of Arcjet.
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
    /**
     * Disable automatic IP detection and require manual IP passing via `ipSrc`
     * parameter to `protect()` (default: `false`).
     *
     * @warning
     * Disabling automatic IP detection is not recommended unless you have
     * written your own IP detection logic that considers the correct parsing of IP
     * headers. Accepting client IPs from untrusted sources can expose your
     * application to IP spoofing attacks. See the
     * {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Forwarded-For | MDN documentation}
     * for further guidance.
     */
    disableAutomaticIpDetection?: boolean;
  }
>;

/**
 * Instance of the Next integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a Next request
 * should be handled.
 *
 * @template Props
 *   Configuration.
 * @template DisableAutoIp
 *   Whether automatic IP detection is disabled.
 */
export interface ArcjetNext<
  Props extends PlainObject = PlainObject,
  DisableAutoIp extends boolean | undefined = false,
> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * Arcjet can protect Next.js routes and pages that are server components (the
   * default). Client components cannot be protected because they run on the
   * client side and do not have access to the request object.
   *
   * Server actions are supported in both Next.js 14 and 15 for all features
   * except sensitive data detection. You need to call a utility function
   * `request()` that accesses the headers we need to analyze the request (see
   * example below).
   *
   * Calls to `protect()` will not throw an error. Arcjet is designed to fail
   * open so that a service issue or misconfiguration does not block all
   * requests. If there is an error condition when processing the rule, Arcjet
   * will label an `"ERROR"` result for that rule and you can check the message
   * property on the rule’s error result for more information.
   *
   * @param request
   *   Details about the {@linkcode ArcjetNextRequest} that Arcjet needs to make a
   *   decision.
   * @param props
   *   Additional properties required for running rules against a request.
   *   Whether this is required depends on the rules you've configured.   *   When `disableAutomaticIpDetection` is `true`, must include `ipSrc` with the client IP.   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   *
   *   This contains the following properties:
   *
   *   - `id` (`string`)
   *     — unique ID for the request.
   *     This can be used to look up the request in the Arcjet dashboard.
   *     It is prefixed with `req_` for decisions involving the Arcjet cloud
   *     API.
   *     For decisions taken locally, the prefix is `lreq_`.
   *   - `conclusion` (`"ALLOW" | "DENY" | "CHALLENGE" | "ERROR"`)
   *     — The final conclusion based on evaluating each of the configured
   *     rules.
   *     If you wish to accept Arcjet’s recommended action based on the
   *     configured rules then you can use this property.
   *   - `reason` (`ArcjetReason`)
   *     — An object containing more detailed information about the conclusion.
   *   - `results` (`ArcjetRuleResult[]`)
   *     — An array of {@linkcode ArcjetRuleResult} objects containing the
   *     results of each rule that was executed.
   *   - `ttl` (`number`)
   *     — The time-to-live for the decision in seconds.
   *     This is the time that the decision is valid for.
   *     After this time, the decision will be re-evaluated.
   *     The SDK automatically caches DENY decisions for the length of the TTL.
   *   - `ip` (`ArcjetIpDetails`)
   *     — An object containing Arcjet’s analysis of the client IP address.
   *     See <https://docs.arcjet.com/reference/nextjs#ip-analysis> for more
   *     information.
   *
   * @example
   *   Inside server components and API route handlers:
   *
   *   ```ts
   *   // /app/api/hello/route.ts
   *   import arcjet, { shield } from "@arcjet/next";
   *   import { NextResponse } from "next/server";
   *
   *   const aj = arcjet({
   *     key: process.env.ARCJET_KEY!,
   *     rules: [
   *       // Protect against common attacks with Arcjet Shield
   *       shield({
   *        mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
   *      }),
   *     ],
   *   });
   *
   *   export async function POST(req: Request) {
   *     const decision = await aj.protect(req);
   *
   *     if (decision.isDenied()) {
   *       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   *     }
   *
   *     return NextResponse.json({
   *       message: "Hello world",
   *     });
   *   }
   *   ```
   *
   * @example
   *   Server action which can be passed as a prop to a client component. See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#client-components
   *
   *   ```ts
   *   // /app/actions.ts
   *   "use server";
   *
   *   import arcjet, { detectBot, request } from "@arcjet/next";
   *
   *   const aj = arcjet({
   *   key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
   *   rules: [
   *      detectBot({
   *        mode: "LIVE",
   *        allow: [],
   *      }),
   *     ],
   *   });
   *
   *   export async function create() {
   *      const req = await request();
   *      const decision = await aj.protect(req);
   *      if (decision.isDenied()) {
   *        throw new Error("Forbidden");
   *      }
   *      // mutate data
   *   }
   *   ```
   *
   * @link https://docs.arcjet.com/reference/nextjs#protect
   * @link https://docs.arcjet.com/reference/nextjs#error-handling
   * @link https://docs.arcjet.com/reference/nextjs#decision
   * @link https://docs.arcjet.com/reference/nextjs#server-actions
   * @link https://github.com/arcjet/example-nextjs
   */
  protect(
    request: ArcjetNextRequest,
    ...props: MaybeProperties<PropsWithOptions<Props, DisableAutoIp>>
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
   *
   * @example
   *   Create a base client in a separate file which sets a Shield base rule
   *   and then use `withRule` to add a bot detection rule in a specific route
   *   handler.
   *
   *   ```ts
   *   // /lib/arcjet.ts
   *   import arcjet, { shield } from "@arcjet/next";
   *
   *   // Create a base Arcjet instance for use by each handler
   *   export default arcjet({
   *     key: process.env.ARCJET_KEY,
   *     rules: [
   *       shield({
   *         mode: "LIVE",
   *       }),
   *     ],
   *   });
   *   ```
   *
   *   ```ts
   *   // /app/api/hello/route.ts
   *   import arcjet from "@lib/arcjet";
   *   import { detectBot, fixedWindow } from "@arcjet/next";
   *
   *   // Add rules to the base Arcjet instance outside of the handler function
   *   const aj = arcjet
   *     .withRule(
   *       detectBot({
   *         mode: "LIVE",
   *         allow: [], // blocks all automated clients
   *       }),
   *     )
   *     // You can chain multiple rules, so we'll include a rate limit
   *     .withRule(
   *       fixedWindow({
   *         mode: "LIVE",
   *         max: 100,
   *         window: "60s",
   *       }),
   *     );
   *
   *   export async function GET(req: NextRequest) {
   *     const decision = await aj.protect(req);
   *     if (decision.isDenied()) {
   *       throw new Error("Forbidden");
   *     }
   *     // continue with request processing
   *   }
   *   ```
   *
   * @link https://docs.arcjet.com/reference/nextjs#ad-hoc-rules
   * @link https://github.com/arcjet/example-nextjs
   */
  withRule<Rule extends ArcjetRule>(
    rule: Array<Rule>,
  ): ArcjetNext<
    Props & (Rule extends ArcjetRule<infer P> ? P : {}),
    DisableAutoIp
  >;
}

/**
 * Create a new Next.js integration of Arcjet.
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
 *   Next.js integration of Arcjet.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNext<
  ExtraProps<Rules> & CharacteristicProps<Characteristics>,
  typeof options.disableAutomaticIpDetection
> {
  const client = options.client ?? createRemoteClient();

  const log = options.log
    ? options.log
    : new Logger({
        level: logLevel(process.env),
      });

  const proxies = Array.isArray(options.proxies)
    ? options.proxies.map(parseProxy)
    : undefined;

  const disableAutomaticIpDetection =
    options.disableAutomaticIpDetection ?? false;

  if (isDevelopment(process.env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function toArcjetRequest<Props extends PlainObject>(
    request: ArcjetNextRequest,
    props: Props,
    ipSrc?: string,
  ): ArcjetRequest<Props> {
    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    let ip: string;

    if (disableAutomaticIpDetection) {
      // When automatic IP detection is disabled, use the provided ipSrc
      ip = ipSrc || "";
    } else {
      // When automatic IP detection is enabled, use findIp()
      if (ipSrc) {
        log.warn(
          "ipSrc parameter ignored because disableAutomaticIpDetection is not enabled",
        );
      }

      const xArcjetIp = isDevelopment(process.env)
        ? headers.get("x-arcjet-ip")
        : undefined;
      ip =
        xArcjetIp ||
        findIp(
          {
            ip: request.ip,
            socket: request.socket,
            info: request.info,
            requestContext: request.requestContext,
            headers,
          },
          { platform: platform(process.env), proxies },
        );
    }

    if (ip === "") {
      // If the `ip` is empty but we're in development mode, we default the IP
      // so the request doesn't fail.
      if (isDevelopment(process.env)) {
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
      // https://vercel.com/docs/environment-variables/system-environment-variables#VERCEL_GIT_COMMIT_SHA
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

  function withClient<
    Properties extends PlainObject,
    DisableAutoIp extends boolean | undefined,
  >(aj: Arcjet<Properties>): ArcjetNext<Properties, DisableAutoIp> {
    const client: ArcjetNext<Properties, DisableAutoIp> = {
      withRule(rule) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(request, props?) {
        // Extract ipSrc from props if present
        const propsWithOptions = (props || {}) as PropsWithOptions<
          Properties,
          DisableAutoIp
        >;
        const { ipSrc, ...restProps } = propsWithOptions as {
          ipSrc?: string;
          [key: string]: unknown;
        };

        // Validate ipSrc is provided when automatic IP detection is disabled
        if (disableAutomaticIpDetection && !ipSrc) {
          throw new Error(
            "ipSrc is required when disableAutomaticIpDetection is enabled",
          );
        }

        // Cast of `{}` because here we switch from `undefined` to `Properties`.
        const req = toArcjetRequest(request, restProps as Properties, ipSrc);

        const getBody = async () => {
          if (typeof request.clone === "function") {
            const clonedRequest = request.clone();
            let expectedLength: number | undefined;
            // TODO: This shouldn't need to build headers again but the type
            // for `req` above is overly relaxed
            const headers = new ArcjetHeaders(request.headers);
            const expectedLengthString = headers.get("content-length");
            if (typeof expectedLengthString === "string") {
              expectedLength = parseInt(expectedLengthString, 10);
            }

            // HEAD and GET requests do not have a body.
            if (!clonedRequest.body) {
              throw new Error("Cannot read body: body is missing");
            }

            if (!warnedForAutomaticBodyRead) {
              warnedForAutomaticBodyRead = true;
              log.warn(
                "Automatically reading the request body is deprecated; please pass an explicit `sensitiveInfoValue` field. See <https://docs.arcjet.com/upgrading/sdk-migration>.",
              );
            }
            return readBodyWeb(clonedRequest.body, { expectedLength });
          }

          // The body is `null` if there was no body with the request.
          // See: <https://nextjs.org/docs/pages/building-your-application/routing/api-routes#request-helpers>
          if (request.body === null || request.body === undefined) {
            throw new Error("Cannot read body: body is missing");
          }

          if (typeof request.body === "string") {
            return request.body;
          }

          return JSON.stringify(request.body);
        };

        return aj.protect({ getBody }, req);
      },
    };

    return Object.freeze(client);
  }

  const aj = core({ ...options, client, log });

  return withClient(aj);
}

/**
 * Protect your Next.js application using Arcjet as middleware.
 *
 * @param arcjet
 *   Next.js integration of Arcjet.
 * @param existingMiddleware
 *   Existing middleware to be called after Arcjet decides that a request is
 *   allowed.
 * @returns
 *   Next.js middleware that will run Arcjet and when it allows the request
 *   call further middleware,
 *   but when it denies the request will immediately return a JSON
 *   `NextResponse` with `403` or `429`.
 */
export function createMiddleware(
  arcjet: ArcjetNext<PlainObject>,
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
 * Wrap a Next.js page route, edge middleware, or an API route running on the
 * Edge Runtime.
 *
 * @param arcjet
 *   Next.js integration of Arcjet.
 * @param handler
 *   Request handler to be called after Arcjet decides that a request is
 *   allowed.
 * @returns
 *   Function that will run Arcjet on a request and when it is allowed call
 *   `handler`,
 *   but when it is denied will immediately return a JSON `NextResponse` or
 *   `NextApiResponse` with `403` or `429`.
 */
export function withArcjet<Args extends [ArcjetNextRequest, ...unknown[]], Res>(
  arcjet: ArcjetNext<PlainObject>,
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
