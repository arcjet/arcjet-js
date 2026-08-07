import { defineTool } from "eve/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/vercel-eve/v0";

import { arcjet, orderLookupLimit } from "../arcjet.js";

export default guardTool(
  arcjet,
  defineTool({
    description: "Look up an order by number",
    inputSchema: z.object({ orderNumber: z.string() }),
    // No outputSchema, deliberately. The AI SDK does not check a locally
    // executed tool's return against one during the tool loop, but it does
    // when validating persisted message history — so a tool that declares an
    // outputSchema must not surface a denial as a result object. Omitting it
    // keeps `onDeny: "result"` available here.
    async execute(input) {
      return { orderNumber: input.orderNumber, status: "shipped" };
    },
  }),
  {
    action: "order.looked-up",
    rules: (input) => [orderLookupLimit({ key: input.orderNumber, requested: 1 })],
  },
);
