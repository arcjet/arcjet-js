import { defineMiddleware } from "astro/middleware";

// We use a middleware to store the IP address on a `Request` with this symbol.
// This is due to Astro inconsistently using `Symbol.for("astro.clientAddress")`
// to store the client address and not exporting it from their module.
const ipSymbol = Symbol.for("arcjet.ip");

export const onRequest = defineMiddleware((ctx, next) => {
  if (!ctx.isPrerendered) {
    let ip: string | undefined;

    // Getter can throw.
    try {
      ip = ctx.clientAddress;
    } catch {
      // Empty.
    }

    Reflect.set(ctx.request, ipSymbol, ip);
  }

  return next();
});
