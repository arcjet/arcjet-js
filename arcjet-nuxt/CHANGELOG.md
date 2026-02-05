# Changelog

## [1.1.0](https://github.com/arcjet/arcjet-js/compare/v1.0.0...@arcjet/nuxt-v1.1.0) (2026-02-05)


### 📝 Documentation

* update example links in readmes ([#5735](https://github.com/arcjet/arcjet-js/issues/5735)) ([6f10658](https://github.com/arcjet/arcjet-js/commit/6f106589ddcb2bb99b26eb0e3eb1e18046ab7fa5))


### 🧹 Miscellaneous Chores

* fix typo, it’s `ip.src` ([#5754](https://github.com/arcjet/arcjet-js/issues/5754)) ([750c217](https://github.com/arcjet/arcjet-js/commit/750c217b0f23fbc34afba494c0c09e97004822fb))


## [1.0.0](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.18...@arcjet/nuxt-v1.0.0) (2026-01-22)


### 🧹 Miscellaneous Chores

* **@arcjet/nuxt:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/env bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/headers bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/ip bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/logger bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/protocol bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/transport bumped from 1.0.0-beta.18 to 1.0.0
    * arcjet bumped from 1.0.0-beta.18 to 1.0.0
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/rollup-config bumped from 1.0.0-beta.18 to 1.0.0

## [1.0.0-beta.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.17...@arcjet/nuxt-v1.0.0-beta.18) (2026-01-22)


### 🧹 Miscellaneous Chores

* deprecate automatic body reading ([#5679](https://github.com/arcjet/arcjet-js/issues/5679)) ([5f45291](https://github.com/arcjet/arcjet-js/commit/5f452910ca52906011dfb67d48b79bcc63f8ae15))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/env bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/headers bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/ip bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/logger bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/protocol bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/transport bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * arcjet bumped from 1.0.0-beta.17 to 1.0.0-beta.18
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/rollup-config bumped from 1.0.0-beta.17 to 1.0.0-beta.18

## [1.0.0-beta.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.16...@arcjet/nuxt-v1.0.0-beta.17) (2026-01-13)


### ⚠ BREAKING CHANGES

* add support for limits to web streams ([#5589](https://github.com/arcjet/arcjet-js/issues/5589))

### 🚀 New Features

* add support for limits to web streams ([#5589](https://github.com/arcjet/arcjet-js/issues/5589)) ([effef3b](https://github.com/arcjet/arcjet-js/commit/effef3b1f9d243348eadf3d571e308ebaa41f5dd))
* **body:** make `limit` optional ([#5601](https://github.com/arcjet/arcjet-js/issues/5601)) ([b870932](https://github.com/arcjet/arcjet-js/commit/b8709322219b781615ffa3dc13599ac3b7e2e000))


### 🪲 Bug Fixes

* **arcjet:** make `getBody` result required, use errors for problems ([#5608](https://github.com/arcjet/arcjet-js/issues/5608)) ([7ed47a9](https://github.com/arcjet/arcjet-js/commit/7ed47a94d34701432447771ac70af137ece221f2))
* **body:** handle `NaN` in options ([#5599](https://github.com/arcjet/arcjet-js/issues/5599)) ([37e0497](https://github.com/arcjet/arcjet-js/commit/37e04979498310356231ba240959543e8e06e7a3))


### 🔨 Build System

* only test built JavaScript files ([#5581](https://github.com/arcjet/arcjet-js/issues/5581)) ([9770281](https://github.com/arcjet/arcjet-js/commit/97702811de2f5d61c906813f269e59749ec468c9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/env bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/headers bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/ip bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/logger bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/protocol bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/transport bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * arcjet bumped from 1.0.0-beta.16 to 1.0.0-beta.17
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/rollup-config bumped from 1.0.0-beta.16 to 1.0.0-beta.17

## [1.0.0-beta.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.15...@arcjet/nuxt-v1.0.0-beta.16) (2026-01-06)


### 🔨 Build System

* type check all TypeScript files ([#5582](https://github.com/arcjet/arcjet-js/issues/5582)) ([17769ee](https://github.com/arcjet/arcjet-js/commit/17769eeea65a2319c07d0a2dfdf9011283d2218f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/env bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/headers bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/ip bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/logger bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/protocol bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/transport bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * arcjet bumped from 1.0.0-beta.15 to 1.0.0-beta.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/rollup-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16

## [1.0.0-beta.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.14...@arcjet/nuxt-v1.0.0-beta.15) (2025-11-07)


### 🚀 New Features

* add `x-arcjet-ip` header in development ([#5397](https://github.com/arcjet/arcjet-js/issues/5397)) ([b40da4f](https://github.com/arcjet/arcjet-js/commit/b40da4fd4725db3356abca818712dd7c65b4964f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/env bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/headers bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/ip bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/logger bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/protocol bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/transport bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * arcjet bumped from 1.0.0-beta.14 to 1.0.0-beta.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/rollup-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15

## [1.0.0-beta.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.13...@arcjet/nuxt-v1.0.0-beta.14) (2025-11-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/env bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/headers bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/ip bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/logger bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/protocol bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/transport bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * arcjet bumped from 1.0.0-beta.13 to 1.0.0-beta.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/rollup-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14

## [1.0.0-beta.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.12...@arcjet/nuxt-v1.0.0-beta.13) (2025-10-07)


### 🚀 New Features

* add `@arcjet/nuxt` ([#5243](https://github.com/arcjet/arcjet-js/issues/5243)) ([c40b5f0](https://github.com/arcjet/arcjet-js/commit/c40b5f01c73801dda93d75a6a17d1f37ca010c9e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/env bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/headers bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/ip bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/logger bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/protocol bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/transport bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * arcjet bumped from 1.0.0-beta.12 to 1.0.0-beta.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/rollup-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13
