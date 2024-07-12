export namespace ArcjetJsReqEmailValidatorOverrides {
  export function isFreeEmail(domain: string): ValidatorResponse;
  export function isDisposableEmail(domain: string): ValidatorResponse;
  export function hasMxRecords(domain: string): ValidatorResponse;
  export function hasGravatar(email: string): ValidatorResponse;
}
/**
 * # Variants
 * 
 * ## `"yes"`
 * 
 * ## `"no"`
 * 
 * ## `"unknown"`
 */
export type ValidatorResponse = 'yes' | 'no' | 'unknown';
