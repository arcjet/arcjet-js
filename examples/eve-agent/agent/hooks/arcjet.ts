import { defineHook } from "eve/hooks";
import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";

import { arcjet } from "../arcjet.js";

export default defineHook(arcjetHooks(arcjet));
