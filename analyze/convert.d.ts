import * as core from "./wasm/arcjet_analyze_js_req.component.js";
import { SensitiveInfoEntity } from "@arcjet/protocol";
export declare function ConvertProtocolEntitiesToAnalyzeEntities(
  entity: SensitiveInfoEntity<any>,
): core.SensitiveInfoEntity;
export declare function ConvertAnalyzeEntitiesToProtocolEntities(
  entity: core.SensitiveInfoEntity,
): SensitiveInfoEntity<any>;
