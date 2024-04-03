declare namespace NodeJS {
    export interface ProcessEnv {
      readonly ARCJET_KEY: string;
      readonly AUTH_SECRET: string;
      readonly AUTH_GITHUB_ID: string;
      readonly AUTH_GITHUB_SECRET: string;
    }
  }