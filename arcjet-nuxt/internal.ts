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
import {
  baseUrl as baseUrlFromEnvironment,
  isDevelopment,
  logLevel,
  platform,
} from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { type Client, createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import { readBody } from "@arcjet/body";

// Re-export all named exports from the generic SDK
export * from "arcjet";

declare const emptyObjectSymbol: unique symbol;

interface Empty {
  [emptyObjectSymbol]?: never;
}

/**
 * Configuration for {@linkcode createRemoteClient}.
 */
export interface RemoteClientOptions {
  /**
   * Base URI for HTTP requests to Decide API (optional).
   *
   * Defaults to the environment variable `ARCJET_BASE_URL` (if that value
   * is known and allowed) and the standard production API otherwise.
   */
  baseUrl?: string | null | undefined;

  /**
   * Timeout in milliseconds for the Decide API (optional).
   *
   * Defaults to `500` in production and `1000` in development.
   */
  timeout?: number | null | undefined;
}

/**
 * Create a remote client.
 *
 * @param options
 *   Configuration (optional).
 * @returns
 *   Client.
 */
export function createRemoteClient(
  options?: RemoteClientOptions | null | undefined,
): Client {
  const settings = options ?? {};
  const baseUrl = settings.baseUrl ?? baseUrlFromEnvironment(process.env);

  return createClient({
    baseUrl,
    // @ts-expect-error: TODO.
    sdkStack: "NUXT",
    sdkVersion: "__ARCJET_SDK_VERSION__",
    timeout: settings.timeout ?? (isDevelopment(process.env) ? 1000 : 500),
    transport: createTransport(baseUrl),
  });
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
 * Configuration for the Nuxt integration of Arcjet.
 *
 * @template Rules
 *   List of rules.
 * @template Characteristics
 *   Characteristics to track a user by.
 */
export interface ArcjetOptions<
  Rules extends Array<Primitive | Product>,
  Characteristics extends ReadonlyArray<string>,
> extends CoreOptions<Rules, Characteristics> {
  /**
   * IP addresses and CIDR ranges of trusted load balancers and proxies
   * (optional, example: `["100.100.100.100", "100.100.100.0/24"]`).
   */
  proxies?: Array<string>;
}

/**
 * Instance of the Nuxt integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a request
 * should be handled.
 *
 * @template Properties
 *   Configuration.
 */
export interface ArcjetNuxtInternal<Properties extends object> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param ctx
   *   Additional context for this function call.
   * @param rest
   *   Additional properties required for running rules against a request.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   */
  protect(
    event: H3Event,
    ...rest: Properties extends Empty ? [] : [Properties]
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
  ): ArcjetNuxtInternal<Properties & ExtraProps<Rule>>;
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

interface NodeEventContext {
  req: ArcjetNodeRequest;
}

// interface H3EventContext {
//   nitro?: {
//     runtimeConfig: Record<string, any>;
//   };
// }

type H3Event = {
  node: NodeEventContext;
  // context: H3EventContext;
};

/**
 * Create a new Nuxt integration of Arcjet.
 *
 * @template Rules
 *   List of rules.
 * @template Characteristics
 *   Characteristics to track a user by.
 * @param options
 *   Configuration.
 * @returns
 *   Nuxt integration of Arcjet.
 */
export function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNuxtInternal<
  ExtraProps<Rules> & CharacteristicProps<Characteristics>
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

  if (isDevelopment(process.env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  /**
   * Turn a React Router request into an Arcjet request.
   *
   * @param state
   *   Info passed around.
   * @param details
   *   React Router request details.
   * @param properties
   *   Additional properties.
   * @returns
   *   Arcjet request.
   */
  function toArcjetRequest<Properties extends Record<PropertyKey, unknown>>(
    request: ArcjetNodeRequest,
    properties: Properties,
  ): ArcjetRequest<Properties> {
    // We pull the cookies from the request before wrapping them in ArcjetHeaders
    const cookies = cookiesToString(request.headers?.cookie);

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    let ip = findIp(
      {
        socket: request.socket,
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

    return {
      ...properties,
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
  ): ArcjetNuxtInternal<ExtraProps<Rules>> {
    return Object.freeze({
      withRule(rule: Primitive | Product) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(
        event: H3Event,
        ...[properties]: ExtraProps<Rules> extends Empty
          ? []
          : [ExtraProps<Rules>]
      ): Promise<ArcjetDecision> {
        // TODO(#220): The generic manipulations get really mad here, so we cast
        // Further investigation makes it seem like it has something to do with
        // the definition of `properties` in the signature but it's hard to track down
        const req = toArcjetRequest(
          event.node.req,
          properties ?? {},
        ) as ArcjetRequest<ExtraProps<Rules>>;

        return aj.protect({ getBody }, req);

        async function getBody() {
          // console.log('body:', event.node.req.body)
          try {
            // If event.node.req.body is present then the body was likely read by a package like express' `body-parser`.
            // If it's not present then we attempt to read the bytes from the IncomingMessage ourselves.
            if (typeof event.node.req.body === "string") {
              return event.node.req.body;
            } else if (
              typeof event.node.req.body !== "undefined" &&
              // BigInt cannot be serialized with JSON.stringify
              typeof event.node.req.body !== "bigint"
            ) {
              return JSON.stringify(event.node.req.body);
            }

            if (
              typeof event.node.req.on === "function" &&
              typeof event.node.req.removeListener === "function"
            ) {
              let expectedLength: number | undefined;
              // TODO: This shouldn't need to build headers again but the type
              // for `req` above is overly relaxed
              const headers = new ArcjetHeaders(event.node.req.headers);
              const expectedLengthStr = headers.get("content-length");
              if (typeof expectedLengthStr === "string") {
                try {
                  expectedLength = parseInt(expectedLengthStr, 10);
                } catch {
                  // If the expected length couldn't be parsed we'll just not set one.
                }
              }
              // Awaited to throw if it rejects and we'll just return undefined
              const body = await readBody(event.node.req, {
                // We will process 1mb bodies
                limit: 1048576,
                expectedLength,
              });
              return body;
            }

            log.warn("no body available");
            return;
          } catch (e) {
            log.error("failed to get event.node.req body: %s", String(e));
            return;
          }
        }
      },
    });
  }

  const aj = core({ ...options, rules: options.rules, client, log });

  return withClient(aj);
}
