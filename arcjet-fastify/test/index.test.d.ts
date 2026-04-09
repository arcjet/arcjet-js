import { index_d_exports } from "../index.js";
import { Client } from "@arcjet/protocol/client.js";
import { FastifyRequest, FastifyServerOptions } from "fastify";

//#region test/index.test.d.ts
/**
 * Configuration for {@linkcode createSimpleServer}.
 */
interface SimpleServerOptions {
  /**
   * Hook after the decision is made.
   */
  after?(request: FastifyRequest): Promise<undefined> | undefined;
  /**
   * Hook before the decision is made.
   */
  before?(request: FastifyRequest): Promise<undefined> | undefined;
  /**
   * Make a decision.
   */
  decide(request: FastifyRequest): Promise<index_d_exports.ArcjetDecision>;
  /**
   * Configuration for Fastify.
   */
  fastifyOptions?: FastifyServerOptions | undefined;
}
/**
 * Create an empty client to not hit the internet but always decide as allow
 * and never report.
 *
 * @returns
 *   Client.
 */
declare function createLocalClient(): Client;
//#endregion
export { SimpleServerOptions, createLocalClient };