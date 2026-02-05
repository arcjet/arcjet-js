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

  const sdkStack = "REMIX";
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
 * Request for the Remix integration of Arcjet.
 *
 * This is a minimal version of `LoaderFunctionArgs` from Remix.
 */
export type ArcjetRemixRequest = {
  /**
   * Original Remix request.
   */
  request: Request;
  /**
   * Context for the Remix request.
   */
  context: { [key: string]: unknown };
};

/**
 * Configuration for the Remix integration of Arcjet.
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
 * Instance of the Remix integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a request
 * should be handled.
 *
 * @template Props
 *   Configuration.
 */
export interface ArcjetRemix<Props extends PlainObject> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param request
   *   Details about the {@linkcode ArcjetRemixRequest} that Arcjet needs to make a
   *   decision.
   * @param props
   *   Additional properties required for running rules against a request.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   */
  protect(
    request: ArcjetRemixRequest,
    ...props: MaybeProperties<Props>
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
  withRule<Rule extends Array<ArcjetRule>>(
    rule: Rule,
  ): ArcjetRemix<Props & ExtraProps<Rule>>;
}

/**
 * Create a new Remix integration of Arcjet.
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
 *   Remix integration of Arcjet.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetRemix<ExtraProps<Rules> & CharacteristicProps<Characteristics>> {
  const client = options.client ?? createRemoteClient();

  const log = options.log
    ? options.log
    : new Logger({
        level: logLevel(process.env),
      });

  const proxies = Array.isArray(options.proxies)
    ? options.proxies.map(parseProxy)
    : undefined;

  if (isDevelopment(process.env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function toArcjetRequest<Props extends PlainObject>(
    { request, context }: ArcjetRemixRequest,
    props: Props,
  ): ArcjetRequest<Props> {
    const cookies = request.headers.get("cookie") ?? "";

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    const url = new URL(request.url);
    const xArcjetIp = isDevelopment(process.env)
      ? headers.get("x-arcjet-ip")
      : undefined;
    let ip =
      xArcjetIp ||
      findIp(
        {
          // The `getLoadContext` API will attach the `ip` to the context
          ip: context?.ip,
          headers,
        },
        { platform: platform(process.env), proxies },
      );
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

  function withClient<Properties extends PlainObject>(
    aj: Arcjet<Properties>,
  ): ArcjetRemix<Properties> {
    const client: ArcjetRemix<Properties> = {
      withRule(rule) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(details, props?) {
        // Cast of `{}` because here we switch from `undefined` to `Properties`.
        const req = toArcjetRequest(details, props || ({} as Properties));

        const getBody = async () => {
          const clonedRequest = details.request.clone();
          let expectedLength: number | undefined;
          const expectedLengthString =
            details.request.headers.get("content-length");
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
    };

    return Object.freeze(client);
  }

  const aj = core({ ...options, client, log });

  return withClient(aj);
}

/**
 * To make sure Arcjet has access to the client IP address,
 * the `getLoadContext` function can be passed when you call
 * `createRequestHandler`.
 * If you already have a `getLoadContext` function, you can merge them.
 *
 * @param args
 *   Arguments passed to the function.
 *
 * @example
 *   Passing it directly:
 *
 *   ```ts
 *   import { getLoadContext } from "@arcjet/remix";
 *
 *   const remixHandler = createRequestHandler({
 *     getLoadContext,
 *   });
 *
 *   app.all("*", remixHandler);
 *   ```
 *
 *   Merging with your own `getLoadContext` function:
 *
 *   ```ts
 *   import { getLoadContext as getLoadContextArcjet } from "@arcjet/remix";
 *
 *   const remixHandler = createRequestHandler({
 *     getLoadContext(request, response) {
 *       return {
 *         ...getLoadContextArcjet(request, response),
 *         anyAdditional: "values"
 *       }
 *     },
 *   });
 *
 *   app.all("*", remixHandler);
 *   ```
 *
 * @link https://v2.remix.run/docs/other-api/adapter/#createrequesthandler
 */
export function getLoadContext(...args: unknown[]): { ip: string | undefined } {
  const maybeReq = args[0];
  if (
    typeof maybeReq === "object" &&
    maybeReq !== null &&
    "ip" in maybeReq &&
    typeof maybeReq.ip === "string"
  ) {
    return {
      ip: maybeReq.ip,
    };
  }

  const maybeInfo = args[1];
  if (
    typeof maybeInfo === "object" &&
    maybeInfo !== null &&
    "remoteAddr" in maybeInfo &&
    typeof maybeInfo.remoteAddr === "object" &&
    maybeInfo.remoteAddr !== null &&
    "transport" in maybeInfo.remoteAddr &&
    maybeInfo.remoteAddr.transport === "tcp" &&
    "hostname" in maybeInfo.remoteAddr &&
    typeof maybeInfo.remoteAddr.hostname === "string"
  ) {
    return {
      // According to https://stackoverflow.com/a/71011282, "Technically, it's
      // the remote hostname, but it's very likely to be an IP address unless
      // you have configured custom DNS settings in your server environment"
      ip: maybeInfo.remoteAddr.hostname,
    };
  }

  return {
    ip: undefined,
  };
}
