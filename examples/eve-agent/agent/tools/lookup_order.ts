import { defineTool } from "eve/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/vercel-eve/v0";

import { arcjet, orderLookupLimit } from "../arcjet.js";

export default guardTool(
  arcjet,
  defineTool({
    description: "Look up an order by number",
    inputSchema: z.object({ orderNumber: z.string() }),
    async execute(input) {
      return { orderNumber: input.orderNumber, status: "shipped" };
    },
  }),
  {
    action: "order.looked-up",
    rules: (input) => [orderLookupLimit({ key: input.orderNumber, requested: 1 })],
  },
);
