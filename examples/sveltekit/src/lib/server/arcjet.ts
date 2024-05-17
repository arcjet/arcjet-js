import arcjet, { shield } from "arcjet";
import { env } from "$env/dynamic/private";

export const aj = arcjet({
  key: env.ARCJET_KEY!,
  rules: [shield({ mode: "LIVE" })],
});
