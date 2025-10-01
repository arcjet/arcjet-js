import { readBody } from "@arcjet/body";
import {
  baseUrl as baseUrlFromEnvironment,
  isDevelopment,
  logLevel,
  platform,
} from "@arcjet/env";
import { ArcjetHeaders } from "@arcjet/headers";
import { type Cidr, findIp, parseProxy } from "@arcjet/ip";
import { Logger } from "@arcjet/logger";
import { type Client, createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import arcjetCore, {
  type ArcjetAdapterContext,
  type ArcjetDecision,
  type ArcjetLogger,
  type ArcjetOptions as CoreOptions,
  type Primitive,
  type Product,
  type ArcjetRequest,
  type ExtraProps,
  type Arcjet,
  type CharacteristicProps,
} from "arcjet";

// Re-export all named exports from the generic SDK
export * from "arcjet";

declare const emptyObjectSymbol: unique symbol;

interface Empty {
  [emptyObjectSymbol]?: never;
}

/**
 * H3 event.
 *
 * This is the minimum interface similar to `H3Event` from `h3`.
 */
export interface ArcjetH3Event {
  node: ArcjetH3NodeEventContext;
}

/**
 * H3 event context for Node.js.
 *
 * This is the minimum interface similar to `NodeEventContext` from `h3`.
 */
interface ArcjetH3NodeEventContext {
  req: ArcjetH3NodeRequest;
}

/**
 * Node.js request.
 *
 * This is the minimum interface similar to `http.IncomingMessage`.
 */
interface ArcjetH3NodeRequest {
  /**
   * Request body.
   */
  body?: unknown;

  /**
   * Headers of the request.
   */
  headers: Record<string, string | string[] | undefined>;

  /**
   * HTTP version sent by the client.
   *
   * See <https://nodejs.org/api/http.html#messagehttpversion>.
   */
  httpVersion?: string | null | undefined;

  /**
   * HTTP method of the request.
   */
  method?: string | null | undefined;

  /**
   * Add event handlers.
   *
   * This field is available through `stream.Readable` from `EventEmitter`.
   *
   * See <https://nodejs.org/api/events.html#emitteroneventname-listener>.
   */
  on?(event: string, listener: (...args: any[]) => void): void;

  /**
   * Whether the readable stream is readable.
   *
   * This field is available from `stream.Readable`.
   *
   * See <https://nodejs.org/api/stream.html#readablereadable>.
   */
  readable?: boolean | null | undefined;

  /**
   * Remove event handlers.
   *
   * This field is available through `stream.Readable` from `EventEmitter`.
   *
   * See <https://nodejs.org/api/events.html#emitterremovelistenereventname-listener>.
   */
  removeListener?(event: string, listener: (...args: any[]) => void): void;

  /**
   * `net.Socket` object associated with the connection.
   *
   * See <https://nodejs.org/api/http.html#messagesocket>.
   */
  socket?:
    | Partial<{ remoteAddress: string; encrypted: boolean }>
    | null
    | undefined;

  /**
   * URL.
   */
  url?: string | null | undefined;
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
   * @param event
   *   H3 event that Arcjet needs to make a decision.
   * @param rest
   *   Additional properties required for running rules against an event.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the event.
   */
  protect(
    event: ArcjetH3Event,
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
> extends Omit<CoreOptions<Rules, Characteristics>, "key"> {
  /**
   * IP addresses and CIDR ranges of trusted load balancers and proxies
   * (optional, example: `["100.100.100.100", "100.100.100.0/24"]`).
   */
  proxies?: ReadonlyArray<string> | null | undefined;
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
 * Info passed around.
 */
interface State {
  /**
   * Client interface.
   */
  client: Client;

  /**
   * Log interface.
   */
  log: ArcjetLogger;

  /**
   * Configured proxies.
   */
  proxies: ReadonlyArray<Cidr | string>;
}

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
  Rules extends Array<Primitive | Product>,
  Characteristics extends ReadonlyArray<string>,
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNuxtInternal<
  ExtraProps<Rules> & CharacteristicProps<Characteristics>
> {
  const config = process.env.RUNTIME_CONFIG as unknown;
  let key = "";

  if (
    config &&
    typeof config === "object" &&
    "__ARCJET_KEY" in config &&
    typeof config.__ARCJET_KEY === "string"
  ) {
    key = config.__ARCJET_KEY;
  }

  const state: State = {
    client: options.client ?? createRemoteClient(),
    log: options.log ?? new Logger({ level: logLevel(process.env) }),
    proxies: options.proxies?.map(parseProxy) ?? [],
  };

  if (isDevelopment(process.env)) {
    state.log.warn(
      "Arcjet will use `127.0.0.1` when missing public IP address in development mode",
    );
  }

  return withClient(
    arcjetCore({ ...options, client: state.client, key, log: state.log }),
  );

  function withClient<Properties extends Record<PropertyKey, unknown>>(
    baseClient: Arcjet<Properties>,
  ): ArcjetNuxtInternal<Properties> {
    const client: ArcjetNuxtInternal<Properties> = {
      async protect(details, properties?) {
        const context: ArcjetAdapterContext = {
          getBody: createGetBody(state, details),
        };
        const request = toArcjetRequest(
          state,
          details,
          properties ?? ({} as Properties),
        );

        return baseClient.protect(context, request);
      },
      withRule(rule) {
        return withClient(baseClient.withRule(rule));
      },
    };

    return Object.freeze(client);
  }
}

/**
 * Create a function to get the body of the request.
 *
 * @param state
 *   Info passed around.
 * @param event
 *   H3 event.
 * @returns
 *   Function to get the body of the request.
 */
function createGetBody(state: State, event: ArcjetH3Event) {
  /**
   * Read the request body.
   *
   * @returns
   *   Body of the request (`string`) if available or nothing.
   */
  return async function getBody(): Promise<string | undefined> {
    try {
      if (typeof event.node.req.body === "string") {
        return event.node.req.body;
      } else if (
        typeof event.node.req.body !== "undefined" &&
        typeof event.node.req.body !== "bigint"
      ) {
        return JSON.stringify(event.node.req.body);
      }

      if (
        typeof event.node.req.on === "function" &&
        typeof event.node.req.removeListener === "function"
      ) {
        let expectedLength: number | undefined;
        const headers = new ArcjetHeaders(event.node.req.headers);
        const expectedLengthStr = headers.get("content-length");
        if (typeof expectedLengthStr === "string") {
          try {
            expectedLength = parseInt(expectedLengthStr, 10);
          } catch {
            // Empty.
          }
        }
        const body = await readBody(event.node.req, {
          expectedLength,
          limit: 1048576,
        });
        return body;
      }

      state.log.warn("no body available");
      return;
    } catch (error) {
      state.log.error("failed to get request body: %s", String(error));
    }
  };
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
    sdkStack: "NUXT",
    sdkVersion: "__ARCJET_SDK_VERSION__",
    timeout: settings.timeout ?? (isDevelopment(process.env) ? 1000 : 500),
    transport: createTransport(baseUrl),
  });
}

/**
 * Turn a H3 event into an Arcjet request.
 *
 * @param state
 *   Info passed around.
 * @param event
 *   H3 event.
 * @param properties
 *   Additional properties.
 * @returns
 *   Arcjet request.
 */
function toArcjetRequest<Properties extends Record<PropertyKey, unknown>>(
  state: State,
  event: ArcjetH3Event,
  properties: Properties,
): ArcjetRequest<Properties> {
  let ip = findIp(event.node.req, {
    platform: platform(process.env),
    proxies: state.proxies,
  });

  if (!ip) {
    if (isDevelopment(process.env)) {
      // In development, there is a warning for this when the client is
      // constructed.
      ip = "127.0.0.1";
    } else {
      // In production, warn for every request.
      state.log.warn(
        "Cannot find client IP address; if this is a development environment, set the `ARCJET_ENV` environment variable to `development`; in production, provide `context.ip` or an `x-client-ip` (or similar) header",
      );
    }
  }

  const headers = new ArcjetHeaders(event.node.req.headers);
  const host = headers.get("host") ?? "";
  let path = "";
  let query = "";
  let protocol = "";

  if (typeof event.node.req.socket?.encrypted !== "undefined") {
    protocol = event.node.req.socket.encrypted ? "https:" : "http:";
  } else {
    protocol = "http:";
  }

  // Do some very simple validation, but also try/catch around URL parsing
  if (
    typeof event.node.req.url !== "undefined" &&
    event.node.req.url !== "" &&
    host !== ""
  ) {
    try {
      const url = new URL(event.node.req.url || "", protocol + "//" + host);
      path = url.pathname;
      query = url.search;
      protocol = url.protocol;
    } catch {
      // If the parsing above fails, just set the path as whatever url we
      // received.
      path = event.node.req.url ?? "";
      state.log.warn('Unable to parse URL. Using "%s" as `path`.', path);
    }
  } else {
    path = event.node.req.url ?? "";
  }

  return {
    ...properties,
    cookies: headers.get("cookie") ?? undefined,
    headers,
    host,
    ip,
    method: event.node.req.method || "",
    path,
    protocol,
    query,
  };
}
