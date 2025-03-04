module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:turbo/recommended",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    // TODO: Evaluate our usage of `{}` types
    "@typescript-eslint/no-empty-object-type": "off",
    "no-unused-vars": "off",
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "2022",
    sourceType: "module",
  },
};
