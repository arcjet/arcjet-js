import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import {
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
} from "@arcjet/protocol";

export function ConvertProtocolEntitiesToAnalyzeEntities(
  entity: SensitiveInfoEntity,
): core.SensitiveInfoEntity {
  if (entity === "email") {
    return { tag: "email" };
  }

  if (entity === "phone-number") {
    return { tag: "phone-number" };
  }

  if (entity === "ip-address") {
    return { tag: "ip-address" };
  }

  if (entity === "credit-card-number") {
    return { tag: "credit-card-number" };
  }

  return {
    tag: "custom",
    val: "custom",
  };
}

export function ConvertDetectedSensitiveInfoEntityToAnalyzeEntity(
  entity?: DetectedSensitiveInfoEntity,
): core.SensitiveInfoEntity | undefined {
  if (entity === "email") {
    return { tag: "email" };
  }

  if (entity === "phone-number") {
    return { tag: "phone-number" };
  }

  if (entity === "credit-card-number") {
    return { tag: "credit-card-number" };
  }

  if (entity === "ip-address") {
    return { tag: "ip-address" };
  }

  if (entity === "custom") {
    return { tag: "custom", val: "custom" };
  }
}

export function ConvertAnalyzeEntitiesToProtocolEntities(
  entity: core.SensitiveInfoEntity,
): DetectedSensitiveInfoEntity {
  if (entity.tag === "email") {
    return "email";
  }

  if (entity.tag === "ip-address") {
    return "ip-address";
  }

  if (entity.tag === "credit-card-number") {
    return "credit-card-number";
  }

  if (entity.tag === "phone-number") {
    return "phone-number";
  }

  return "custom";
}
