declare module "astro:env/server" {
  const ARCJET_BASE_URL: string | undefined;
  const ARCJET_ENV: string | undefined;
  const ARCJET_KEY: string | undefined;
  const ARCJET_LOG_LEVEL: string | undefined;
  const FLY_APP_NAME: string | undefined;
  const VERCEL: string | undefined;
}

interface ImportMetaEnv {
  readonly MODE: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
