import { NextResponse } from "next/server";
import {
  clients,
  defaultInjectionModel,
  defaultModel,
  models,
  scenarios,
} from "@/lib/demo";

export function GET() {
  return NextResponse.json({
    clients,
    models: Object.fromEntries(
      Object.entries(models).map(([id, model]) => [id, { label: model.label }]),
    ),
    defaultModel,
    defaultInjectionModel,
    scenarios: Object.fromEntries(
      Object.entries(scenarios).map(([id, scenario]) => [
        id,
        { label: scenario.label, message: scenario.message },
      ]),
    ),
  });
}
