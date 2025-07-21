/// <reference types="https://deno.land/x/pkg@1.0.0/types.d.ts" />

import "jsr:@std/dotenv/load";

import arcjet, { sensitiveInfo, shield } from "npm:@arcjet/deno"

const aj = arcjet({
  key: Deno.env.get("ARCJET_KEY")!,
  rules: [
    shield({ mode: "LIVE" }),
    sensitiveInfo({ mode: "LIVE", allow: [] })
  ]
})

Deno.serve({ port: 3000 }, aj.handler(async (request: Request) => {
  const decision = await aj.protect(request)

  if (decision.isDenied()) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("Hello, world!");
}));
