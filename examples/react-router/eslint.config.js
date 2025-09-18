/**
 * @import {Linter} from "eslint"
 */

import base from "@arcjet/eslint-config";

/**
 * ESLint configuration for this project.
 *
 * @type {Array<Linter.Config>}
 */
export default [...base, { ignores: [ ".react-router/", "build/" ] }];
