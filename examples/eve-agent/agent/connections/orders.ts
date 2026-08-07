import { defineOpenAPIConnection } from "eve/connections";
import { guardApproval } from "@arcjet/guard/vercel-eve/v0";

import { arcjet, apiLimit } from "../arcjet.js";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Orders API",
    version: "1.0.0",
  },
  servers: [
    {
      url: process.env.ORDERS_API_BASE_URL ?? "https://api.example.invalid",
    },
  ],
  paths: {
    "/orders/{orderId}": {
      get: {
        operationId: "GetOrder",
        summary: "Get order details",
        parameters: [
          {
            name: "orderId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Order details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    status: { type: "string" },
                    total: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default defineOpenAPIConnection({
  spec,
  description: "Orders API for looking up and managing orders",
  approval: guardApproval(arcjet, {
    action: "orders-api.read",
    rules: (ctx) => [apiLimit({ key: ctx.session.id, requested: 1 })],
  }),
  operations: {
    allow: ["GetOrder"],
  },
});
