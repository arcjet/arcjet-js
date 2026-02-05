// NestJS requires this. Usually it is imported via their runtime but we
// import it to be sure.
import "reflect-metadata";

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
import { findIp, parseProxy } from "@arcjet/ip";
import { ArcjetHeaders } from "@arcjet/headers";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import { readBody } from "@arcjet/body";
import { Inject, SetMetadata } from "@nestjs/common";
import type {
  CanActivate,
  ConfigurableModuleAsyncOptions,
  ContextType,
  DynamicModule,
  ExecutionContext,
  FactoryProvider,
  InjectionToken,
  OptionalFactoryDependency,
  Provider,
} from "@nestjs/common";

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

  const sdkStack = "NESTJS";
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
 * Nest request.
 */
export interface ArcjetNestRequest {
  /**
   * Headers.
   */
  headers?: Record<string, string | string[] | undefined>;
  /**
   * HTTP method of the request.
   */
  method?: string;
  /**
   * URL.
   */
  url?: string;
  /**
   * Request body.
   */
  body?: unknown;
  /**
   * Request ID.
   *
   * This field is available on Fastify requests:
   * <https://fastify.dev/docs/latest/Reference/Request/#request>.
   */
  id?: string;
  /**
   * IP address of the client.
   */
  ip?: string;
  /**
   * Protocol of the request.
   */
  protocol?: string;
  /**
   * Host of the request.
   */
  host?: string;
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
   * Add event handlers.
   *
   * This field is available on Express requests,
   * as those inherit from Node `http.IncomingMessage`,
   * in turn from `stream.Readable` and `EventEmitter`.
   *
   * See <https://nodejs.org/api/events.html#emitteroneventname-listener>.
   */
  on?: EventHandlerLike;
  /**
   * Remove event handlers.
   *
   * This field is available on Express requests,
   * as those inherit from Node `http.IncomingMessage`,
   * in turn from `stream.Readable` and `EventEmitter`.
   *
   * See <https://nodejs.org/api/events.html#emitterremovelistenereventname-listener>.
   */
  removeListener?: EventHandlerLike;
  /**
   * Whether the readable stream is readable.
   *
   * This field is available on Express requests,
   * as those inherit from Node `http.IncomingMessage`,
   * in turn from `stream.Readable`.
   *
   * See <https://nodejs.org/api/stream.html#readablereadable>.
   */
  readable?: boolean;
}

function cookiesToString(cookies: string | string[] | undefined): string {
  if (typeof cookies === "undefined") {
    return "";
  }

  // This should never be the case with a cookie header, but we are safe
  if (Array.isArray(cookies)) {
    return cookies.join("; ");
  }

  return cookies;
}

/**
 * Configuration for the Nest integration of Arcjet.
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
 * Instance of the Nest integration of Arcjet.
 *
 * Primarily has a `protect()` method to make a decision about how a Nest request
 * should be handled.
 *
 * @template Props
 *   Configuration.
 */
export interface ArcjetNest<Props extends PlainObject = PlainObject> {
  /**
   * Make a decision about how to handle a request.
   *
   * This will analyze the request locally where possible and otherwise call
   * the Arcjet decision API.
   *
   * @param request
   *   Details about the {@linkcode ArcjetNestRequest} that Arcjet needs to make a
   *   decision.
   * @param props
   *   Additional properties required for running rules against a request.
   * @returns
   *   Promise that resolves to an {@linkcode ArcjetDecision} indicating
   *   Arcjet’s decision about the request.
   */
  protect(
    request: ArcjetNestRequest,
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
  withRule<Rule extends Product>(
    rule: Rule,
  ): ArcjetNest<Props & ExtraProps<Rule>>;
}

function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNest<ExtraProps<Rules> & CharacteristicProps<Characteristics>> {
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
    request: ArcjetNestRequest,
    props: Props,
  ): ArcjetRequest<Props> {
    // We pull the cookies from the request before wrapping them in ArcjetHeaders
    const cookies = cookiesToString(request.headers?.cookie);

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    const xArcjetIp = isDevelopment(process.env)
      ? headers.get("x-arcjet-ip")
      : undefined;
    let ip =
      xArcjetIp ||
      findIp(
        {
          ip: request.ip,
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
    let host = "";
    // We use `id` to determine if the request object is from Fastify
    // This is mostly to avoid a deprecation warning in Express
    if (typeof request.id === "string") {
      if (typeof request.host === "string") {
        host = request.host;
      } else {
        host = headers.get("host") ?? "";
      }
    } else {
      host = headers.get("host") ?? "";
    }
    let path = "";
    let query = "";
    let protocol = "";

    if (typeof request.protocol === "string") {
      if (request.protocol === "https") {
        protocol = "https:";
      } else {
        protocol = "http:";
      }
    } else {
      if (typeof request.socket?.encrypted !== "undefined") {
        protocol = request.socket.encrypted ? "https:" : "http:";
      } else {
        protocol = "http:";
      }
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
      ...props,
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

  function withClient<Properties extends PlainObject>(
    aj: Arcjet<Properties>,
  ): ArcjetNest<Properties> {
    const client: ArcjetNest<Properties> = {
      withRule(rule) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(request, props?) {
        // Cast of `{}` because here we switch from `undefined` to `Properties`.
        const req = toArcjetRequest(request, props || ({} as Properties));

        const getBody = async () => {
          // Read the stream if the body is not present.
          if (request.body === null || request.body === undefined) {
            let expectedLength: number | undefined;
            // TODO: This shouldn't need to build headers again but the type
            // for `req` above is overly relaxed
            const headers = new ArcjetHeaders(request.headers);
            const expectedLengthStr = headers.get("content-length");
            if (typeof expectedLengthStr === "string") {
              expectedLength = parseInt(expectedLengthStr, 10);
            }

            if (!warnedForAutomaticBodyRead) {
              warnedForAutomaticBodyRead = true;
              log.warn(
                "Automatically reading the request body is deprecated; please pass an explicit `sensitiveInfoValue` field. See <https://docs.arcjet.com/upgrading/sdk-migration>.",
              );
            }

            return readBody(request, { expectedLength });
          }

          // A package like `body-parser` was used to read the stream.
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
 * Symbol for Arcjet.
 *
 * Used as a label of providers that should be available in other modules.
 */
export const ARCJET = Symbol("ARCJET");

const ARCJET_OPTIONS = Symbol("ARCJET_OPTIONS");
const ARCJET_WITH_RULES = Symbol("ARCJET_WITH_RULES");

type GqlContextType = "graphql" | ContextType;

function requestFromContext(context: ExecutionContext) {
  const contextType = context.getType<GqlContextType>();
  switch (contextType) {
    case "graphql": {
      // The `req` property should exist on the context at position 2
      // https://github.com/nestjs/graphql/blob/8d19548dd8cb8c6d6003552673a6646603d2e22f/packages/graphql/lib/services/gql-execution-context.ts#L37
      const ctx = context.getArgByIndex<{ req?: ArcjetNestRequest }>(2);
      if (typeof ctx === "object" && ctx !== null && "req" in ctx) {
        return ctx.req;
      }

      // If it isn't there for some reason, we just return undefined
      return;
    }
    case "http": {
      // The request object is at position 0
      // https://github.com/nestjs/nest/blob/9825529f405fa6064eb98d8ecb2a5d3d5f1e41f9/packages/core/helpers/execution-context-host.ts#L52
      return context.getArgByIndex<ArcjetNestRequest>(0);
    }
    case "ws": {
      // TODO: Figure out if we can support "ws" context types
      return;
    }
    case "rpc": {
      // TODO: Figure out if we can support "rpc" context types
      return;
    }
    default: {
      // Avoiding the _exhaustive check to avoid some TypeScript errors in with
      // different compiler options
      return;
    }
  }
}

/**
 * Nest guard for the Arcjet Nest integration.
 *
 * See: <https://docs.nestjs.com/guards>.
 */
let ArcjetGuard = class ArcjetGuard implements CanActivate {
  aj: ArcjetNest<PlainObject>;

  /**
   * Create a Nest guard for the Arcjet.
   *
   * @param aj
   *   Arcjet Nest integration.
   * @returns
   *   Arcjet Nest guard.
   */
  constructor(aj: ArcjetNest<PlainObject>) {
    this.aj = aj;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let aj = this.aj;

    // If rules have been added with the decorator, augment the client
    const rules = getAllAndMerge(ARCJET_WITH_RULES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (Array.isArray(rules)) {
      aj = rules.reduce((aj, rule) => aj.withRule(rule), aj);
    }

    const request = requestFromContext(context);

    // If we cannot access the request, we "fail open" by allowing the request
    if (typeof request === "undefined") {
      return true;
    }

    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return false;
    } else {
      return true;
    }
  }
};
ArcjetGuard = decorate([param(0, Inject(ARCJET))], ArcjetGuard);
export { ArcjetGuard };

/**
 * Create Nest modules for the Arcjet Nest integration.
 *
 * See: <https://docs.nestjs.com/modules>.
 */
export class ArcjetModule {
  /**
   * Create a Nest module for the Arcjet Nest integration.
   *
   * You can pass your API key and any default rules that you want to apply to
   * every route.
   * This is usually in the `app.module.ts` file.
   *
   * @param options
   *   Configuration (required).
   * @returns
   *   Dynamic Nest module.
   */
  static forRoot<
    const Rules extends (Primitive | Product)[],
    const Characteristics extends readonly string[],
  >(
    options: ArcjetOptions<Rules, Characteristics> & {
      /**
       * Whether to make the module global-scoped (`boolean`, default: `false`).
       *
       * Global-scoped modules will be visible in all modules.
       */
      isGlobal?: boolean | undefined;
    },
  ): DynamicModule {
    const ArcjetProvider = {
      provide: ARCJET,
      useFactory(options: ArcjetOptions<Rules, Characteristics>) {
        return arcjet(options);
      },
      inject: [ARCJET_OPTIONS],
    };

    return {
      global: options.isGlobal || false,
      module: this,
      providers: [
        {
          provide: ARCJET_OPTIONS,
          useValue: options,
        },
        ArcjetProvider,
      ],
      exports: [ARCJET],
    };
  }

  /**
   * Create a Nest module for the Arcjet Nest integration,
   * asynchronously.
   *
   * You can pass your API key and any default rules that you want to apply to
   * every route.
   * This is usually in the `app.module.ts` file.
   *
   * @param options
   *   Configuration (required).
   * @returns
   *   Dynamic Nest module.
   */
  static forRootAsync<
    const Rules extends (Primitive | Product)[],
    const Characteristics extends readonly string[],
  >(
    options: ConfigurableModuleAsyncOptions<
      ArcjetOptions<Rules, Characteristics>
    > & {
      /**
       * Whether to make the module global-scoped (`boolean`, default: `false`).
       *
       * Global-scoped modules will be visible in all modules.
       */
      isGlobal?: boolean | undefined;
    },
  ): DynamicModule {
    const ArcjetProvider = {
      provide: ARCJET,
      useFactory(options: ArcjetOptions<Rules, Characteristics>) {
        return arcjet(options);
      },
      inject: [ARCJET_OPTIONS],
    };

    const providers: Provider[] = [ArcjetProvider];

    // This is a combination of the `createAsyncProviders` and
    // `createAsyncOptionsProvider` functions in `ConfigurableModuleBuilder`.
    // We don't use `ConfigurableModuleBuilder` because we rely on more complex
    // types for our rules.
    // Ref:
    // https://github.com/nestjs/nest/blob/44c4f8fa8d74d0e9e5470c20eff7919b749bb1df/packages/common/module-utils/configurable-module.builder.ts#L275
    // https://github.com/nestjs/nest/blob/44c4f8fa8d74d0e9e5470c20eff7919b749bb1df/packages/common/module-utils/configurable-module.builder.ts#L299
    if (options.useFactory) {
      providers.push({
        provide: ARCJET_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      });
    } else if (options.useExisting) {
      providers.push({
        provide: ARCJET_OPTIONS,
        useFactory: async (optionsFactory) => await optionsFactory.create(),
        inject: [options.useExisting],
      });
    } else if (options.useClass) {
      providers.push({
        provide: ARCJET_OPTIONS,
        useFactory: async (optionsFactory) => await optionsFactory.create(),
        inject: [options.useClass],
      });
      providers.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }
    if (options.useExisting || options.useFactory) {
      if (options.inject && options.provideInjectionTokensFrom) {
        providers.push(
          ...getInjectionProviders(
            options.provideInjectionTokensFrom,
            options.inject,
          ),
        );
      }
    }

    return {
      global: options.isGlobal || false,
      module: this,
      providers,
      exports: [ARCJET],
    };
  }
}

/**
 * Decorator that binds Arcjet rules to the scope of the controller or method,
 * depending on its context.
 *
 * When `@WithArcjetRules` is used at the controller level,
 * the rules will be applied to every handler (method) in the controller.
 *
 * When `@WithArcjetRules` is used at the individual handler level,
 * the rules will apply only to that specific method.
 *
 * @param rules
 *   List of rules.
 * @returns
 *   Decorator.
 */
export function WithArcjetRules(rules: Array<Primitive | Product>) {
  return SetMetadata(ARCJET_WITH_RULES, rules);
}

/* Begin utilties pulled from TypeScript's tslib */

// Wraps `Reflect.decorate` to avoid restrictions on `reflect-metadata` types.
// WARNING: This requires `reflect-metadata` be imported into the environment,
// which Nest.js does for their applications; however, we also require it as a
// peerDependency and import it in this adapter
function decorate(decorators: any[], target: any, key?: any, desc?: any): any {
  return Reflect.decorate(decorators, target, key, desc);
}

// Creates a decorator for a constructor parameter. Pulled out of `tslib` to
// avoid build failures.
function param(
  paramIndex: number,
  decorator: (target: any, key: any, paramIndex: number) => void,
) {
  return function (target: any, key: any) {
    decorator(target, key, paramIndex);
  };
}

/* End utilities pulled from TypeScript's tslib */

/* Begin utilities pulled from Nest.js */

// Taken from Nest.js to avoid needing to dependency inject Reflector which is
// just calling static functions and doesn't need to be a class
const isUndefined = (obj: any) => typeof obj === "undefined";
const isNil = (val: any) => isUndefined(val) || val === null;
const isObject = (fn: any) => !isNil(fn) && typeof fn === "object";
const isEmpty = (array: any) => !(array && array.length > 0);
function getAllAndMerge(metadataKeyOrDecorator: any, targets: any) {
  const metadataKey = metadataKeyOrDecorator.KEY ?? metadataKeyOrDecorator;
  const metadataCollection = (targets || [])
    .map((target: any) => Reflect.getMetadata(metadataKey, target))
    .filter((item: any) => item !== undefined);
  if (isEmpty(metadataCollection)) {
    return metadataCollection;
  }
  return metadataCollection.reduce((a: any, b: any) => {
    if (Array.isArray(a)) {
      return a.concat(b);
    }
    if (isObject(a) && isObject(b)) {
      return {
        ...a,
        ...b,
      };
    }
    return [a, b];
  });
}

// The below are taken from Nest.js to avoid needing to avoid using the
// `ConfigurableModuleBuilder` which essentially makes everything `any` typed
function isOptionalFactoryDependency(
  x: InjectionToken | OptionalFactoryDependency,
): x is OptionalFactoryDependency {
  return !!((x as any)?.token && !(x as any)?.prototype);
}

function mapInjectToTokens(t: InjectionToken | OptionalFactoryDependency) {
  return isOptionalFactoryDependency(t) ? t.token : t;
}

function getInjectionProviders(
  providers: Provider[],
  tokens: FactoryProvider["inject"],
): Provider[] {
  const result: Provider[] = [];
  let search: InjectionToken[] = tokens?.map(mapInjectToTokens) ?? [];
  while (search.length > 0) {
    const match = (providers ?? []).filter(
      (p) =>
        !result.includes(p) && // this prevents circular loops and duplication
        (search.includes(p as any) || search.includes((p as any)?.provide)),
    );
    result.push(...match);
    // get injection tokens of the matched providers, if any
    search = match
      .filter((p) => (p as any)?.inject)
      .flatMap((p) => (p as FactoryProvider).inject)
      .filter((p) => typeof p !== "undefined")
      .map(mapInjectToTokens);
  }
  return result;
}

/* End utilities pulled from Nest.js */
