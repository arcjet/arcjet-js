import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import arcjetClient, { detectBot, filter, sensitiveInfo, validateEmail } from "arcjet:client";

const arcjetEmailClient = arcjetClient
  .withRule(validateEmail({ mode: "LIVE", allow: [ "FREE", "NO_GRAVATAR"] }))

const arcjetDetectBotClient = arcjetClient
  .withRule(detectBot({ mode: "LIVE", allow: [] }))

const arcjetSensitiveInfoClient = arcjetClient
  .withRule(sensitiveInfo({ mode: "LIVE", allow: [] }))

const arcjetFilterClient = arcjetClient
  .withRule(filter({ mode: "LIVE", deny: [ "lower(http.request.headers[\"user-agent\"]) matches \"chrome\"" ] }))

export const server = {
  email: defineAction({
    accept: "form",
    input: z.object({
      email: z.string(),
    }),
    handler: async ({ email }, { request }) => {
      const decision = await arcjetEmailClient
        .protect(request, { email });
      if (decision.isDenied()) {
        if (decision.reason.isEmail()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: `Invalid email address provided.`,
          });
        } else {
          throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
        }
      }

      return "Valid email address.";
    },
  }),
  bot: defineAction({
    accept: "form",
    handler: async (_input, { request }) => {
      const decision = await arcjetDetectBotClient
        .protect(request);

      if (decision.isDenied()) {
        if (decision.reason.isBot()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "You look like a bot.",
          });
        } else {
          throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
        }
      }

      return "You appear to be human.";
    },
  }),
  filter: defineAction({
    accept: "form",
    handler: async (_input, { request }) => {
      const decision = await arcjetFilterClient
        .protect(request);

      if (decision.isDenied()) {
        if (decision.reason.isFilter()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "This appears to be Chrome",
          });
        } else {
          throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
        }
      }

      return "This does not look like Chrome.";
    },
  }),
  sensitiveInfo: defineAction({
    accept: "form",
    input: z.object({
      content: z.string(),
    }),
    handler: async (_input, { request }) => {
      const decision = await arcjetSensitiveInfoClient
        .protect(request);
      if (decision.isDenied()) {
        if (decision.reason.isSensitiveInfo()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: `Your message contains sensitive information.`,
          });
        } else {
          throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
        }
      }

      return "No sensitive information was detected in your message.";
    },
  }),
};
