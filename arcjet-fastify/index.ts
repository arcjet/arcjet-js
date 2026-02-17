import process from "node:process";
import {
  baseUrl as baseUrlFromEnvironment,
  isDevelopment,
  logLevel,
  platform,
} from "@arcjet/env";
import { ArcjetHeaders } from "@arcjet/headers";
import { type Cidr, findIp, parseProxy } from "@arcjet/ip";
import { Logger } from "@arcjet/logger";
// TODO(@wooorm-arcjet): use export maps to hide file extensions and lock down API.
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import type {
  ArcjetDecision,
  ArcjetLogger,
  ArcjetOptions as CoreOptions,
  ArcjetRequest,
  ArcjetRule,
  Arcjet,
  CharacteristicProps,
  Primitive,
  Product,
  ExtraProps,
} from "arcjet";
import arcjetCore from "arcjet";

// TODO(@wooorm-arcjet): using `export all` will leak things in the public API,
// resulting in unneeded breaking changes,
// we must be explicit about what is exported.
export * from "arcjet";

declare const emptyObjectSymbol: unique symbol;

// TODO(@wooorm-arcjet): remove.
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
export function createRemoteClient(
  options?: RemoteClientOptions | null | undefined,
) {
  const settings = options ?? {};
  const baseUrl = settings.baseUrl ?? baseUrlFromEnvironment(process.env);

  return createClient({
    baseUrl,
    sdkStack: "FASTIFY",
    sdkVersion: "__ARCJET_SDK_VERSION__",
    timeout: settings.timeout ?? (isDevelopment(process.env) ? 1000 : 500),
    transport: createTransport(baseUrl),
  });
}

/**
 * Request for the Fastify integration of Arcjet.
 *
 * This is the minimum interface similar to `FastifyRequest` from `fastify`.
 */
export interface ArcjetFastifyRequest {
  /**
   * Request body.
   */
  body: unknown;

  /**
   * Headers of the request.
   */
  headers: Record<string, Array<string> | string | undefined>;

  /**
   * HTTP method of the request.
   */
  method: string;

  /**
   * Protocol of the incoming request.
   */
  protocol: "https" | "http";

  /**
   * Fastify server instance.
   */
  server: { initialConfig?: { https?: unknown } | undefined };

  /**
   * Underlying connection of the incoming request.
   */
  socket: {
    encrypted?: boolean | undefined;
    remoteAddress?: string | undefined;
  };

  /**
   * URL of the incoming request.
   */
  url: string;
}

/**
 * Instance of the Fastify integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a Fastify request
 * should be handled.
 *
 * @template Props
 *   Configuration.
 * @template DisableAutoIp
 *   Whether automatic IP detection is disabled.
 */
export interface ArcjetFastify<
  Props,
  DisableAutoIp extends boolean | undefined = false,
> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param request
   *   Details about the {@linkcode FastifyRequest} that Arcjet needs to make a
   *   decision.
   * @param properties
   *   Additional properties required for running rules against a request.
   *   When `disableAutomaticIpDetection` is `true`, must include `ipSrc` with the client IP.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet's decision about the request.
   */
  protect(
    request: ArcjetFastifyRequest,
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
  ): ArcjetFastify<
    Props & (Rule extends ArcjetRule<infer P> ? P : {}),
    DisableAutoIp
  >;
}

/**
 * Configuration for the Fastify integration of Arcjet.
 *
 * @template Rules
 *   List of rules.
 * @template Characteristics
 *   Characteristics to track a user by.
 */
export type ArcjetOptions<
  Rules extends [...Array<Primitive | Product>],
  Characteristics extends ReadonlyArray<string>,
> = CoreOptions<Rules, Characteristics> & {
  /**
   * One or more IP Address of trusted proxies in front of the application.
   * These addresses will be excluded when Arcjet detects a public IP address.
   */
  proxies?: ReadonlyArray<string> | null | undefined;
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
};

/**
 * Create a new Fastify integration of Arcjet.
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
 *   Fastify integration of Arcjet.
 */
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetFastify<
  ExtraProps<Rules> & CharacteristicProps<Characteristics>,
  typeof options.disableAutomaticIpDetection
> {
  const client = options.client ?? createRemoteClient();
  const log = options.log
    ? options.log
    : new Logger({ level: logLevel(process.env) });
  const proxies = options.proxies ? options.proxies.map(parseProxy) : undefined;

  const disableAutomaticIpDetection =
    options.disableAutomaticIpDetection ?? false;

  if (isDevelopment(process.env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function toArcjetRequestWrapper<Props extends PlainObject>(
    request: ArcjetFastifyRequest,
    properties: Props,
    ipSrc?: string,
  ): ArcjetRequest<Props> {
    return toArcjetRequest(
      request,
      log,
      proxies,
      properties,
      ipSrc,
      disableAutomaticIpDetection,
    );
  }

  function withClient<
    Properties extends PlainObject,
    DisableAutoIp extends boolean | undefined,
  >(arcjetCore: Arcjet<Properties>): ArcjetFastify<Properties, DisableAutoIp> {
    const client: ArcjetFastify<Properties, DisableAutoIp> = {
      async protect(fastifyRequest, properties?) {
        // Extract ipSrc from properties if present
        const propsWithOptions = (properties || {}) as PropsWithOptions<
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

        const arcjetRequest = toArcjetRequestWrapper(
          fastifyRequest,
          // Cast of `{}` because here we switch from `undefined` to `Properties`.
          restProps as Properties,
          ipSrc,
        );

        return arcjetCore.protect({ getBody }, arcjetRequest);

        async function getBody() {
          if (
            fastifyRequest.body === null ||
            fastifyRequest.body === undefined
          ) {
            throw new Error("Cannot read body: body is missing");
          }

          if (typeof fastifyRequest.body === "string") {
            return fastifyRequest.body;
          }

          return JSON.stringify(fastifyRequest.body);
        }
      },
      withRule(rule) {
        const childClient = arcjetCore.withRule(rule);
        return withClient(childClient);
      },
    };

    return Object.freeze(client);
  }

  const childClient = arcjetCore({ ...options, client, log });
  return withClient(childClient);
}

/**
 * Create an Arcjet request.
 *
 * @param request
 *   Fastify request.
 * @param log
 *   Logger.
 * @param proxies
 *   Proxies.
 * @param properties
 *   Properties.
 * @param ipSrc
 *   Optional IP source when automatic detection is disabled.
 * @param disableAutomaticIpDetection
 *   Whether automatic IP detection is disabled.
 * @returns
 *   Arcjet request.
 */
function toArcjetRequest<Properties extends PlainObject>(
  request: ArcjetFastifyRequest,
  log: ArcjetLogger,
  proxies: ReadonlyArray<Cidr | string> | undefined,
  properties: Properties,
  ipSrc?: string,
  disableAutomaticIpDetection?: boolean,
): ArcjetRequest<Properties> {
  const requestHeaders = request.headers || {};
  // Extract cookies from original headers.
  // `ArcjetHeaders` removes the cookie header because it often contains
  // sensitive information.
  // We send cookies to the server as a separate field on the protobuf and
  // handle them differently than other headers due to that potential.
  const cookies =
    typeof requestHeaders.cookie === "string" ? requestHeaders.cookie : "";
  const headers = new ArcjetHeaders(requestHeaders);

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
        { headers, socket: request.socket },
        { platform: platform(process.env), proxies },
      );
  }

  if (ip === "") {
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
  let protocol =
    request.protocol === "https" || request.protocol === "http"
      ? request.protocol + ":"
      : request.server.initialConfig?.https
        ? "https:"
        : "http:";
  let query = "";

  // Do some very simple validation, but also try/catch around URL parsing
  if (request.url && host !== "") {
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
    cookies,
    headers,
    host,
    ip,
    method,
    path,
    protocol,
    query,
  };
}
