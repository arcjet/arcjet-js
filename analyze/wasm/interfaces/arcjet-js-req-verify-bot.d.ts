export namespace ArcjetJsReqVerifyBot {
  export function verify(botId: string, ip: string): ValidatorResponse;
}
/**
 * # Variants
 * 
 * ## `"verified"`
 * 
 * ## `"spoofed"`
 * 
 * ## `"unverifiable"`
 */
export type ValidatorResponse = 'verified' | 'spoofed' | 'unverifiable';
