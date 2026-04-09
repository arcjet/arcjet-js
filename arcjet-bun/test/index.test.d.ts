import { ArcjetBun, index_d_exports } from "../index.js";
import { Client } from "@arcjet/protocol/client.js";

//#region test/index.test.d.ts
/**
 * Configuration for {@linkcode createSimpleServer}.
 */
interface SimpleServerOptions {
  /**
   * Hook after the decision is made.
   */
  after?(request: Request): Promise<undefined> | undefined;
  /**
   * Hook before the decision is made.
   */
  before?(request: Request): Promise<undefined> | undefined;
  /**
   * Make a decision.
   */
  decide(request: Request): Promise<index_d_exports.ArcjetDecision>;
  /**
   * Arcjet Bun handler.
   */
  handler: ArcjetBun<any>["handler"];
}
/**
 * Capture and restore environment variables.
 *
 * @returns
 *   Restore function.
 */
declare function capture(): () => void;
/**
 * Create an empty client to not hit the internet but always decide as allow
 * and never report.
 *
 * @returns
 *   Client.
 */
declare function createLocalClient(): Client;
/**
 * Create a simple server.
 *
 * @param options
 *   Configuration (required).
 * @returns
 *   Simple server and its URL.
 */
declare function createSimpleServer(options: SimpleServerOptions): {
  server: Bun.Server<any>;
  url: URL;
};
//#endregion
export { SimpleServerOptions, capture, createLocalClient, createSimpleServer };