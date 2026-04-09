import { Client } from "@arcjet/protocol/client.js";

//#region test/index.test.d.ts
/**
 * Create an empty client to not hit the internet but always decide as allow
 * and never report.
 *
 * @returns
 *   Client.
 */
declare function createLocalClient(): Client;
//#endregion
export { createLocalClient };