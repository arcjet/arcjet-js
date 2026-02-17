/// <reference types="bun-types" />
import core from "arcjet";
import type {
  ArcjetDecision,
  ArcjetOptions as CoreOptions,
  ArcjetRule,
  Primitive,
  Product,
  ArcjetRequest,
  ExtraProps,
  Arcjet,
  CharacteristicProps,
} from "arcjet";
import { findIp, parseProxy } from "@arcjet/ip";
import { ArcjetHeaders } from "@arcjet/headers";
import type { Server } from "bun";
import { env } from "bun";
import { readBodyWeb } from "@arcjet/body";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";

// Re-export all named exports from the generic SDK
export * from "arcjet";

let warnedForAutomaticBodyRead = false;

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
  const url = options?.baseUrl ?? baseUrl(env);
  const timeout = options?.timeout ?? (isDevelopment(env) ? 1000 : 500);

  // Transport is the HTTP client that the client uses to make requests.
  const transport = createTransport(url);

  const sdkStack = "BUN";
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
 * Configuration for the Bun integration of Arcjet.
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
 * Instance of the Bun integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a Bun request
 * should be handled.
 *
 * @template Props
 *   Configuration.
 * @template DisableAutoIp
 *   Whether automatic IP detection is disabled.
 */
export interface ArcjetBun<
  Props extends PlainObject,
  DisableAutoIp extends boolean | undefined = false,
> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param ctx
   *   Additional context for this function call.
   * @param request
   *   Details about the {@linkcode Request} that Arcjet needs to make a
   *   decision.
   * @param props
   *   Additional properties required for running rules against a request.
   *   When `disableAutomaticIpDetection` is `true`, must include `ipSrc` with the client IP.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet's decision about the request.
   */
  protect(
    request: Request,
    ...properties: MaybeProperties<PropsWithOptions<Props, DisableAutoIp>>
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
  withRule<Rule extends ArcjetRule>(
    rule: Array<Rule>,
  ): ArcjetBun<
    Props & (Rule extends ArcjetRule<infer P> ? P : {}),
    DisableAutoIp
  >;

  /**
   * Wrap the Bun `fetch` handler to provide additional details when calling
   * the `protect()` method.
   *
   * @param fetch
   *   Original `fetch` from Bun.
   * @returns
   *   Wrapped `fetch` handler.
   */
  handler(
    fetch: (
      this: Server<any>,
      request: Request,
      server: Server<any>,
    ) => Response | Promise<Response>,
  ): (
    this: Server<any>,
    request: Request,
    server: Server<any>,
  ) => Response | Promise<Response>;
}

/**
 * Create a new Bun integration of Arcjet.
 *
 * @template Rules
 *   List of rules.
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration.
 * @returns
 *   Bun integration of Arcjet.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetBun<
  ExtraProps<Rules> & CharacteristicProps<Characteristics>,
  typeof options.disableAutomaticIpDetection
> {
  const client = options.client ?? createRemoteClient();

  // Assuming the `handler()` function was used around Bun's fetch handler this
  // WeakMap should be populated with IP addresses inspected via
  // `server.requestIP()`
  const ipCache = new WeakMap<Request, string>();

  const log = options.log
    ? options.log
    : new Logger({
        level: logLevel(env),
      });

  const proxies = Array.isArray(options.proxies)
    ? options.proxies.map(parseProxy)
    : undefined;

  const disableAutomaticIpDetection =
    options.disableAutomaticIpDetection ?? false;

  if (isDevelopment(env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function toArcjetRequest<Props extends PlainObject>(
    request: Request,
    props: Props,
    ipSrc?: string,
  ): ArcjetRequest<Props> {
    const cookies = request.headers.get("cookie") ?? "";

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    const url = new URL(request.url);

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

      const xArcjetIp = isDevelopment(env)
        ? headers.get("x-arcjet-ip")
        : undefined;
      ip =
        xArcjetIp ||
        findIp(
          {
            // This attempts to lookup the IP in the `ipCache`. This is primarily a
            // workaround to the API design in Bun that requires access to the
            // `Server` to lookup an IP.
            ip: ipCache.get(request),
            headers,
          },
          { platform: platform(env), proxies },
        );
    }

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

  function withClient<
    Properties extends PlainObject,
    DisableAutoIp extends boolean | undefined,
  >(aj: Arcjet<Properties>): ArcjetBun<Properties, DisableAutoIp> {
    const client: ArcjetBun<Properties, DisableAutoIp> = {
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
          if (request.bodyUsed) {
            throw new Error("Cannot read body: already read");
          }

          const clonedRequest = request.clone();
          let expectedLength: number | undefined;
          const expectedLengthString = request.headers.get("content-length");
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
        };

        return aj.protect({ getBody }, req);
      },
      handler(fetch) {
        return async function (request, server) {
          const socketAddress = server.requestIP(request);
          if (socketAddress) {
            ipCache.set(request, socketAddress.address);
          }

          return fetch.call(server, request, server);
        };
      },
    };

    return Object.freeze(client);
  }

  const aj = core({ ...options, client, log });

  return withClient(aj);
}
