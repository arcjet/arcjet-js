export namespace ArcjetRedactCustomRedact {
  export function detectSensitiveInfo(tokens: Array<string>): Array<SensitiveInfoEntity | undefined>;
  export function redactSensitiveInfo(entityType: SensitiveInfoEntity, plaintext: string): string | undefined;
}
export type SensitiveInfoEntity = SensitiveInfoEntityEmail | SensitiveInfoEntityPhoneNumber | SensitiveInfoEntityIpAddress | SensitiveInfoEntityCreditCardNumber | SensitiveInfoEntityCustom;
export interface SensitiveInfoEntityEmail {
  tag: 'email',
}
export interface SensitiveInfoEntityPhoneNumber {
  tag: 'phone-number',
}
export interface SensitiveInfoEntityIpAddress {
  tag: 'ip-address',
}
export interface SensitiveInfoEntityCreditCardNumber {
  tag: 'credit-card-number',
}
export interface SensitiveInfoEntityCustom {
  tag: 'custom',
  val: string,
}
