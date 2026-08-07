import { defineTool } from "eve/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/vercel-eve/v0";

import { arcjet, orderLookupLimit } from "../arcjet.js";

export default guardTool(
  arcjet,
  defineTool({
    description: "Look up an order by number",
    inputSchema: z.object({ orderNumber: z.string() }),
    // Deliberately omitted: outputSchema is not validated during tool execution
    // in Eve (unlike the AI SDK), so declaring one would commit us to a shape that
    // persisted decisions must match. A tool returning a denial object would
    // violate that schema. See Phase 4 for the validation timing.
    async execute(input) {
      return { orderNumber: input.orderNumber, status: "shipped" };
    },
  }),
  {
    action: "order.looked-up",
    rules: (input) => [orderLookupLimit({ key: input.orderNumber, requested: 1 })],
  },
);
