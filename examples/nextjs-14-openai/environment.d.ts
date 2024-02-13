declare namespace NodeJS {
    export interface ProcessEnv {
        readonly ARCJET_KEY: string;
        readonly OPENAI_API_KEY: string;
    }
}