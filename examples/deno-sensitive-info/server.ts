/// <reference lib="deno.ns" />

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
  const value = await request.text();
  const decision = await aj.protect(request, { sensitiveInfoValue: value })

  if (decision.isDenied()) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("Hello, world!");
}));
