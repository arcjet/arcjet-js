import { readBodyWeb } from "@arcjet/body";
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
  type ArcjetRequest,
  type ArcjetRule,
  type Arcjet,
  type CharacteristicProps,
  type ExtraProps,
  type Primitive,
  type Product,
} from "arcjet";

export * from "arcjet";

let warnedForAutomaticBodyRead = false;

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

declare const emptyObjectSymbol: unique symbol;

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
 * Configuration for the React Router integration of Arcjet.
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
  proxies?: ReadonlyArray<string> | null | undefined;
}

/**
 * Request for the React Router integration of Arcjet.
 */
export interface ArcjetReactRouterRequest {
  /**
   * Context for the React Router request.
   * The `ip` (`string`) field is used if available.
   *
   * The React Router `future.v8_middleware` flag changes this behavior.
   * Without that flag, it is `Record<string, unknown>`.
   * With that flag, it is `Readonly<ReactRouterContextProvider>`.
   * Which has getters/setters for *user* defined objects that Arcjet cannot access.
   */
  context?: unknown;

  /**
   * DOM request.
   */
  request: Request;
}

/**
 * Instance of the React Router integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a request
 * should be handled.
 *
 * @template Properties
 *   Configuration.
 */
export interface ArcjetReactRouter<
  Properties extends Record<PropertyKey, unknown>,
> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param details
   *   Details about the {@linkcode ArcjetReactRouterRequest} that Arcjet needs to make a
   *   decision.
   * @param rest
   *   Additional properties required for running rules against a request.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   */
  protect(
    details: ArcjetReactRouterRequest,
    ...rest: MaybeProperties<Properties>
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
  ): ArcjetReactRouter<Properties & ExtraProps<Array<Rule>>>;
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
 * Create a new React Router integration of Arcjet.
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
 *   React Router integration of Arcjet.
 */
export default function arcjet<
  Rules extends Array<Primitive | Product>,
  Characteristics extends ReadonlyArray<string>,
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetReactRouter<ExtraProps<Rules> & CharacteristicProps<Characteristics>> {
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
    arcjetCore({ ...options, client: state.client, log: state.log }),
  );

  function withClient<Properties extends Record<PropertyKey, unknown>>(
    baseClient: Arcjet<Properties>,
  ): ArcjetReactRouter<Properties> {
    const client: ArcjetReactRouter<Properties> = {
      async protect(details, properties?) {
        const context: ArcjetAdapterContext = {
          getBody: createGetBody(state, details),
        };
        const request = toArcjetRequest(
          state,
          details,
          // Cast of `{}` because here we switch from `undefined` to `Properties`.
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
 * @param details
 *   React Router request details.
 * @returns
 *   Function to get the body of the request.
 */
function createGetBody(state: State, details: ArcjetReactRouterRequest) {
  /**
   * Read the request body.
   *
   * @returns
   *   Body of the request (`string`) if available or nothing.
   */
  return async function getBody(): Promise<string> {
    const clonedRequest = details.request.clone();
    let expectedLength: number | undefined;
    const expectedLengthString = details.request.headers.get("content-length");
    if (typeof expectedLengthString === "string") {
      expectedLength = parseInt(expectedLengthString, 10);
    }

    // HEAD and GET requests do not have a body.
    if (!clonedRequest.body) {
      throw new Error("Cannot read body: body is missing");
    }

    if (!warnedForAutomaticBodyRead) {
      warnedForAutomaticBodyRead = true;
      state.log.warn(
        "Automatically reading the request body is deprecated; please pass an explicit `sensitiveInfoValue` field. See <https://docs.arcjet.com/upgrading/sdk-migration>.",
      );
    }

    return readBodyWeb(clonedRequest.body, { expectedLength });
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
    sdkStack: "REACT_ROUTER",
    sdkVersion: "__ARCJET_SDK_VERSION__",
    timeout: settings.timeout ?? (isDevelopment(process.env) ? 1000 : 500),
    transport: createTransport(baseUrl),
  });
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
  state: State,
  details: ArcjetReactRouterRequest,
  properties: Properties,
): ArcjetRequest<Properties> {
  const headers = new ArcjetHeaders(details.request.headers);
  let ip: string | undefined;

  // Get the IP from non-middleware context (no `future.v8_middleware` flag).
  // Users *themselves* must provide this `ip` field if they use a particular
  // adapter.
  if (
    details.context &&
    typeof details.context === "object" &&
    "ip" in details.context &&
    typeof details.context.ip === "string"
  ) {
    ip = details.context.ip;
  }

  const xArcjetIp = isDevelopment(process.env)
    ? headers.get("x-arcjet-ip")
    : undefined;

  if (xArcjetIp) {
    ip = xArcjetIp;
  }

  if (!ip) {
    ip = findIp(details.request, {
      platform: platform(process.env),
      proxies: state.proxies,
    });
  }

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

  const url = new URL(details.request.url);

  return {
    ...properties,
    cookies: details.request.headers.get("cookie") ?? "",
    headers,
    host: url.host,
    ip,
    method: details.request.method,
    path: url.pathname,
    protocol: url.protocol,
    query: url.search,
  };
}
