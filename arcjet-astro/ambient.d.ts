// Ambient declarations for the Astro virtual modules used by this integration.
// Astro generates these types inside a user's project, so a library that
// imports them must declare them itself. The `astro:env/server` import is kept
// external at build time (see tsdown.config.ts).
declare module "astro:env/server" {
  export const ARCJET_BASE_URL: string | undefined;
  export const ARCJET_ENV: string | undefined;
  export const ARCJET_KEY: string | undefined;
  export const ARCJET_LOG_LEVEL: string | undefined;
  export const FIREBASE_CONFIG: string | undefined;
  export const FLY_APP_NAME: string | undefined;
  export const RENDER: string | undefined;
  export const VERCEL: string | undefined;
}

interface ImportMetaEnv {
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
