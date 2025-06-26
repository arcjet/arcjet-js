import { value as bun } from "#bun";
import { value as deno } from "#deno";
import { value as edgeLight } from "#edge-light";
import { value as node } from "#node";
import { value as workerd } from "#workerd";

export type Runtime = "workerd" | "deno" | "node" | "bun" | "edge-light" | "";

export function runtime(): Runtime {
  if (workerd) {
    return "workerd";
  }

  if (deno) {
    return "deno";
  }

  if (bun) {
    return "bun";
  }

  if (edgeLight) {
    return "edge-light";
  }

  if (node) {
    return "node";
  }

  // Unknown or unsupported runtime
  return "";
}
