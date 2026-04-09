import { SensitiveInfoEntity } from "./interfaces/arcjet-redact-custom-redact.js";

//#region wasm/arcjet_analyze_bindings_redact.component.d.ts
interface RedactSensitiveInfoConfig {
  entities?: Array<SensitiveInfoEntity>;
  contextWindowSize?: number;
  skipCustomDetect: boolean;
  skipCustomRedact: boolean;
}
interface RedactedSensitiveInfoEntity {
  original: string;
  redacted: string;
  start: number;
  end: number;
  identifiedType: SensitiveInfoEntity;
}
interface Root {
  redact(content: string, options: RedactSensitiveInfoConfig): Array<RedactedSensitiveInfoEntity>;
}
//#endregion
export { RedactSensitiveInfoConfig, RedactedSensitiveInfoEntity, Root };