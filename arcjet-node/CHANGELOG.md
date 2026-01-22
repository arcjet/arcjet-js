# Changelog

## [1.0.0-beta.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.17...@arcjet/node-v1.0.0-beta.18) (2026-01-22)


### 🚀 New Features

* **sensitiveInfo:** add `sensitiveInfoValue` field ([#5678](https://github.com/arcjet/arcjet-js/issues/5678)) ([2263df7](https://github.com/arcjet/arcjet-js/commit/2263df74790168b0c5be73e8a6a4012f045c5901))


### 🧹 Miscellaneous Chores

* deprecate automatic body reading ([#5679](https://github.com/arcjet/arcjet-js/issues/5679)) ([5f45291](https://github.com/arcjet/arcjet-js/commit/5f452910ca52906011dfb67d48b79bcc63f8ae15))
* **tests:** make simple server responses more granular ([#5594](https://github.com/arcjet/arcjet-js/issues/5594)) ([5325949](https://github.com/arcjet/arcjet-js/commit/5325949788e7ef00a524ba68e658810e31595568))


### 📚 Tests

* add tests for custom rules with no, optional, required extra fields ([#5669](https://github.com/arcjet/arcjet-js/issues/5669)) ([3444528](https://github.com/arcjet/arcjet-js/commit/3444528c70ef0fa5fba058d97666ec3c2d64d6d7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/headers bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/ip bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/logger bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/protocol bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/transport bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/body bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * arcjet bumped from 1.0.0-beta.17 to 1.0.0-beta.18
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/rollup-config bumped from 1.0.0-beta.17 to 1.0.0-beta.18

## [1.0.0-beta.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.16...@arcjet/node-v1.0.0-beta.17) (2026-01-13)


### ⚠ BREAKING CHANGES

* add support for limits to web streams ([#5589](https://github.com/arcjet/arcjet-js/issues/5589))

### 🚀 New Features

* add support for limits to web streams ([#5589](https://github.com/arcjet/arcjet-js/issues/5589)) ([effef3b](https://github.com/arcjet/arcjet-js/commit/effef3b1f9d243348eadf3d571e308ebaa41f5dd))
* **body:** make `limit` optional ([#5601](https://github.com/arcjet/arcjet-js/issues/5601)) ([b870932](https://github.com/arcjet/arcjet-js/commit/b8709322219b781615ffa3dc13599ac3b7e2e000))


### 🪲 Bug Fixes

* **arcjet:** make `getBody` result required, use errors for problems ([#5608](https://github.com/arcjet/arcjet-js/issues/5608)) ([7ed47a9](https://github.com/arcjet/arcjet-js/commit/7ed47a94d34701432447771ac70af137ece221f2))
* **body:** handle `NaN` in options ([#5599](https://github.com/arcjet/arcjet-js/issues/5599)) ([37e0497](https://github.com/arcjet/arcjet-js/commit/37e04979498310356231ba240959543e8e06e7a3))
* **body:** improve error messages ([#5607](https://github.com/arcjet/arcjet-js/issues/5607)) ([a41c37f](https://github.com/arcjet/arcjet-js/commit/a41c37f3e733e9492d60f594679572ad502f4245))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/headers bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/ip bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/logger bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/protocol bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/transport bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/body bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * arcjet bumped from 1.0.0-beta.16 to 1.0.0-beta.17
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/rollup-config bumped from 1.0.0-beta.16 to 1.0.0-beta.17

## [1.0.0-beta.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.15...@arcjet/node-v1.0.0-beta.16) (2026-01-06)


### 🚀 New Features

* sync lists of env variables ([#5456](https://github.com/arcjet/arcjet-js/issues/5456)) ([dfa9fd2](https://github.com/arcjet/arcjet-js/commit/dfa9fd2e9d1145c4fc90f2c0ad5ab6836a5040e0))


### 📚 Tests

* add some tests for reading the request body ([#5519](https://github.com/arcjet/arcjet-js/issues/5519)) ([b370ceb](https://github.com/arcjet/arcjet-js/commit/b370ceb8d53430ea1e2823d9c4e18e1182ecee58))


### 🔨 Build System

* type check all TypeScript files ([#5582](https://github.com/arcjet/arcjet-js/issues/5582)) ([17769ee](https://github.com/arcjet/arcjet-js/commit/17769eeea65a2319c07d0a2dfdf9011283d2218f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/headers bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/ip bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/logger bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/protocol bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/transport bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/body bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * arcjet bumped from 1.0.0-beta.15 to 1.0.0-beta.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/rollup-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16

## [1.0.0-beta.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.14...@arcjet/node-v1.0.0-beta.15) (2025-11-07)


### 🚀 New Features

* add `x-arcjet-ip` header in development ([#5397](https://github.com/arcjet/arcjet-js/issues/5397)) ([b40da4f](https://github.com/arcjet/arcjet-js/commit/b40da4fd4725db3356abca818712dd7c65b4964f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/headers bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/ip bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/logger bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/protocol bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/transport bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/body bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * arcjet bumped from 1.0.0-beta.14 to 1.0.0-beta.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/rollup-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15

## [1.0.0-beta.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.13...@arcjet/node-v1.0.0-beta.14) (2025-11-04)


### ⚠ BREAKING CHANGES

* drop Node.js 18 ([#5364](https://github.com/arcjet/arcjet-js/issues/5364))

### 🧹 Miscellaneous Chores

* drop Node.js 18 ([#5364](https://github.com/arcjet/arcjet-js/issues/5364)) ([9e4db59](https://github.com/arcjet/arcjet-js/commit/9e4db591b22a4bbe223339fa820644259e65d409))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/headers bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/ip bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/logger bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/protocol bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/transport bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/body bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * arcjet bumped from 1.0.0-beta.13 to 1.0.0-beta.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/rollup-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14

## [1.0.0-beta.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.12...@arcjet/node-v1.0.0-beta.13) (2025-10-07)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/headers bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/ip bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/logger bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/protocol bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/transport bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/body bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * arcjet bumped from 1.0.0-beta.12 to 1.0.0-beta.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/rollup-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.11...@arcjet/node-v1.0.0-beta.12) (2025-09-22)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/headers bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/ip bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/logger bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/protocol bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/transport bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/body bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * arcjet bumped from 1.0.0-beta.11 to 1.0.0-beta.12
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/rollup-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12

## [1.0.0-beta.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.10...@arcjet/node-v1.0.0-beta.11) (2025-09-03)


### 📝 Documentation

* **node:** add JSDocs ([#5039](https://github.com/arcjet/arcjet-js/issues/5039)) ([309738a](https://github.com/arcjet/arcjet-js/commit/309738ac009d3986d27ba34e30dc23604f4e6aba))


### 🧹 Miscellaneous Chores

* **headers:** expose named export, deprecate default ([#4860](https://github.com/arcjet/arcjet-js/issues/4860)) ([8d716b9](https://github.com/arcjet/arcjet-js/commit/8d716b99430470a842f2648092736098abdaab66))
* **tsconfig:** remove `@arcjet/tsconfig` ([#5022](https://github.com/arcjet/arcjet-js/issues/5022)) ([fdca6a9](https://github.com/arcjet/arcjet-js/commit/fdca6a9b052fa6711cc56f81b46b19bd6aa7acbb))


### ⌨️ Code Refactoring

* **ip:** rename identifiers to match other casing ([#4723](https://github.com/arcjet/arcjet-js/issues/4723)) ([4cbd844](https://github.com/arcjet/arcjet-js/commit/4cbd84471216eee6183a686774897bc7ce95f348))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/headers bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/ip bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/logger bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/protocol bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/transport bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/body bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * arcjet bumped from 1.0.0-beta.10 to 1.0.0-beta.11
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11
    * @arcjet/rollup-config bumped from 1.0.0-beta.10 to 1.0.0-beta.11

## [1.0.0-beta.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.9...@arcjet/node-v1.0.0-beta.10) (2025-08-04)


### 📝 Documentation

* add uniform install section to readmes ([#4633](https://github.com/arcjet/arcjet-js/issues/4633)) ([709ff1e](https://github.com/arcjet/arcjet-js/commit/709ff1e2e2c182dcafe1f15a630c026e97f59d76))
* add uniform license section to readmes ([#4634](https://github.com/arcjet/arcjet-js/issues/4634)) ([af1c322](https://github.com/arcjet/arcjet-js/commit/af1c322213daa016adb01ce9a26f96b7c546b107))
* add uniform use section to readmes ([#4655](https://github.com/arcjet/arcjet-js/issues/4655)) ([ac27256](https://github.com/arcjet/arcjet-js/commit/ac272568098e43ed70700625ed605ae76cb63fec))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/headers bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/ip bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/logger bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/protocol bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/transport bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/body bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * arcjet bumped from 1.0.0-beta.9 to 1.0.0-beta.10
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/rollup-config bumped from 1.0.0-beta.9 to 1.0.0-beta.10
    * @arcjet/tsconfig bumped from 1.0.0-beta.9 to 1.0.0-beta.10

## [1.0.0-beta.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.8...@arcjet/node-v1.0.0-beta.9) (2025-07-09)


### 📝 Documentation

* Add relevant links to each package readme ([#4429](https://github.com/arcjet/arcjet-js/issues/4429)) ([2653ab0](https://github.com/arcjet/arcjet-js/commit/2653ab0ea93eee7a1b921e7cf3ab403a825bef3d))


### 🧹 Miscellaneous Chores

* Add `keywords` to `package.json`s ([#4408](https://github.com/arcjet/arcjet-js/issues/4408)) ([4f09478](https://github.com/arcjet/arcjet-js/commit/4f094781c3e2fb80df4186b92185cbc295880b5c))
* remove `expect`, references to `jest` ([#4415](https://github.com/arcjet/arcjet-js/issues/4415)) ([2c44c39](https://github.com/arcjet/arcjet-js/commit/2c44c39dfeccee74321a3425a3e5b2d5fa480c42))


### ⌨️ Code Refactoring

* Clean `files` fields in `package.json`s ([#4441](https://github.com/arcjet/arcjet-js/issues/4441)) ([fd7913b](https://github.com/arcjet/arcjet-js/commit/fd7913bf0c28d05740d94cf50f5939ee2b6f98fa))


### 🔨 Build System

* add separate core, coverage tests ([#4480](https://github.com/arcjet/arcjet-js/issues/4480)) ([61c2c50](https://github.com/arcjet/arcjet-js/commit/61c2c50a94ac9712dfebd1a972e067cc0788c44a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/headers bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/ip bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/logger bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/protocol bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/transport bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/body bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * arcjet bumped from 1.0.0-beta.8 to 1.0.0-beta.9
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/rollup-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/tsconfig bumped from 1.0.0-beta.8 to 1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.7...@arcjet/node-v1.0.0-beta.8) (2025-05-28)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/headers bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/ip bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/logger bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/protocol bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/transport bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/body bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * arcjet bumped from 1.0.0-beta.7 to 1.0.0-beta.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/rollup-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/tsconfig bumped from 1.0.0-beta.7 to 1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.6...@arcjet/node-v1.0.0-beta.7) (2025-05-06)


### 🪲 Bug Fixes

* **arcjet-node:** Ensure `process.env.RENDER` is surfaced ([#3969](https://github.com/arcjet/arcjet-js/issues/3969)) ([18f7383](https://github.com/arcjet/arcjet-js/commit/18f7383f672eee31fbc42bdc2db4b46a60a19e87)), closes [#3899](https://github.com/arcjet/arcjet-js/issues/3899)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/headers bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/ip bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/logger bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/protocol bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/transport bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/body bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * arcjet bumped from 1.0.0-beta.6 to 1.0.0-beta.7
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/rollup-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/tsconfig bumped from 1.0.0-beta.6 to 1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.5...@arcjet/node-v1.0.0-beta.6) (2025-04-17)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/headers bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/ip bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/logger bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/protocol bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/transport bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/body bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * arcjet bumped from 1.0.0-beta.5 to 1.0.0-beta.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/rollup-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/tsconfig bumped from 1.0.0-beta.5 to 1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.4...@arcjet/node-v1.0.0-beta.5) (2025-03-27)


### 🚀 New Features

* Support CIDR strings as proxies ([#3577](https://github.com/arcjet/arcjet-js/issues/3577)) ([2964ca7](https://github.com/arcjet/arcjet-js/commit/2964ca7ce02ee35dca14043fd90ad942b0f1cd73)), closes [#2402](https://github.com/arcjet/arcjet-js/issues/2402)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/headers bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/ip bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/logger bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/protocol bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/transport bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/body bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * arcjet bumped from 1.0.0-beta.4 to 1.0.0-beta.5
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/rollup-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/tsconfig bumped from 1.0.0-beta.4 to 1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.3...@arcjet/node-v1.0.0-beta.4) (2025-03-14)


### ⚠ BREAKING CHANGES

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531))

### deps

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531)) ([84826b5](https://github.com/arcjet/arcjet-js/commit/84826b51f0c7925ede7a889499bed3a188e48e65)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)


### 🪲 Bug Fixes

* **arcjet-node:** Wrap `process.env` access with a getter object ([#3559](https://github.com/arcjet/arcjet-js/issues/3559)) ([134588b](https://github.com/arcjet/arcjet-js/commit/134588bc4e91aaa0086d53044249abd1a1aef1bb))


### 🧹 Miscellaneous Chores

* Only log development mode IP address warning once ([#3527](https://github.com/arcjet/arcjet-js/issues/3527)) ([36e0596](https://github.com/arcjet/arcjet-js/commit/36e0596332341d923dbeb755e2a8c26fd8d28e7c)), closes [#1781](https://github.com/arcjet/arcjet-js/issues/1781)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/headers bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/ip bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/logger bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/protocol bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/transport bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/body bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * arcjet bumped from 1.0.0-beta.3 to 1.0.0-beta.4
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/rollup-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/tsconfig bumped from 1.0.0-beta.3 to 1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...@arcjet/node-v1.0.0-beta.3) (2025-03-05)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/headers bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/ip bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/logger bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/protocol bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/transport bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/body bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * arcjet bumped from 1.0.0-beta.2 to 1.0.0-beta.3
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/rollup-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/tsconfig bumped from 1.0.0-beta.2 to 1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...@arcjet/node-v1.0.0-beta.2) (2025-02-04)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/headers bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/ip bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/logger bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/protocol bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/transport bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/body bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * arcjet bumped from 1.0.0-beta.1 to 1.0.0-beta.2
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/rollup-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/tsconfig bumped from 1.0.0-beta.1 to 1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...@arcjet/node-v1.0.0-beta.1) (2025-01-15)


### 🧹 Miscellaneous Chores

* Switch most test harnesses to node:test ([#2479](https://github.com/arcjet/arcjet-js/issues/2479)) ([8a71bbc](https://github.com/arcjet/arcjet-js/commit/8a71bbc3d1fa6b63586f1bae7fa6f0f8d4fbad66))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/headers bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/ip bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/logger bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/protocol bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/transport bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/body bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * arcjet bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/rollup-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/tsconfig bumped from 1.0.0-alpha.34 to 1.0.0-beta.1

## [1.0.0-alpha.34](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.33...@arcjet/node-v1.0.0-alpha.34) (2024-12-03)


### 🚀 New Features

* Support trusted proxy configuration on each adapter ([#2394](https://github.com/arcjet/arcjet-js/issues/2394)) ([f9587d8](https://github.com/arcjet/arcjet-js/commit/f9587d8ec6bd0327cb34ac19e52aeecbf6b79cf3)), closes [#2346](https://github.com/arcjet/arcjet-js/issues/2346)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/headers bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/ip bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/logger bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/protocol bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/transport bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/body bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * arcjet bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/rollup-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/tsconfig bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34

## [1.0.0-alpha.33](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.32...@arcjet/node-v1.0.0-alpha.33) (2024-11-29)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/headers bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/ip bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/logger bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/protocol bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/transport bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/body bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * arcjet bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/rollup-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/tsconfig bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33

## [1.0.0-alpha.32](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.31...@arcjet/node-v1.0.0-alpha.32) (2024-11-26)


### ⚠ BREAKING CHANGES

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326))

### 🪲 Bug Fixes

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326)) ([f8f6a2d](https://github.com/arcjet/arcjet-js/commit/f8f6a2d998220d9705ecda8f10d3c5e14b47cad6)), closes [#1836](https://github.com/arcjet/arcjet-js/issues/1836)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/headers bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/ip bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/logger bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/protocol bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/transport bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/body bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * arcjet bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/rollup-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/tsconfig bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32

## [1.0.0-alpha.31](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.30...@arcjet/node-v1.0.0-alpha.31) (2024-11-22)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/headers bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/ip bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/logger bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/protocol bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/transport bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/body bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * arcjet bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/rollup-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/tsconfig bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31

## [1.0.0-alpha.30](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.29...@arcjet/node-v1.0.0-alpha.30) (2024-11-20)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/headers bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/ip bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/logger bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/protocol bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/transport bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/body bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * arcjet bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/rollup-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/tsconfig bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30

## [1.0.0-alpha.29](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.28...@arcjet/node-v1.0.0-alpha.29) (2024-11-19)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/headers bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/ip bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/logger bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/protocol bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/transport bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/body bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * arcjet bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/rollup-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/tsconfig bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29

## [1.0.0-alpha.28](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.27...@arcjet/node-v1.0.0-alpha.28) (2024-10-23)


### ⚠ BREAKING CHANGES

* **ip:** Accept Request or IncomingMessage directly ([#2018](https://github.com/arcjet/arcjet-js/issues/2018))

### 🚀 New Features

* **ip:** Accept Request or IncomingMessage directly ([#2018](https://github.com/arcjet/arcjet-js/issues/2018)) ([1704da8](https://github.com/arcjet/arcjet-js/commit/1704da87a6791c824cc5ddf6b10a11d5e0786a39)), closes [#1904](https://github.com/arcjet/arcjet-js/issues/1904)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/headers bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/ip bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/logger bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/protocol bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/transport bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/body bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * arcjet bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/rollup-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/tsconfig bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28

## [1.0.0-alpha.27](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.26...@arcjet/node-v1.0.0-alpha.27) (2024-10-01)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/headers bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/ip bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/logger bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/protocol bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/transport bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/body bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * arcjet bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/rollup-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/tsconfig bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27

## [1.0.0-alpha.26](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.25...@arcjet/node-v1.0.0-alpha.26) (2024-09-16)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/headers bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/ip bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/logger bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/protocol bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/transport bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/body bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * arcjet bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/rollup-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/tsconfig bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26

## [1.0.0-alpha.25](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.24...@arcjet/node-v1.0.0-alpha.25) (2024-09-10)


### 🧹 Miscellaneous Chores

* Update READMEs with latest examples ([#1542](https://github.com/arcjet/arcjet-js/issues/1542)) ([8969486](https://github.com/arcjet/arcjet-js/commit/8969486cc01dac6fc01289672744744913eaab01))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/headers bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/ip bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/logger bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/protocol bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/transport bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/body bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * arcjet bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/rollup-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/tsconfig bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25

## [1.0.0-alpha.24](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.23...@arcjet/node-v1.0.0-alpha.24) (2024-09-05)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/headers bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/ip bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/logger bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/protocol bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/transport bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/body bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * arcjet bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/rollup-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/tsconfig bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24

## [1.0.0-alpha.23](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.22...@arcjet/node-v1.0.0-alpha.23) (2024-09-02)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/headers bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/ip bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/logger bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/protocol bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/transport bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/body bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * arcjet bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/rollup-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/tsconfig bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23

## [1.0.0-alpha.22](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.21...@arcjet/node-v1.0.0-alpha.22) (2024-08-26)


### 🚀 New Features

* add detect sensitive info rule ([#1300](https://github.com/arcjet/arcjet-js/issues/1300)) ([006e344](https://github.com/arcjet/arcjet-js/commit/006e34449a1af0768fe2c265c40161e0ecf90d82))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/headers bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/ip bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/logger bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/protocol bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/transport bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/body bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * arcjet bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/rollup-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/tsconfig bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22

## [1.0.0-alpha.21](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.20...@arcjet/node-v1.0.0-alpha.21) (2024-08-05)


### 🚀 New Features

* Abstract transports into package to leverage conditional exports ([#1221](https://github.com/arcjet/arcjet-js/issues/1221)) ([27776f7](https://github.com/arcjet/arcjet-js/commit/27776f742ef94212ac4164d3feb21b5b5f1681db))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/headers bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/ip bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/logger bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/protocol bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/transport bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * arcjet bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/rollup-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/tsconfig bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21

## [1.0.0-alpha.20](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.19...@arcjet/node-v1.0.0-alpha.20) (2024-07-24)


### 📦 Dependencies

* **dev:** bump @rollup/wasm-node from 4.18.1 to 4.19.0 ([#1160](https://github.com/arcjet/arcjet-js/issues/1160)) ([7062ca0](https://github.com/arcjet/arcjet-js/commit/7062ca00012dd73b2e80f0679609be6e45ec5f5d))
* **dev:** bump typescript from 5.5.3 to 5.5.4 ([#1166](https://github.com/arcjet/arcjet-js/issues/1166)) ([644e3a6](https://github.com/arcjet/arcjet-js/commit/644e3a6e69d092626fdf4f356aaa8e8f974ae46b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/headers bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/ip bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/logger bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/protocol bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * arcjet bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/rollup-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/tsconfig bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...@arcjet/node-v1.0.0-alpha.19) (2024-07-15)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/headers bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/ip bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/logger bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/protocol bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * arcjet bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/rollup-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/tsconfig bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...@arcjet/node-v1.0.0-alpha.18) (2024-07-01)


### 🪲 Bug Fixes

* **env:** Always rely on isDevelopment & remove isProduction helper ([#998](https://github.com/arcjet/arcjet-js/issues/998)) ([43423c6](https://github.com/arcjet/arcjet-js/commit/43423c650cb5b6f2e992af961faad52a4fcdd24f))
* **sdk:** Inform type signature of protect via global characteristics ([#1043](https://github.com/arcjet/arcjet-js/issues/1043)) ([1ae4a89](https://github.com/arcjet/arcjet-js/commit/1ae4a89637c02dffd7801becdf519ce4f911dc6d)), closes [#1042](https://github.com/arcjet/arcjet-js/issues/1042)


### 📦 Dependencies

* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))


### 🧹 Miscellaneous Chores

* Warn when IP is empty, even if we override it in development ([#1000](https://github.com/arcjet/arcjet-js/issues/1000)) ([da14bcb](https://github.com/arcjet/arcjet-js/commit/da14bcb67f3bd5ffff9cc17bdbac4d2217a1bf36)), closes [#987](https://github.com/arcjet/arcjet-js/issues/987) [#216](https://github.com/arcjet/arcjet-js/issues/216)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/headers bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/ip bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/logger bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/protocol bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * arcjet bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/rollup-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/tsconfig bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...@arcjet/node-v1.0.0-alpha.17) (2024-06-17)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/headers bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/ip bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/logger bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/protocol bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * arcjet bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/rollup-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/tsconfig bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...@arcjet/node-v1.0.0-alpha.16) (2024-06-14)


### 🧹 Miscellaneous Chores

* **@arcjet/node:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/headers bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/ip bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/logger bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/protocol bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * arcjet bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...@arcjet/node-v1.0.0-alpha.15) (2024-06-12)


### ⚠ BREAKING CHANGES

* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932))

### 🧹 Miscellaneous Chores

* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932)) ([ea1c2b2](https://github.com/arcjet/arcjet-js/commit/ea1c2b25d146be10056cbc616180abeac75f9a01))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/headers bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/ip bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/logger bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/protocol bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * arcjet bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...@arcjet/node-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897))
* **ip:** Allow platform to be specified when looking up IP ([#896](https://github.com/arcjet/arcjet-js/issues/896))
* Add fallback IP in each adapter ([#895](https://github.com/arcjet/arcjet-js/issues/895))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871))
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824))

### 🚀 New Features

* Add fallback IP in each adapter ([#895](https://github.com/arcjet/arcjet-js/issues/895)) ([0f23cff](https://github.com/arcjet/arcjet-js/commit/0f23cff62214462504a21b84e00b258721e31ead)), closes [#51](https://github.com/arcjet/arcjet-js/issues/51) [#885](https://github.com/arcjet/arcjet-js/issues/885)
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841)) ([96bbe94](https://github.com/arcjet/arcjet-js/commit/96bbe941b2f1613bc870e8f6073db919c1f41a7e))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871)) ([4e9e216](https://github.com/arcjet/arcjet-js/commit/4e9e2169e587ab010ff587a915ae8e1416c9b8f5))
* **ip:** Allow platform to be specified when looking up IP ([#896](https://github.com/arcjet/arcjet-js/issues/896)) ([c9f54bb](https://github.com/arcjet/arcjet-js/commit/c9f54bbe0561b13dbb2dbc6f58087a1b25218504))
* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897)) ([a5bb8ca](https://github.com/arcjet/arcjet-js/commit/a5bb8ca6bad9d831b3f67f12b3ef87048ced25bb))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824)) ([c8364f4](https://github.com/arcjet/arcjet-js/commit/c8364f464b99b5b66749ea776e29c728257a2d74))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))


### 📝 Documentation

* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))
* Remove wording that implies is Shield is added by default ([#796](https://github.com/arcjet/arcjet-js/issues/796)) ([a85d18c](https://github.com/arcjet/arcjet-js/commit/a85d18ca6f6da589cfad58d3167b1c8a4b1edc55))


### 🧹 Miscellaneous Chores

* **docs:** Add live example app to READMEs ([#823](https://github.com/arcjet/arcjet-js/issues/823)) ([8b1c811](https://github.com/arcjet/arcjet-js/commit/8b1c81188b0035cfde810917239ea584e6ce3b3d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/headers bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/ip bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/logger bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * arcjet bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...@arcjet/node-v1.0.0-alpha.13) (2024-05-20)


### 🚀 New Features

* Filter cookie headers when normalizing with ArcjetHeaders ([#773](https://github.com/arcjet/arcjet-js/issues/773)) ([99b3e1f](https://github.com/arcjet/arcjet-js/commit/99b3e1fd1f104824642817e2f22bc78d308e2fb1))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.3 to 4.17.2 ([#708](https://github.com/arcjet/arcjet-js/issues/708)) ([6e548bf](https://github.com/arcjet/arcjet-js/commit/6e548bf30743d06615dc9a0b46b3cbdabd6a89e4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/ip bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * arcjet bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/rollup-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/tsconfig bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13

## [1.0.0-alpha.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.11...@arcjet/node-v1.0.0-alpha.12) (2024-04-18)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.1 to 4.14.3 ([#597](https://github.com/arcjet/arcjet-js/issues/597)) ([598adf0](https://github.com/arcjet/arcjet-js/commit/598adf0b3d61b9e9bce046c7c3e8ddef2802a37c))
* **dev:** Bump typescript from 5.4.4 to 5.4.5 ([#557](https://github.com/arcjet/arcjet-js/issues/557)) ([16af391](https://github.com/arcjet/arcjet-js/commit/16af3914d66f05eb3b0d79a9623d2c5ade52bddd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/ip bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * arcjet bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/rollup-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/tsconfig bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12

## [1.0.0-alpha.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.10...@arcjet/node-v1.0.0-alpha.11) (2024-04-08)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.13.0 to 4.13.2 ([#472](https://github.com/arcjet/arcjet-js/issues/472)) ([0268e51](https://github.com/arcjet/arcjet-js/commit/0268e51eb8967b2379014c1d16c65d1fbca13186))
* **dev:** Bump @rollup/wasm-node from 4.13.2 to 4.14.0 ([#493](https://github.com/arcjet/arcjet-js/issues/493)) ([ac14f3f](https://github.com/arcjet/arcjet-js/commit/ac14f3fb12157f9b2306ce2e703f80c081dcd9bc))
* **dev:** Bump @rollup/wasm-node from 4.14.0 to 4.14.1 ([#519](https://github.com/arcjet/arcjet-js/issues/519)) ([f859c0e](https://github.com/arcjet/arcjet-js/commit/f859c0eb071fcd83c68c8c94b60071217a600b3a))
* **dev:** Bump typescript from 5.4.2 to 5.4.3 ([#412](https://github.com/arcjet/arcjet-js/issues/412)) ([a69b76b](https://github.com/arcjet/arcjet-js/commit/a69b76b011a58bad21dc0763661927003c6b2a2e))
* **dev:** Bump typescript from 5.4.3 to 5.4.4 ([#509](https://github.com/arcjet/arcjet-js/issues/509)) ([8976fb1](https://github.com/arcjet/arcjet-js/commit/8976fb1b49f06b50b2a1d52b8a4619548993c737))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/ip bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * arcjet bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/rollup-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/tsconfig bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11

## [1.0.0-alpha.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.9...@arcjet/node-v1.0.0-alpha.10) (2024-03-13)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.12.0 to 4.12.1 ([#320](https://github.com/arcjet/arcjet-js/issues/320)) ([7f07a8f](https://github.com/arcjet/arcjet-js/commit/7f07a8f78e2f2bf67ab0eba032eeb311704c4eee))
* **dev:** Bump @rollup/wasm-node from 4.12.1 to 4.13.0 ([#359](https://github.com/arcjet/arcjet-js/issues/359)) ([8658316](https://github.com/arcjet/arcjet-js/commit/8658316b252f9224069d5c11b8fc6acb6681c90e))
* **dev:** Bump typescript from 5.3.3 to 5.4.2 ([#321](https://github.com/arcjet/arcjet-js/issues/321)) ([e0c2914](https://github.com/arcjet/arcjet-js/commit/e0c2914ab868d4a3e571c959f4b00284bbbc3050))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/ip bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * arcjet bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/rollup-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/tsconfig bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10

## [1.0.0-alpha.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.8...@arcjet/node-v1.0.0-alpha.9) (2024-03-04)


### 🚀 New Features

* Implement initial nodejs SDK ([#268](https://github.com/arcjet/arcjet-js/issues/268)) ([6273296](https://github.com/arcjet/arcjet-js/commit/627329633c1a4eb764cdb2ef61bcd58ce1cd016b))


### 📝 Documentation

* Add node SDK and move core to utility section ([#290](https://github.com/arcjet/arcjet-js/issues/290)) ([b6683a5](https://github.com/arcjet/arcjet-js/commit/b6683a594edfaed17e675bc26bec51f735769b55))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/ip bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * arcjet bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/rollup-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/tsconfig bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
