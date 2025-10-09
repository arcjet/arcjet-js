import { Permit } from "permitio";

export const permit = new Permit({
  pdp: process.env.PERMIT_PDP!,
  token: process.env.PERMIT_TOKEN!,
});
