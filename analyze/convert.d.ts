import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import {
  DetectedSensitiveInfoEntity,
  SensitiveInfoEntity,
} from "@arcjet/protocol";
export declare function ConvertProtocolEntitiesToAnalyzeEntities(
  entity: SensitiveInfoEntity,
): core.SensitiveInfoEntity;
export declare function ConvertDetectedSensitiveInfoEntityToAnalyzeEntity(
  entity?: DetectedSensitiveInfoEntity,
): core.SensitiveInfoEntity | undefined;
export declare function ConvertAnalyzeEntitiesToProtocolEntities(
  entity: core.SensitiveInfoEntity,
): DetectedSensitiveInfoEntity;
