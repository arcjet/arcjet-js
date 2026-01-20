import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import arcjetClient, { sensitiveInfo, validateEmail } from "arcjet:client";

export const server = {
  sensitiveInfo: defineAction({
    accept: "form",
    input: z.object({
      content: z.string(),
    }),
    handler: async (_input, { request }) => {
      const decision = await arcjetClient
        .withRule(sensitiveInfo({ mode: "LIVE", allow: [] }))
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
  email: defineAction({
    accept: "form",
    input: z.object({
      email: z.string(),
    }),
    handler: async ({ email }, { request }) => {
      const decision = await arcjetClient
        .withRule(validateEmail({ mode: "LIVE", allow: [ "FREE", "NO_GRAVATAR"] }))
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
};
