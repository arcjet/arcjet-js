/**
 * @import {Linter} from "eslint"
 */

import base from "@arcjet/eslint-config";

/**
 * ESLint configuration for this project.
 *
 * @type {Array<Linter.Config>}
 */
export default [
  ...base,
  { ignores: ["test/*/.react-router/", "test/**/*.js", "index.js"] },
];
