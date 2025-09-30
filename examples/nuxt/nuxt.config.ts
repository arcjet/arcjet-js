// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  typescript: { strict: true },
  arcjet: {
    key: process.env.ARCJET_KEY
  },
  modules: [
    "@arcjet/nuxt",
  ]
});
