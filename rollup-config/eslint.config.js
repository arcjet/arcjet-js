import base from "@arcjet/eslint-config";

export default [
  ...base,
  {
    languageOptions: {
      globals: {
        URL: "readonly"
      }
    }
  },
  {
    ignores: [
      ".turbo/",
      "coverage/",
      "node_modules/",
    ]
  }
]
