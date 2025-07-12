/// <reference types="@types/deno" />
import core from "arcjet";
import type {
  ArcjetDecision,
  ArcjetOptions as CoreOptions,
  ArcjetRule,
  ArcjetRequest,
  Arcjet,
  CharacteristicProps,
} from "arcjet";
import findIP, { parseProxy } from "@arcjet/ip";
import ArcjetHeaders from "@arcjet/headers";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";
import { Logger } from "@arcjet/logger";
import { createClient } from "@arcjet/protocol/client.js";
import { createTransport } from "@arcjet/transport";

// Re-export all named exports from the generic SDK
export * from "arcjet";

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
declare const emptyObjectSymbol: unique symbol;
type WithoutCustomProps = {
  [emptyObjectSymbol]?: never;
};

export type RemoteClientOptions = {
  baseUrl?: string;
  timeout?: number;
};

export function createRemoteClient(options?: RemoteClientOptions) {
  // We technically build this twice but they happen at startup.
  const env = Deno.env.toObject();

  // The base URL for the Arcjet API. Will default to the standard production
  // API unless environment variable `ARCJET_BASE_URL` is set.
  const url = options?.baseUrl ?? baseUrl(env);

  // The timeout for the Arcjet API in milliseconds. This is set to a low value
  // in production so calls fail open.
  const timeout = options?.timeout ?? (isDevelopment(env) ? 1000 : 500);

  // Transport is the HTTP client that the client uses to make requests.
  const transport = createTransport(url);

  const sdkStack = "DENO";
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
 * The options used to configure an {@link ArcjetDeno} client.
 */
export interface ArcjetOptions extends CoreOptions {
  /**
   * One or more IP Address of trusted proxies in front of the application.
   * These addresses will be excluded when Arcjet detects a public IP address.
   */
  proxies?: Array<string>;
}

/**
 * The ArcjetDeno client provides a public `protect()` method to
 * make a decision about how a Deno request should be handled.
 */
export interface ArcjetDeno<Props extends Record<string, unknown>> {
  /**
   * Runs a request through the configured protections. The request is
   * analyzed and then a decision made on whether to allow, deny, or challenge
   * the request.
   *
   * @param request - A `Request` provided to the fetch handler.
   * @param props - Additonal properties required for running rules against a request.
   * @returns An {@link ArcjetDecision} indicating Arcjet's decision about the request.
   */
  protect(
    request: Request,
    // We use this neat trick from https://stackoverflow.com/a/52318137 to make a single spread parameter
    // that is required if the ExtraProps aren't strictly an empty object
    ...props: Props extends WithoutCustomProps ? [] : [Props]
  ): Promise<ArcjetDecision>;

  /**
   * Augments the client with another rule. Useful for varying rules based on
   * criteria in your handler—e.g. different rate limit for logged in users.
   *
   * @param rule The rule to add to this execution.
   * @returns An augmented {@link ArcjetDeno} client.
   */
  withRule<Rule extends ArcjetRule>(
    rules: ReadonlyArray<Rule>,
  ): ArcjetDeno<Props & (Rule extends ArcjetRule<infer T> ? T : {})>;

  /**
   * Wraps the Deno `fn` handler to provide additional Request details
   * when calling the SDK's `protect()` function.
   *
   * @param fn: The user provided `fn` handler
   */
  handler(
    fn: (
      request: Request,
      info: Deno.ServeHandlerInfo<Deno.NetAddr>,
    ) => Response | Promise<Response>,
  ): (
    request: Request,
    info: Deno.ServeHandlerInfo<Deno.NetAddr>,
  ) => Response | Promise<Response>;
}

/**
 * Create a new {@link ArcjetDeno} client. Always build your initial client
 * outside of a request handler so it persists across requests. If you need to
 * augment a client inside a handler, call the `withRule()` function on the base
 * client.
 *
 * @param options - Arcjet configuration options to apply to all requests.
 */
export default function arcjet<const Options extends ArcjetOptions>(
  options: Options,
): ArcjetDeno<
  CharacteristicProps<Exclude<Options["characteristics"], undefined>[number]> &
    (Options["rules"][number][number] extends ArcjetRule<infer P> ? P : {})
> {
  // We technically build this twice but they happen at startup.
  const env = Deno.env.toObject();

  const client = options.client ?? createRemoteClient();

  // Assuming the `handler()` function was used around Deno's fetch handler this
  // WeakMap should be populated with IP addresses inspected via
  // `ServeHandlerInfo`
  const ipCache = new WeakMap<Request, string>();

  const log = options.log
    ? options.log
    : new Logger({
        level: logLevel(env),
      });

  const proxies = Array.isArray(options.proxies)
    ? options.proxies.map(parseProxy)
    : undefined;

  if (isDevelopment(process.env)) {
    log.warn(
      "Arcjet will use 127.0.0.1 when missing public IP address in development mode",
    );
  }

  function toArcjetRequest(
    request: Request,
    props: Record<string, unknown>,
  ): ArcjetRequest {
    const cookies = request.headers.get("cookie") ?? undefined;

    // We construct an ArcjetHeaders to normalize over Headers
    const headers = new ArcjetHeaders(request.headers);

    const url = new URL(request.url);
    let ip = findIP(
      {
        // This attempts to lookup the IP in the `ipCache`. This is primarily a
        // workaround to the API design in Deno that requires access to the
        // `ServeHandlerInfo` to lookup an IP.
        ip: ipCache.get(request),
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

  function withClient<const Rule extends ArcjetRule>(
    aj: Arcjet<Rule extends ArcjetRule<infer T> ? T : {}>,
  ): ArcjetDeno<Rule extends ArcjetRule<infer T> ? T : {}> {
    return Object.freeze({
      withRule(rules: ReadonlyArray<ArcjetRule>) {
        const client = aj.withRule(rules);
        return withClient(client);
      },
      async protect(
        request: Request,
        ...[props]: (
          Rule extends ArcjetRule<infer T> ? T : {}
        ) extends WithoutCustomProps
          ? []
          : [Rule extends ArcjetRule<infer T> ? T : {}]
      ): Promise<ArcjetDecision> {
        // TODO(#220): The generic manipulations get really mad here, so we cast
        // Further investigation makes it seem like it has something to do with
        // the definition of `props` in the signature but it's hard to track down
        const req = toArcjetRequest(request, props ?? {});

        const getBody = async () => {
          try {
            const clonedRequest = request.clone();
            // Awaited to throw if it rejects and we'll just return undefined
            const body = await clonedRequest.text();
            return body;
          } catch (e) {
            log.error("failed to get request body: %s", errorMessage(e));
            return;
          }
        };

        return aj.protect({ getBody }, req);
      },
      handler(
        fn: (
          request: Request,
          info: Deno.ServeHandlerInfo<Deno.NetAddr>,
        ) => Response | Promise<Response>,
      ) {
        return async function (
          request: Request,
          info: Deno.ServeHandlerInfo<Deno.NetAddr>,
        ): Promise<Response> {
          // According to https://stackoverflow.com/a/71011282, "Technically, it's
          // the remote hostname, but it's very likely to be an IP address unless
          // you have configured custom DNS settings in your server environment"
          const hostname = info.remoteAddr.hostname;
          if (hostname) {
            ipCache.set(request, hostname);
          }

          return fn(request, info);
        };
      },
    });
  }

  const aj = core({ ...options, client, log });

  return withClient(aj);
}
