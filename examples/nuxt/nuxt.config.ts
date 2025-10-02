// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  arcjet: {
    key: process.env.ARCJET_KEY
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: [
    "@arcjet/nuxt",
  ],
  typescript: {
    strict: true,
  },
});
