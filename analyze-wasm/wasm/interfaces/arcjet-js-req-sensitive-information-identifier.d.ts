export namespace ArcjetJsReqSensitiveInformationIdentifier {
  export function detect(tokens: Array<string>): Array<SensitiveInfoEntity | undefined>;
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
