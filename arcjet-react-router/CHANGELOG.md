# Changelog

## [1.1.0-rc](https://github.com/arcjet/arcjet-js/compare/v1.0.0...@arcjet/react-router-v1.1.0-rc) (2026-02-03)


### 📝 Documentation

* update example links in readmes ([#5735](https://github.com/arcjet/arcjet-js/issues/5735)) ([6f10658](https://github.com/arcjet/arcjet-js/commit/6f106589ddcb2bb99b26eb0e3eb1e18046ab7fa5))


### 🧹 Miscellaneous Chores

* fix typo, it’s `ip.src` ([#5754](https://github.com/arcjet/arcjet-js/issues/5754)) ([750c217](https://github.com/arcjet/arcjet-js/commit/750c217b0f23fbc34afba494c0c09e97004822fb))
* **protocol:** client should get full request details ([#5711](https://github.com/arcjet/arcjet-js/issues/5711)) ([88a1259](https://github.com/arcjet/arcjet-js/commit/88a1259b6cd719cf4c19e6338d634e74fbd56d60))
* **react-router:** remove unneeded import ([#5733](https://github.com/arcjet/arcjet-js/issues/5733)) ([5f9d1b6](https://github.com/arcjet/arcjet-js/commit/5f9d1b602fe4b3a2e9f08802b7ba3f0c7c44d001))
* **react-router:** remove unused type ([#5736](https://github.com/arcjet/arcjet-js/issues/5736)) ([4dc9715](https://github.com/arcjet/arcjet-js/commit/4dc97158759192a7710789d2455f857516c8d02c))


### 🔨 Build System

* enable `ignore-scripts` ([#5211](https://github.com/arcjet/arcjet-js/issues/5211)) ([2c14ff3](https://github.com/arcjet/arcjet-js/commit/2c14ff35e62d6db1939d3e1579c7f005af0fae1e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/body bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/env bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/headers bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/ip bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/logger bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/protocol bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/transport bumped from 1.0.0 to 1.1.0-rc
    * arcjet bumped from 1.0.0 to 1.1.0-rc
  * devDependencies
    * @arcjet/cache bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/eslint-config bumped from 1.0.0 to 1.1.0-rc
    * @arcjet/rollup-config bumped from 1.0.0 to 1.1.0-rc

## [1.0.0](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.18...@arcjet/react-router-v1.0.0) (2026-01-22)


### 🧹 Miscellaneous Chores

* **@arcjet/react-router:** Synchronize arcjet-js versions


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
    * @arcjet/cache bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/eslint-config bumped from 1.0.0-beta.18 to 1.0.0
    * @arcjet/rollup-config bumped from 1.0.0-beta.18 to 1.0.0

## [1.0.0-beta.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.17...@arcjet/react-router-v1.0.0-beta.18) (2026-01-22)


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
    * @arcjet/cache bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/eslint-config bumped from 1.0.0-beta.17 to 1.0.0-beta.18
    * @arcjet/rollup-config bumped from 1.0.0-beta.17 to 1.0.0-beta.18

## [1.0.0-beta.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.16...@arcjet/react-router-v1.0.0-beta.17) (2026-01-13)


### ⚠ BREAKING CHANGES

* add support for limits to web streams ([#5589](https://github.com/arcjet/arcjet-js/issues/5589))

### 🚀 New Features

* add support for limits to web streams ([#5589](https://github.com/arcjet/arcjet-js/issues/5589)) ([effef3b](https://github.com/arcjet/arcjet-js/commit/effef3b1f9d243348eadf3d571e308ebaa41f5dd))


### 🪲 Bug Fixes

* **arcjet:** make `getBody` result required, use errors for problems ([#5608](https://github.com/arcjet/arcjet-js/issues/5608)) ([7ed47a9](https://github.com/arcjet/arcjet-js/commit/7ed47a94d34701432447771ac70af137ece221f2))


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
    * @arcjet/cache bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/eslint-config bumped from 1.0.0-beta.16 to 1.0.0-beta.17
    * @arcjet/rollup-config bumped from 1.0.0-beta.16 to 1.0.0-beta.17

## [1.0.0-beta.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.15...@arcjet/react-router-v1.0.0-beta.16) (2026-01-06)


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
    * arcjet bumped from 1.0.0-beta.15 to 1.0.0-beta.16
  * devDependencies
    * @arcjet/cache bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/eslint-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16
    * @arcjet/rollup-config bumped from 1.0.0-beta.15 to 1.0.0-beta.16

## [1.0.0-beta.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.14...@arcjet/react-router-v1.0.0-beta.15) (2025-11-07)


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
    * arcjet bumped from 1.0.0-beta.14 to 1.0.0-beta.15
  * devDependencies
    * @arcjet/cache bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/eslint-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15
    * @arcjet/rollup-config bumped from 1.0.0-beta.14 to 1.0.0-beta.15

## [1.0.0-beta.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.13...@arcjet/react-router-v1.0.0-beta.14) (2025-11-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/headers bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/ip bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/logger bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/protocol bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/transport bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * arcjet bumped from 1.0.0-beta.13 to 1.0.0-beta.14
  * devDependencies
    * @arcjet/cache bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/eslint-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14
    * @arcjet/rollup-config bumped from 1.0.0-beta.13 to 1.0.0-beta.14

## [1.0.0-beta.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.12...@arcjet/react-router-v1.0.0-beta.13) (2025-10-07)


### 🚀 New Features

* add `@arcjet/nuxt` ([#5243](https://github.com/arcjet/arcjet-js/issues/5243)) ([c40b5f0](https://github.com/arcjet/arcjet-js/commit/c40b5f01c73801dda93d75a6a17d1f37ca010c9e))


### 📚 Tests

* **react-router:** fix tests on Node `24.9.0` ([#5227](https://github.com/arcjet/arcjet-js/issues/5227)) ([420413b](https://github.com/arcjet/arcjet-js/commit/420413bf2bb48bec76e9343e31ba006fa2339a9a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/headers bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/ip bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/logger bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/protocol bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/transport bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * arcjet bumped from 1.0.0-beta.12 to 1.0.0-beta.13
  * devDependencies
    * @arcjet/cache bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/eslint-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13
    * @arcjet/rollup-config bumped from 1.0.0-beta.12 to 1.0.0-beta.13

## [1.0.0-beta.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.11...@arcjet/react-router-v1.0.0-beta.12) (2025-09-22)


### 🚀 New Features

* add React Router integration ([#5199](https://github.com/arcjet/arcjet-js/issues/5199)) ([498292e](https://github.com/arcjet/arcjet-js/commit/498292e9a86efd3e1e45b504023e02bcbf227124))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/env bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/headers bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/ip bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/logger bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/protocol bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/transport bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * arcjet bumped from 1.0.0-beta.11 to 1.0.0-beta.12
  * devDependencies
    * @arcjet/cache bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/eslint-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12
    * @arcjet/rollup-config bumped from 1.0.0-beta.11 to 1.0.0-beta.12

## Changelog
