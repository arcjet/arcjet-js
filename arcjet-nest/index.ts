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
import findIP, { parseProxy } from "@arcjet/ip";
import ArcjetHeaders from "@arcjet/headers";
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
import { causeToString } from "../inline-helpers/index.js";

// Re-export all named exports from the generic SDK
export * from "arcjet";

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

// Interface of fields that the Arcjet Nest.js SDK expects on Request objects
export interface ArcjetNestRequest {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  body?: unknown;
  // Will only exist for Fastify
  id?: string;
  ip?: string;
  protocol?: string;
  host?: string;
  // Will only exist for Express
  socket?: Partial<{ remoteAddress: string; encrypted: boolean }>;
  on?: EventHandlerLike;
  removeListener?: EventHandlerLike;
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
 * The options used to configure an {@link ArcjetNest} client.
 */
export type ArcjetOptions<
  Rules extends [...Array<Primitive | Product>],
  Characteristics extends readonly string[],
> = Simplify<
  CoreOptions<Rules, Characteristics> & {
    /**
     * One or more IP Address of trusted proxies in front of the application.
     * These addresses will be excluded when Arcjet detects a public IP address.
     */
    proxies?: Array<string>;
  }
>;

/**
 * The ArcjetNest client provides a public `protect()` method to
 * make a decision about how a NestJS request should be handled.
 */
export interface ArcjetNest<Props extends PlainObject = {}> {
  /**
   * Runs a request through the configured protections. The request is
   * analyzed and then a decision made on whether to allow, deny, or challenge
   * the request.
   *
   * @param req - An `IncomingMessage` provided to the request handler.
   * @param props - Additonal properties required for running rules against a request.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(
    request: ArcjetNestRequest,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...props: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;

  /**
   * Augments the client with another rule. Useful for varying rules based on
   * criteria in your handler—e.g. different rate limit for logged in users.
   *
   * @param rule The rule to add to this execution.
   * @returns An augmented {@link ArcjetNest} client.
   */
  withRule<Rule extends Primitive | Product>(
    rule: Rule,
  ): ArcjetNest<Simplify<Props & ExtraProps<Rule>>>;
}

function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetNest<
  Simplify<ExtraProps<Rules> & CharacteristicProps<Characteristics>>
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

  function toArcjetRequest<Props extends PlainObject>(
    request: ArcjetNestRequest,
    props: Props,
  ): ArcjetRequest<Props> {
    // We pull the cookies from the request before wrapping them in ArcjetHeaders
    const cookies = cookiesToString(request.headers?.cookie);

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    let ip = findIP(
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

  function withClient<const Rules extends (Primitive | Product)[]>(
    aj: Arcjet<ExtraProps<Rules>>,
  ): ArcjetNest<ExtraProps<Rules>> {
    return Object.freeze({
      withRule(rule: Primitive | Product) {
        const client = aj.withRule(rule);
        return withClient(client);
      },
      async protect(
        request: ArcjetNestRequest,
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
            log.error("failed to get request body: %s", causeToString(e));
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

let ArcjetGuard = class ArcjetGuard implements CanActivate {
  aj: ArcjetNest<WithoutCustomProps>;

  constructor(aj: ArcjetNest<WithoutCustomProps>) {
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

export class ArcjetModule {
  static forRoot<
    const Rules extends (Primitive | Product)[],
    const Characteristics extends readonly string[],
  >(
    options: ArcjetOptions<Rules, Characteristics> & {
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
      global: options.isGlobal,
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
  static forRootAsync<
    const Rules extends (Primitive | Product)[],
    const Characteristics extends readonly string[],
  >(
    options: ConfigurableModuleAsyncOptions<
      ArcjetOptions<Rules, Characteristics>
    > & { isGlobal?: boolean | undefined },
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
      global: options.isGlobal,
      module: this,
      providers,
      exports: [ARCJET],
    };
  }
}

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
