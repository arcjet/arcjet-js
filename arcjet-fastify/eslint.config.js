import base from "@arcjet/eslint-config";

export default [
  ...base,
  {
    ignores: [".turbo/", "coverage/", "node_modules/", "**/*.d.ts", "**/*.js"],
  },
];
