/**
 * Every name `@arcjet/ip` exports, listed so that `tsc` fails if one is removed,
 * renamed, or changes between a value and a type.
 *
 * Type-only exports are erased before anything runs, so the sibling
 * `exports.test.ts` cannot see them; a re-export names them without
 * instantiating them, which keeps generic exports out of the way.
 *
 * This file is type checked and never executed.
 *
 * @packageDocumentation
 */

export { cloudflare, findIp, parseProxies, parseProxy } from "../../src/exports/index";

export type {
  Cidr,
  ClientIpFormat,
  ClientIpHeader,
  CloudflareOptions,
  HeaderLike,
  Options,
  Platform,
  ProxyService,
  RequestLike,
} from "../../src/exports/index";
