import process from "node:process";
import { readBody } from "@arcjet/body";
import type { Env } from "@arcjet/env";
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
// TODO(@wooorm-arcjet): we use export maps, this export map leaks files.
// Export maps should be clean, no file extensions.
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
// TODO(@wooorm-arcjet): this looks like an undocumented feature leaking into the public API.
// Keep it internal.
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
// TODO(@wooorm-arcjet): this looks like an undocumented feature leaking into the public API.
// Keep it internal.
export function createRemoteClient(
  options?: RemoteClientOptions | null | undefined,
) {
  const settings = options ?? {};
  const baseUrl = settings.baseUrl ?? baseUrlFromEnvironment(process.env);

  return createClient({
    baseUrl,
    // @ts-expect-error: TODO(@wooorm-arcjet): register label in protocol.
    sdkStack: "FASTIFY",
    sdkVersion: "__ARCJET_SDK_VERSION__",
    timeout: settings.timeout ?? (isDevelopment(process.env) ? 1000 : 500),
    transport: createTransport(baseUrl),
  });
}

/**
 * Type that represents a sort-of instance of our `ArcjetFastify` clients:
 * plain objects that we build on the fly.
 *
 * @typeParam Props
 *   Accumulated properties that are needed when calling `protect`;
 *   these come from (repeatedly) calling `withRule` with different rules
 *   and from the rules passed to the initial `arcjetFastify` call.
 */
// TODO(@wooorm-arcjet): this looks like an interface is shared with other clients.
// Move upwards and extend here.
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
   * @param rules
   *   List of rules.
   * @returns
   *   New client with more rules configured.
   */
  withRule<Rules extends Primitive | Product>(
    rules: Rules,
  ): ArcjetFastify<Props & ExtraProps<Rules>>;
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

  // TODO(@wooorm-arcjet): being in development doesn’t seem like something that
  // should be warned about,
  // but an `info` log?
  // Also, the message is about a public IP but this check doesn’t seem to be?
  // Why not warn below, and track whether it’s been warned for zero-or-one time?
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
          // @ts-expect-error: TODO(@wooorm-arcjet): fix types for arcjet requests.
          arcjetRequest,
        );

        async function getBody() {
          try {
            // TODO(@wooorm-arcjet): fix types of `ArcjetRequest` and use `arcjetRequest.headers`
            // here: it exists but the types are wrong.
            const headers = new ArcjetHeaders(fastifyRequest.headers);
            const contentLength = headers.get("content-length");
            let expectedLength: number | undefined;

            if (typeof contentLength === "string") {
              try {
                expectedLength = parseInt(contentLength, 10);
              } catch {
                // Ignore unparsable `content-length`.
              }
            }

            // Awaited to throw if it rejects and we'll just return undefined
            // TODO(@wooorm-arcjet): the try/catch seems to be too big to know definitely that only redirects throw.
            const body = await readBody(fastifyRequest.raw, {
              expectedLength,
              // TODO(@wooorm-arcjet): this looks like a security vulnerability:
              // what if there is more data after that 1mb?
              // We will process 1mb bodies
              // TODO(@wooorm-arcjet): configurable? Otherwise, some constant instead of magic number.
              limit: 1048576,
            });

            return body;
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
  // Extract cookies from original request headers.
  // TODO(@wooorm-arcjet): why?
  // And, why is there dead code for arrays?
  const cookies =
    typeof requestHeaders.cookie === "string" ? requestHeaders.cookie : "";
  const headers = new ArcjetHeaders(requestHeaders);

  let ip = findIp(
    { headers, socket: request.socket },
    // TODO(@wooorm-arcjet): readonly support in `findIp`.
    { platform: platform(process.env), proxies: proxies ? [...proxies] : [] },
  );

  if (ip === "") {
    if (isDevelopment(process.env)) {
      ip = "127.0.0.1";
    } else {
      // TODO(@wooorm-arcjet): should this warn on every request?
      // Is once enough?
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
