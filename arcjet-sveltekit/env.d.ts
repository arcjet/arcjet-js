declare module "$env/dynamic/private" {
  export const env: {
    NODE_ENV?: string;
    ARCJET_ENV?: string;
    FLY_APP_NAME?: string;
  };
}
