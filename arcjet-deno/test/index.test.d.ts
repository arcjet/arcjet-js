import { ArcjetDeno, index_d_exports } from "../index.js";
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
   * Arcjet Deno handler.
   */
  handler: ArcjetDeno<any>["handler"];
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