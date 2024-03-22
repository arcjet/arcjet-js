declare namespace NodeJS {
  export interface ProcessEnv {
    readonly ARCJET_KEY: string;
    readonly NEXTAUTH_SECRET: string;
    readonly GITHUB_ID: string;
    readonly GITHUB_SECRET: string;
  }
}