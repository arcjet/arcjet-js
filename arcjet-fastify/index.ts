import process from "node:process";
import {
  baseUrl as baseUrlFromEnvironment,
  isDevelopment,
  logLevel,
  platform,
} from "@arcjet/env";
import ArcjetHeaders from "@arcjet/headers";
// TODO(@wooorm-arcjet): Expose `Cidr` from `@arcjet/ip`.
import findIp, { parseProxy } from "@arcjet/ip";
import { Logger } from "@arcjet/logger";
// TODO(@wooorm-arcjet): use export maps to hide file extensions and lock down API.
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";
import type {
  ArcjetDecision,
  ArcjetLogger,
  ArcjetOptions as CoreOptions,
  ArcjetRequest,
  Arcjet,
  CharacteristicProps,
  Primitive,
  Product,
  ExtraProps,
} from "arcjet";
import arcjetCore from "arcjet";
import type { FastifyRequest } from "fastify";

// TODO(@wooorm-arcjet): using `export all` will leak things in the public API,
// resulting in unneeded breaking changes,
// we must be explicit about what is exported.
export * from "arcjet";

// TODO(@wooorm-arcjet): deduplicate.
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

// TODO(@wooorm-arcjet): remove.
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
// TODO(@wooorm-arcjet): remove.
declare const emptyObjectSymbol: unique symbol;

// TODO(@wooorm-arcjet): remove.
type WithoutCustomProps = {
  [emptyObjectSymbol]?: never;
};

// TODO(@wooorm-arcjet): remove.
type PlainObject = {
  [key: string]: unknown;
};

/**
 * Configuration for {@linkcode createRemoteClient}.
 */
// TODO(@wooorm-arcjet): document this undocumented feature.
export interface RemoteClientOptions {
  baseUrl?: string | null | undefined;
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
// TODO(@wooorm-arcjet): document this undocumented feature.
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
 * Type that represents an instance of our `ArcjetFastify` client.
 *
 * @typeParam Props
 *   Accumulated properties that are needed when calling `protect`;
 *   these come from (repeatedly) calling `withRule` with different rules
 *   and from the rules passed to the initial `arcjetFastify` call.
 */
export interface ArcjetFastify<Props> {
  /**
   * Decide what to do with the given Fastify request using the configured rules.
   *
   * @param request
   *   Request from Fastify.
   * @param properties
   *   Properties that are needed for the configured rules.
   * @returns
   *   Promise for a decision about the request.
   */
  protect(
    request: FastifyRequest,
    ...properties: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;

  /**
   * Add more rules.
   *
   * @param rule
   *   Rule.
   * @returns
   *   New client with more rules configured.
   */
  withRule<Rule extends Primitive | Product>(
    rules: Rule,
  ): ArcjetFastify<Props & ExtraProps<Rule>>;
}

/**
 * Configuration for {@linkcode ArcjetFastify}.
 *
 * @typeParam Rules
 *   Inferred type of rules.
 * @typeParam Characteristics
 *   Inferred type of characteristics (except for the well-known ones).
 */
// TODO(@wooorm-arcjet): remove type parameters,
// use a regular interface that extends.
// TODO(@wooorm-arcjet): add `null` in `CoreOptions`.
export type ArcjetOptions<
  Rules extends [...Array<Primitive | Product>],
  Characteristics extends ReadonlyArray<string>,
> = CoreOptions<Rules, Characteristics> & {
  /**
   * One or more IP Address of trusted proxies in front of the application.
   * These addresses will be excluded when Arcjet detects a public IP address.
   */
  proxies?: ReadonlyArray<string> | null | undefined;
};

/**
 * Create an Arcjet client to integrate with Fastify.
 *
 * > 👉 **Tip**:
 * > build your initial base client with as many rules as possible outside of a
 * > request handler;
 * > if you need more rules inside handlers later then you can call `withRule()`
 * > on that base client.
 *
 * @param options
 *   Configuration (**required**).
 * @returns
 *   Arcjet client for Fastify.
 */
// TODO(@wooorm-arcjet): remove type parameters.
export default function arcjet<
  const Rules extends (Primitive | Product)[],
  const Characteristics extends readonly string[],
>(
  options: ArcjetOptions<Rules, Characteristics>,
): ArcjetFastify<ExtraProps<Rules> & CharacteristicProps<Characteristics>> {
  const client = options.client ?? createRemoteClient();
  const log = options.log
    ? options.log
    : new Logger({ level: logLevel(process.env) });
  const proxies = options.proxies ? options.proxies.map(parseProxy) : undefined;

  if (isDevelopment(process.env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function withClient<const Rules extends (Primitive | Product)[]>(
    aj: Arcjet<ExtraProps<Rules>>,
  ): ArcjetFastify<ExtraProps<Rules>> {
    return Object.freeze({
      async protect(
        fastifyRequest: FastifyRequest,
        ...[properties]: ExtraProps<Rules> extends WithoutCustomProps
          ? []
          : [ExtraProps<Rules>]
      ): Promise<ArcjetDecision> {
        const arcjetRequest = toArcjetRequest(
          fastifyRequest,
          log,
          proxies,
          properties || {},
        );

        return aj.protect(
          { getBody },
          // @ts-expect-error: TODO(#220): fix types for arcjet requests.
          arcjetRequest,
        );

        async function getBody() {
          try {
            if (typeof fastifyRequest.body === "string") {
              return fastifyRequest.body;
            } else if (
              fastifyRequest.body === null ||
              fastifyRequest.body === undefined
            ) {
              return undefined;
            } else {
              return JSON.stringify(fastifyRequest.body);
            }
          } catch (e) {
            log.error("failed to get request body: %s", errorMessage(e));
            return;
          }
        }
      },
      withRule(rule: Primitive | Product) {
        const childClient = aj.withRule(rule);
        return withClient(childClient);
      },
    });
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
 * @returns
 *   Arcjet request.
 */
function toArcjetRequest<Properties extends PlainObject>(
  request: FastifyRequest,
  log: ArcjetLogger,
  // TODO(@wooorm-arcjet): use `Cidr` type here.
  proxies: ReadonlyArray<ReturnType<typeof parseProxy>> | undefined,
  properties: Properties,
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

  let ip = findIp(
    { headers, socket: request.socket },
    { platform: platform(process.env), proxies },
  );

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
  // Note: there may be a better way to detect `https`, no clue.
  let protocol = request.server.initialConfig.https ? "https:" : "http:";
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
