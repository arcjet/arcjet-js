import base from "@arcjet/eslint-config";

export default [
  ...base,
  {
    ignores: [
      ".turbo/",
      "coverage/",
      "models/",
      "node_modules/",
      "**/*.d.ts",
      "**/*.js",
      "!*.config.js",
    ],
  },
];
