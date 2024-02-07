/* tslint:disable */
/* eslint-disable */
/**
* @param {string} headers
* @param {string} patterns_add
* @param {string} patterns_remove
* @returns {any}
*/
export function detect_bot(headers: string, patterns_add: string, patterns_remove: string): any;
/**
* @param {string} ip
* @returns {string}
*/
export function generate_fingerprint(ip: string): string;
/**
* @param {string} candidate
* @param {EmailValidationConfig | undefined} [options]
* @returns {boolean}
*/
export function is_valid_email(candidate: string, options?: EmailValidationConfig): boolean;

interface EmailValidationConfig {
    /**
     * If `true`, requires at least 2 segments in the `domain` part of an email address
     *
     * @default true
     */
    requireTopLevelDomain?: boolean,
    /**
     * If `true`, allows email addresses in the form of `example@[127.0.0.1]`
     *
     * @default false
     */
    allowDomainLiteral?: boolean,
}


export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly detect_bot: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly generate_fingerprint: (a: number, b: number, c: number) => void;
  readonly is_valid_email: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_export_0: (a: number, b: number) => number;
  readonly __wbindgen_export_1: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
