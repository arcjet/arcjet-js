import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import arcjetClient, {
  detectBot,
  filter,
  protectSignup,
  sensitiveInfo,
  validateEmail,
} from "arcjet:client";

const arcjetDetectBotClient = arcjetClient.withRule(
  detectBot({ mode: "LIVE", allow: [] }),
);

const arcjetEmailClient = arcjetClient.withRule(
  validateEmail({ mode: "LIVE", allow: ["FREE", "NO_GRAVATAR"] }),
);

const arcjetFilterClient = arcjetClient.withRule(
  filter({
    mode: "LIVE",
    deny: ['lower(http.request.headers["user-agent"]) matches "chrome"'],
  }),
);

const arcjetProtectSignupClient = arcjetClient.withRule(
  protectSignup({
    bots: { mode: "LIVE", allow: [] },
    email: { mode: "LIVE", allow: ["FREE", "NO_GRAVATAR"] },
    rateLimit: { mode: "LIVE", interval: "10m", max: 5 },
  }),
);

const arcjetSensitiveInfoClient = arcjetClient.withRule(
  sensitiveInfo({ mode: "LIVE", allow: [] }),
);

export const server = {
  bot: defineAction({
    accept: "form",
    handler: async (_input, { request }) => {
      const decision = await arcjetDetectBotClient.protect(request);

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
  email: defineAction({
    accept: "form",
    input: z.object({
      email: z.string(),
    }),
    handler: async ({ email }, { request }) => {
      const decision = await arcjetEmailClient.protect(request, { email });
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
  filter: defineAction({
    accept: "form",
    handler: async (_input, { request }) => {
      const decision = await arcjetFilterClient.protect(request);

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
  protectSignup: defineAction({
    accept: "form",
    input: z.object({
      email: z.string(),
    }),
    handler: async ({ email }, { request }) => {
      const decision = await arcjetProtectSignupClient.protect(request, {
        email,
      });
      if (decision.isDenied()) {
        if (decision.reason.isBot()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "You look like a bot.",
          });
        }

        if (decision.reason.isEmail()) {
          throw new ActionError({
            code: "BAD_REQUEST",
            message: "Invalid email address provided.",
          });
        }

        if (decision.reason.isRateLimit()) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many signup attempts. Please try again later.",
          });
        }

        throw new ActionError({ code: "FORBIDDEN", message: "Forbidden" });
      }

      return "Signed up.";
    },
  }),
  sensitiveInfo: defineAction({
    accept: "form",
    input: z.object({
      content: z.string(),
    }),
    handler: async (input, { request }) => {
      const decision = await arcjetSensitiveInfoClient.protect(request, {
        sensitiveInfoValue: input.content,
      });

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
