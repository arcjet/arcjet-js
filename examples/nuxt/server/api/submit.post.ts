import arcjet, { fixedWindow, sensitiveInfo, shield } from "#arcjet";

const aj = arcjet({
  rules: [
    fixedWindow({ max: 5, mode: "LIVE", window: "10s" }),
    sensitiveInfo({ allow: [], mode: "LIVE" }),
    shield({ mode: "LIVE" }),
  ],
});

export default defineEventHandler(async function (event) {
  const value = await readBody(event);
  const decision = await aj.protect(event, { sensitiveInfoValue: value });

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests",
      });
    }

    if (decision.reason.isSensitiveInfo()) {
      throw createError({
        statusCode: 400,
        statusMessage: "Form contains sensitive info.",
      });
    }

    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  return "No sensitive info detected.";
});
