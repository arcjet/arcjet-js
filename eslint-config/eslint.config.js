/**
 * @import {Linter} from "eslint";
 */

import js from "@eslint/js";
import ts from "typescript-eslint";
import turbo from "eslint-config-turbo/flat";
import prettier from "eslint-config-prettier";

/**
 * ESLint configuration for internal Arcjet projects.
 *
 * @type {Array<Linter.Config>}
 */
export default [
  {
    files: ["**/*.ts"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...turbo,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // TODO: Evaluate our usage of `{}` types
      "@typescript-eslint/no-empty-object-type": "off",
      "no-unused-vars": "off",
    },
  },
];
