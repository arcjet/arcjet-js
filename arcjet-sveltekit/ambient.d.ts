// Ambient declaration for the SvelteKit virtual module used by this
// integration. SvelteKit generates these types inside a user's project, so a
// library that imports the module must declare it itself. The import is kept
// external at build time (see tsdown.config.ts).
declare module "$env/dynamic/private" {
  export const env: Record<string, string | undefined>;
}
