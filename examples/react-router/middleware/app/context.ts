import type { ArcjetDecision } from "@arcjet/react-router";
import { createContext } from "react-router";

export const arcjetDecisionContext = createContext<ArcjetDecision | undefined>();
