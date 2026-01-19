import type { ArcjetDecision } from "arcjet:client";

declare global {
  declare namespace App {
    interface Locals {
      decision?: ArcjetDecision;
    }
  }
}
