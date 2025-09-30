// import arcjet, { fixedWindow, sensitiveInfo, shield } from "#arcjet";

import { defineNuxtPlugin } from "nuxt/app";

// const aj = arcjet({
//   key: process.env.ARCJET_KEY!,
//   rules: [
//     fixedWindow({ max: 5, mode: "LIVE", window: "10s" }),
//     sensitiveInfo({ allow: [], mode: "LIVE" }),
//     shield({ mode: "LIVE" }),
//   ],
// });

const config = useRuntimeConfig()
console.log(config);

// defineNuxtPlugin({
//   setup(app)
// })


export default defineEventHandler(async (event) => {
  const aj = useArcjet();
  console.log(aj)
  // const decision = await aj.withRule().protect(event.node.req);

  // if (decision.isDenied()) {
  //   if (decision.reason.isRateLimit()) {
  //     throw createError({
  //       statusCode: 429,
  //       statusMessage: "Too many requests",
  //     });
  //   }

  //   if (decision.reason.isSensitiveInfo()) {
  //     throw createError({
  //       statusCode: 400,
  //       statusMessage: "Form contains sensitive info.",
  //     });
  //   }

  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: "Forbidden",
  //   });
  // }

  return "No sensitive info detected.";
});
