import arcjet, { fixedWindow, shield } from "@arcjet/bun"

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
      shield({ mode: "LIVE" }),
      fixedWindow({
        mode: "LIVE",
        max: 1,
        window: "1m",
      }),
    ],
});

// Exporting a server
export default {
  port: 8080,
  fetch: aj.wrap(async (req) => {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      return new Response("Blocked", { status: 403 });
    }

    return new Response("Hello world");
  }),
};

// Or using the `Bun.serve()` API
// const server = Bun.serve({
//   port: 8080,
//   fetch: aj.wrap(async (req) => {
//     const decision = await aj.protect(req);

//     if (decision.isDenied()) {
//       return new Response("Blocked", { status: 403 });
//     }

//     return new Response("Hello world");
//   }),
// });

// console.log(`Listening on ${server.url}`);
