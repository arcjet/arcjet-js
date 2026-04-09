//#region wasm/interfaces/arcjet-redact-custom-redact.d.ts
declare namespace ArcjetRedactCustomRedact {
  export function detectSensitiveInfo(tokens: Array<string>): Array<SensitiveInfoEntity | undefined>;
  export function redactSensitiveInfo(entityType: SensitiveInfoEntity, plaintext: string): string | undefined;
}
type SensitiveInfoEntity = SensitiveInfoEntityEmail | SensitiveInfoEntityPhoneNumber | SensitiveInfoEntityIpAddress | SensitiveInfoEntityCreditCardNumber | SensitiveInfoEntityCustom;
interface SensitiveInfoEntityEmail {
  tag: 'email';
}
interface SensitiveInfoEntityPhoneNumber {
  tag: 'phone-number';
}
interface SensitiveInfoEntityIpAddress {
  tag: 'ip-address';
}
interface SensitiveInfoEntityCreditCardNumber {
  tag: 'credit-card-number';
}
interface SensitiveInfoEntityCustom {
  tag: 'custom';
  val: string;
}
//#endregion
export { ArcjetRedactCustomRedact, SensitiveInfoEntity };