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
import type { Env } from "@arcjet/env";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import { readBody } from "@arcjet/body";

// Re-export all named exports from the generic SDK
export * from "arcjet";

// An object with getters that access the `process.env.SOMEVAR` values directly.
// This allows bundlers to replace the dot-notation access with string literals
// while still allowing dynamic access in runtime environments.
const env: Env = {
  get FLY_APP_NAME() {
    return process.env.FLY_APP_NAME;
  },
  get VERCEL() {
    return process.env.VERCEL;
  },
  get RENDER() {
    return process.env.RENDER;
  },
  get MODE() {
    return process.env.MODE;
  },
  get NODE_ENV() {
    return process.env.NODE_ENV;
  },
  get ARCJET_KEY() {
    return process.env.ARCJET_KEY;
  },
  get ARCJET_ENV() {
    return process.env.ARCJET_ENV;
  },
  get ARCJET_LOG_LEVEL() {
    return process.env.ARCJET_LOG_LEVEL;
  },
  get ARCJET_BASE_URL() {
    return process.env.ARCJET_BASE_URL;
  },
} satisfies { [K in keyof Env]-?: unknown };

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

  const sdkStack = "NODEJS";
  const sdkVersion = "__ARCJET_SDK_VERSION__";

  return createClient({
    transport,
    baseUrl: url,
    timeout,
    sdkStack,
    sdkVersion,
  });
}

type EventHandlerLike = (
  event: string,
  listener: (...args: any[]) => void,
) => void;

/**
 * Request for the Node.js integration of Arcjet.
 *
 * This is the minimum interface similar to `http.IncomingMessage`.
 */
export interface ArcjetNodeRequest {
  /**
   * Headers of the request.
   */
  headers?: Record<string, string | string[] | undefined>;

  /**
   * `net.Socket` object associated with the connection.
   *
   * See <https://nodejs.org/api/http.html#messagesocket>.
   */
  socket?: Partial<{ remoteAddress: string; encrypted: boolean }>;

  /**
   * HTTP method of the request.
   */
  method?: string;

  /**
   * HTTP version sent by the client.
   *
   * See <https://nodejs.org/api/http.html#messagehttpversion>.
   */
  httpVersion?: string;

  /**
   * URL.
   */
  url?: string;

  /**
   * Request body.
   */
  body?: unknown;

  /**
   * Add event handlers.
   *
   * This field is available through `stream.Readable` from `EventEmitter`.
   *
   * See <https://nodejs.org/api/events.html#emitteroneventname-listener>.
   */
  on?: EventHandlerLike;

  /**
   * Remove event handlers.
   *
   * This field is available through `stream.Readable` from `EventEmitter`.
   *
   * See <https://nodejs.org/api/events.html#emitterremovelistenereventname-listener>.
   */
  removeListener?: EventHandlerLike;

  /**
   * Whether the readable stream is readable.
   *
   * This field is available from `stream.Readable`.
   *
   * See <https://nodejs.org/api/stream.html#readablereadable>.
   */
  readable?: boolean;
}

function cookiesToString(cookies: string | string[] | undefined): string {
  if (typeof cookies === "undefined") {
    return "";
  }

  // This should never be the case with a Node.js cookie header, but we are safe
  if (Array.isArray(cookies)) {
    return cookies.join("; ");
  }

  return cookies;
}

/**
 * Configuration for the Node.js integration of Arcjet.
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
 * Instance of the Node.js integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a Node request
 * should be handled.
 *
 * @template Props
 *   Configuration.
 */
export interface ArcjetNode<Props extends PlainObject> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param request
   *   Details about the {@linkcode ArcjetNodeRequest} that Arcjet needs to make a
   *   decision.
   * @param props
   *   Additional properties required for running rules against a request.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   */
  protect(
    request: ArcjetNodeRequest,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...props: Props extends WithoutCustomProps ? [] : [Props]
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
  ): ArcjetNode<Simplify<Props & ExtraProps<Rule>>>;
}

/**
 * Create a new Node.js integration of Arcjet.
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
 *   Node.js integration of Arcjet.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNode<
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
    request: ArcjetNodeRequest,
    props: Props,
  ): ArcjetRequest<Props> {
    // We pull the cookies from the request before wrapping them in ArcjetHeaders
    const cookies = cookiesToString(request.headers?.cookie);

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    const xArcjetIp = isDevelopment(env)
      ? headers.get("x-arcjet-ip")
      : undefined;
    let ip =
      xArcjetIp ||
      findIp(
        {
          socket: request.socket,
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
    const method = request.method ?? "";
    const host = headers.get("host") ?? "";
    let path = "";
    let query = "";
    let protocol = "";

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

    const extra: Record<PropertyKey, string> = {};

    // Add extra info from `env` on Vercel.
    if (platform(env) === "vercel") {
      // Vercel git commit SHA.
      // <https://vercel.com/docs/environment-variables/system-environment-variables#VERCEL_GIT_COMMIT_SHA>
      // @ts-expect-error: types in GH-5456.
      extra["vercel-git-commit-sha"] = env.VERCEL_GIT_COMMIT_SHA ?? "";
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
  ): ArcjetNode<ExtraProps<Rules>> {
    return Object.freeze({
      withRule(rule: Primitive | Product) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(
        request: ArcjetNodeRequest,
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
            // If request.body is present then the body was likely read by a package like express' `body-parser`.
            // If it's not present then we attempt to read the bytes from the IncomingMessage ourselves.
            if (typeof request.body === "string") {
              return request.body;
            } else if (
              typeof request.body !== "undefined" &&
              // BigInt cannot be serialized with JSON.stringify
              typeof request.body !== "bigint"
            ) {
              return JSON.stringify(request.body);
            }

            if (
              typeof request.on === "function" &&
              typeof request.removeListener === "function"
            ) {
              let expectedLength: number | undefined;
              // TODO: This shouldn't need to build headers again but the type
              // for `req` above is overly relaxed
              const headers = new ArcjetHeaders(request.headers);
              const expectedLengthStr = headers.get("content-length");
              if (typeof expectedLengthStr === "string") {
                try {
                  expectedLength = parseInt(expectedLengthStr, 10);
                } catch {
                  // If the expected length couldn't be parsed we'll just not set one.
                }
              }
              // Awaited to throw if it rejects and we'll just return undefined
              const body = await readBody(request, {
                // We will process 1mb bodies
                limit: 1048576,
                expectedLength,
              });
              return body;
            }

            log.warn("no body available");
            return;
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
