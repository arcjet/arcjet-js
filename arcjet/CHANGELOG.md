# Changelog

## [1.0.0-beta.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.8...arcjet-v1.0.0-beta.9) (2025-07-09)


### 📝 Documentation

* Add relevant links to each package readme ([#4429](https://github.com/arcjet/arcjet-js/issues/4429)) ([2653ab0](https://github.com/arcjet/arcjet-js/commit/2653ab0ea93eee7a1b921e7cf3ab403a825bef3d))


### 🧹 Miscellaneous Chores

* Add `keywords` to `package.json`s ([#4408](https://github.com/arcjet/arcjet-js/issues/4408)) ([4f09478](https://github.com/arcjet/arcjet-js/commit/4f094781c3e2fb80df4186b92185cbc295880b5c))
* **arcjet:** Reduce timeouts and other transport issues to info log ([#4411](https://github.com/arcjet/arcjet-js/issues/4411)) ([c148bab](https://github.com/arcjet/arcjet-js/commit/c148babca42be753629641c51a8e8a0bac5730c0))
* remove `expect`, references to `jest` ([#4415](https://github.com/arcjet/arcjet-js/issues/4415)) ([2c44c39](https://github.com/arcjet/arcjet-js/commit/2c44c39dfeccee74321a3425a3e5b2d5fa480c42))


### ⌨️ Code Refactoring

* Clean `files` fields in `package.json`s ([#4441](https://github.com/arcjet/arcjet-js/issues/4441)) ([fd7913b](https://github.com/arcjet/arcjet-js/commit/fd7913bf0c28d05740d94cf50f5939ee2b6f98fa))


### 📚 Tests

* clean protocol tests ([#4479](https://github.com/arcjet/arcjet-js/issues/4479)) ([c67d517](https://github.com/arcjet/arcjet-js/commit/c67d5179a5be2d64fea5e0f046da043f2c6f5b60))


### 🔨 Build System

* add separate core, coverage tests ([#4480](https://github.com/arcjet/arcjet-js/issues/4480)) ([61c2c50](https://github.com/arcjet/arcjet-js/commit/61c2c50a94ac9712dfebd1a972e067cc0788c44a))


### ✅ Continuous Integration

* Add Node.js 22, 24 ([#4414](https://github.com/arcjet/arcjet-js/issues/4414)) ([0fa6743](https://github.com/arcjet/arcjet-js/commit/0fa6743f10402bc082c50a716273165db5a9da22))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/cache bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/duration bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/headers bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/protocol bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/runtime bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/stable-hash bumped from 1.0.0-beta.8 to 1.0.0-beta.9
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/rollup-config bumped from 1.0.0-beta.8 to 1.0.0-beta.9
    * @arcjet/tsconfig bumped from 1.0.0-beta.8 to 1.0.0-beta.9

## [1.0.0-beta.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.7...arcjet-v1.0.0-beta.8) (2025-05-28)


### ⚠ BREAKING CHANGES

* **arcjet:** Require every rule to have a validate & protect function ([#4204](https://github.com/arcjet/arcjet-js/issues/4204))

### 🚀 New Features

* **arcjet:** Require every rule to have a validate & protect function ([#4204](https://github.com/arcjet/arcjet-js/issues/4204)) ([c5ee233](https://github.com/arcjet/arcjet-js/commit/c5ee233c69e45866c52f1f7c9876ac5cb81ab246))
* **arcjet:** Segment cache entries by rule ([#4191](https://github.com/arcjet/arcjet-js/issues/4191)) ([2f3c8a8](https://github.com/arcjet/arcjet-js/commit/2f3c8a81bed27608638a8e4a0bfacf3e151b5e8c)), closes [#213](https://github.com/arcjet/arcjet-js/issues/213)
* **protocol:** Add fingerprints to rule results ([#4190](https://github.com/arcjet/arcjet-js/issues/4190)) ([143bf2a](https://github.com/arcjet/arcjet-js/commit/143bf2a4575f47391d4fcb31e4d9d9da76cb5a2d))


### 🪲 Bug Fixes

* **arcjet:** Default to client characteristics if not specified on rule ([#4209](https://github.com/arcjet/arcjet-js/issues/4209)) ([e4794da](https://github.com/arcjet/arcjet-js/commit/e4794da626a9491dba9ee8beae9795ced6f6796b)), closes [#4203](https://github.com/arcjet/arcjet-js/issues/4203)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/cache bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/duration bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/headers bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/protocol bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/runtime bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/stable-hash bumped from 1.0.0-beta.7 to 1.0.0-beta.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/rollup-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/tsconfig bumped from 1.0.0-beta.7 to 1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.6...arcjet-v1.0.0-beta.7) (2025-05-06)


### 🚀 New Features

* **protocol:** Support identifier and version on rules ([#4027](https://github.com/arcjet/arcjet-js/issues/4027)) ([37cd996](https://github.com/arcjet/arcjet-js/commit/37cd996339f167a965e043a35a98a8a35f09ab52))


### 🪲 Bug Fixes

* **protocol:** Ensure sensitiveInfo rule sends mode ([#4026](https://github.com/arcjet/arcjet-js/issues/4026)) ([3ce22ed](https://github.com/arcjet/arcjet-js/commit/3ce22ed69cffc1e6488fe09aeab49a9adfcaeecd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/duration bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/headers bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/protocol bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/runtime bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/stable-hash bumped from 1.0.0-beta.6 to 1.0.0-beta.7
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/rollup-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/tsconfig bumped from 1.0.0-beta.6 to 1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.5...arcjet-v1.0.0-beta.6) (2025-04-17)


### 🪲 Bug Fixes

* Ensure local rules return DRY_RUN state in dry run mode ([#3820](https://github.com/arcjet/arcjet-js/issues/3820)) ([ab9e3e5](https://github.com/arcjet/arcjet-js/commit/ab9e3e5bf5be7dc65b98b9624643ebd332e8340d)), closes [#3818](https://github.com/arcjet/arcjet-js/issues/3818)
* Only call decide endpoint when a local rule is in dry run mode ([#3822](https://github.com/arcjet/arcjet-js/issues/3822)) ([0530c73](https://github.com/arcjet/arcjet-js/commit/0530c738c112e0a752a662106f2bb1a080e5a70d)), closes [#3821](https://github.com/arcjet/arcjet-js/issues/3821)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/duration bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/headers bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/protocol bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/runtime bumped from 1.0.0-beta.5 to 1.0.0-beta.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/rollup-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/tsconfig bumped from 1.0.0-beta.5 to 1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.4...arcjet-v1.0.0-beta.5) (2025-03-27)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/duration bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/headers bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/protocol bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/runtime bumped from 1.0.0-beta.4 to 1.0.0-beta.5
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/rollup-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/tsconfig bumped from 1.0.0-beta.4 to 1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.3...arcjet-v1.0.0-beta.4) (2025-03-14)


### ⚠ BREAKING CHANGES

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531))

### deps

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531)) ([84826b5](https://github.com/arcjet/arcjet-js/commit/84826b51f0c7925ede7a889499bed3a188e48e65)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/duration bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/headers bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/protocol bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/runtime bumped from 1.0.0-beta.3 to 1.0.0-beta.4
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/rollup-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/tsconfig bumped from 1.0.0-beta.3 to 1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...arcjet-v1.0.0-beta.3) (2025-03-05)


### 🧹 Miscellaneous Chores

* Change doc comments key examples ([#3465](https://github.com/arcjet/arcjet-js/issues/3465)) ([6389563](https://github.com/arcjet/arcjet-js/commit/63895638668877b7a612ef16495a1ccf14475e26))
* Improved doc comments ([#3377](https://github.com/arcjet/arcjet-js/issues/3377)) ([dfb8445](https://github.com/arcjet/arcjet-js/commit/dfb8445c02a8c96bcc05c734f71c6d51d76a6689))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/duration bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/headers bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/protocol bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/runtime bumped from 1.0.0-beta.2 to 1.0.0-beta.3
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/rollup-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/tsconfig bumped from 1.0.0-beta.2 to 1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...arcjet-v1.0.0-beta.2) (2025-02-04)


### 🪲 Bug Fixes

* **arcjet:** Ensure Characteristics are readonly type on protect signup options ([#3013](https://github.com/arcjet/arcjet-js/issues/3013)) ([1f16a99](https://github.com/arcjet/arcjet-js/commit/1f16a997cbbc574bbed31c70f234e2598d348bf9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/duration bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/headers bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/protocol bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/runtime bumped from 1.0.0-beta.1 to 1.0.0-beta.2
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/rollup-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/tsconfig bumped from 1.0.0-beta.1 to 1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...arcjet-v1.0.0-beta.1) (2025-01-15)


### ⚠ BREAKING CHANGES

* **protocol:** Improve deprecation message on enum-like field usage ([#2855](https://github.com/arcjet/arcjet-js/issues/2855))

### 🚀 New Features

* Export more option types ([#2752](https://github.com/arcjet/arcjet-js/issues/2752)) ([89a9f77](https://github.com/arcjet/arcjet-js/commit/89a9f77a74031e0e22c0c77c5426b377daa5c8be)), closes [#2751](https://github.com/arcjet/arcjet-js/issues/2751)
* support `allow` or `deny` config in validateEmail & deprecate `block` config ([#2661](https://github.com/arcjet/arcjet-js/issues/2661)) ([890afcd](https://github.com/arcjet/arcjet-js/commit/890afcd2d1afef262b741a74521b82cb85711860)), closes [#1834](https://github.com/arcjet/arcjet-js/issues/1834)


### 🪲 Bug Fixes

* **protocol:** Improve deprecation message on enum-like field usage ([#2855](https://github.com/arcjet/arcjet-js/issues/2855)) ([6512258](https://github.com/arcjet/arcjet-js/commit/6512258546076d6ac3478b02337741c2c0dbf67f))


### 🧹 Miscellaneous Chores

* Switch most test harnesses to node:test ([#2479](https://github.com/arcjet/arcjet-js/issues/2479)) ([8a71bbc](https://github.com/arcjet/arcjet-js/commit/8a71bbc3d1fa6b63586f1bae7fa6f0f8d4fbad66))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/duration bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/headers bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/protocol bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/runtime bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/rollup-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/tsconfig bumped from 1.0.0-alpha.34 to 1.0.0-beta.1

## [1.0.0-alpha.34](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.33...arcjet-v1.0.0-alpha.34) (2024-12-03)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/duration bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/headers bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/protocol bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/runtime bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/rollup-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/tsconfig bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34

## [1.0.0-alpha.33](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.32...arcjet-v1.0.0-alpha.33) (2024-11-29)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/duration bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/headers bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/protocol bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/runtime bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/rollup-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/tsconfig bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33

## [1.0.0-alpha.32](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.31...arcjet-v1.0.0-alpha.32) (2024-11-26)


### ⚠ BREAKING CHANGES

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326))

### 🚀 New Features

* check verification status ([#2229](https://github.com/arcjet/arcjet-js/issues/2229)) ([3329fd7](https://github.com/arcjet/arcjet-js/commit/3329fd7baaafa6784d6f6573905c95fd0686ea4e))


### 🪲 Bug Fixes

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326)) ([f8f6a2d](https://github.com/arcjet/arcjet-js/commit/f8f6a2d998220d9705ecda8f10d3c5e14b47cad6)), closes [#1836](https://github.com/arcjet/arcjet-js/issues/1836)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/duration bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/headers bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/protocol bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/runtime bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/rollup-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/tsconfig bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32

## [1.0.0-alpha.31](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.30...arcjet-v1.0.0-alpha.31) (2024-11-22)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/duration bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/headers bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/protocol bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/runtime bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/rollup-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/tsconfig bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31

## [1.0.0-alpha.30](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.29...arcjet-v1.0.0-alpha.30) (2024-11-20)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/duration bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/headers bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/protocol bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/runtime bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/rollup-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/tsconfig bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30

## [1.0.0-alpha.29](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.28...arcjet-v1.0.0-alpha.29) (2024-11-19)


### 🪲 Bug Fixes

* **arcjet:** Log error message when fingerprint cannot be built ([#2139](https://github.com/arcjet/arcjet-js/issues/2139)) ([56e5319](https://github.com/arcjet/arcjet-js/commit/56e5319e096f282a99cb008f3086f083dc782992))
* Guard against incorrectly written local rules ([#2191](https://github.com/arcjet/arcjet-js/issues/2191)) ([0885ccf](https://github.com/arcjet/arcjet-js/commit/0885ccfc6d9dedf0d16b7add66ea4be0a43e5432))


### 🧹 Miscellaneous Chores

* **arcjet:** Increase test coverage to 100% ([#2157](https://github.com/arcjet/arcjet-js/issues/2157)) ([17f8a9a](https://github.com/arcjet/arcjet-js/commit/17f8a9a43d3a3470d08f17b2529e4d380f2e7ae2)), closes [#1802](https://github.com/arcjet/arcjet-js/issues/1802)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/duration bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/headers bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/protocol bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/runtime bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/rollup-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/tsconfig bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29

## [1.0.0-alpha.28](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.27...arcjet-v1.0.0-alpha.28) (2024-10-23)


### ⚠ BREAKING CHANGES

* Ensure performance metrics are scoped to same call ([#2019](https://github.com/arcjet/arcjet-js/issues/2019))
* Return ERROR decision when fingerprint cannot be generated ([#1990](https://github.com/arcjet/arcjet-js/issues/1990))
* Remove `match` option from rate limit rules ([#1815](https://github.com/arcjet/arcjet-js/issues/1815))

### 🚀 New Features

* Use `waitUntil` for Report call if available ([#1838](https://github.com/arcjet/arcjet-js/issues/1838)) ([2851021](https://github.com/arcjet/arcjet-js/commit/28510216334e2b66fc19a7ee51e741fb59a20607)), closes [#884](https://github.com/arcjet/arcjet-js/issues/884)


### 🪲 Bug Fixes

* **arcjet:** Ensure performance measurements are 1-to-1 and always captured ([#1858](https://github.com/arcjet/arcjet-js/issues/1858)) ([4d29f9a](https://github.com/arcjet/arcjet-js/commit/4d29f9adee96296ca0a4fc7cd3192f68ebc6ad0a))
* Ensure performance metrics are scoped to same call ([#2019](https://github.com/arcjet/arcjet-js/issues/2019)) ([e9f869c](https://github.com/arcjet/arcjet-js/commit/e9f869ca0c287c9dfb23fa3ebe91007822b3390e)), closes [#1865](https://github.com/arcjet/arcjet-js/issues/1865)
* Return ERROR decision when fingerprint cannot be generated ([#1990](https://github.com/arcjet/arcjet-js/issues/1990)) ([618a1ee](https://github.com/arcjet/arcjet-js/commit/618a1eef0bd70c827ce1c4911d991bfb55b0deb2)), closes [#1801](https://github.com/arcjet/arcjet-js/issues/1801)


### 🧹 Miscellaneous Chores

* Remove `match` option from rate limit rules ([#1815](https://github.com/arcjet/arcjet-js/issues/1815)) ([853119d](https://github.com/arcjet/arcjet-js/commit/853119d24c37330690c937149a0cf1d0c4d31862)), closes [#1810](https://github.com/arcjet/arcjet-js/issues/1810)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/duration bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/headers bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/protocol bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/runtime bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/rollup-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/tsconfig bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28

## [1.0.0-alpha.27](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.26...arcjet-v1.0.0-alpha.27) (2024-10-01)


### ⚠ BREAKING CHANGES

* Add options validation for all rules ([#1785](https://github.com/arcjet/arcjet-js/issues/1785))
* Only produce 1 rule per constructor ([#1783](https://github.com/arcjet/arcjet-js/issues/1783))

### 🧹 Miscellaneous Chores

* Add options validation for all rules ([#1785](https://github.com/arcjet/arcjet-js/issues/1785)) ([c3a248e](https://github.com/arcjet/arcjet-js/commit/c3a248ee953a54d5b818942135bebff22a84b307)), closes [#992](https://github.com/arcjet/arcjet-js/issues/992)
* Only produce 1 rule per constructor ([#1783](https://github.com/arcjet/arcjet-js/issues/1783)) ([8d79e63](https://github.com/arcjet/arcjet-js/commit/8d79e639be69095c97fb383490817a7eb326458c)), closes [#1397](https://github.com/arcjet/arcjet-js/issues/1397)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/duration bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/headers bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/protocol bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/runtime bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/rollup-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/tsconfig bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27

## [1.0.0-alpha.26](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.25...arcjet-v1.0.0-alpha.26) (2024-09-16)


### 🚀 New Features

* Implement bot detection categories ([#1618](https://github.com/arcjet/arcjet-js/issues/1618)) ([540cfe8](https://github.com/arcjet/arcjet-js/commit/540cfe8d74b9f029248cfeb6f27e4c7b47fbb9b7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/duration bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/headers bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/protocol bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/runtime bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/rollup-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/tsconfig bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26

## [1.0.0-alpha.25](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.24...arcjet-v1.0.0-alpha.25) (2024-09-10)


### 🧹 Miscellaneous Chores

* Update READMEs with latest examples ([#1542](https://github.com/arcjet/arcjet-js/issues/1542)) ([8969486](https://github.com/arcjet/arcjet-js/commit/8969486cc01dac6fc01289672744744913eaab01))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/duration bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/headers bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/protocol bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/runtime bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/rollup-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/tsconfig bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25

## [1.0.0-alpha.24](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.23...arcjet-v1.0.0-alpha.24) (2024-09-05)


### ⚠ BREAKING CHANGES

* Rework bot detection rule with allow/deny configuration ([#1437](https://github.com/arcjet/arcjet-js/issues/1437))

### 🚀 New Features

* Rework bot detection rule with allow/deny configuration ([#1437](https://github.com/arcjet/arcjet-js/issues/1437)) ([eef18e3](https://github.com/arcjet/arcjet-js/commit/eef18e3a7c52a849fbc1766439dc28bf0cb2da27))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/duration bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/headers bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/protocol bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/runtime bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/rollup-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/tsconfig bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24

## [1.0.0-alpha.23](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.22...arcjet-v1.0.0-alpha.23) (2024-09-02)


### 🪲 Bug Fixes

* **analyze:** Ensure headers are serialized correctly ([#1435](https://github.com/arcjet/arcjet-js/issues/1435)) ([0319412](https://github.com/arcjet/arcjet-js/commit/0319412a56e6227f71ab981e23ccdd460a3515cd))
* **arcjet:** Infer types when no detect function is specified ([#1446](https://github.com/arcjet/arcjet-js/issues/1446)) ([8ae0370](https://github.com/arcjet/arcjet-js/commit/8ae03707f6e168c3451542d9ea78f816f0e1fc6a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/duration bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/headers bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/protocol bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/runtime bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/rollup-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/tsconfig bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23

## [1.0.0-alpha.22](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.21...arcjet-v1.0.0-alpha.22) (2024-08-26)


### ⚠ BREAKING CHANGES

* **tsconfig:** Enable verbatim module syntax ([#1324](https://github.com/arcjet/arcjet-js/issues/1324))

### 🚀 New Features

* add detect sensitive info rule ([#1300](https://github.com/arcjet/arcjet-js/issues/1300)) ([006e344](https://github.com/arcjet/arcjet-js/commit/006e34449a1af0768fe2c265c40161e0ecf90d82))


### 🧹 Miscellaneous Chores

* **tsconfig:** Enable verbatim module syntax ([#1324](https://github.com/arcjet/arcjet-js/issues/1324)) ([7012b54](https://github.com/arcjet/arcjet-js/commit/7012b5473431a84c6025e361a89eca027ebfc93f)), closes [#1314](https://github.com/arcjet/arcjet-js/issues/1314)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/duration bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/headers bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/protocol bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/runtime bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/rollup-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/tsconfig bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22

## [1.0.0-alpha.21](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.20...arcjet-v1.0.0-alpha.21) (2024-08-05)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/duration bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/headers bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/protocol bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/runtime bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/rollup-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/tsconfig bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21

## [1.0.0-alpha.20](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.19...arcjet-v1.0.0-alpha.20) (2024-07-24)


### 📦 Dependencies

* **dev:** bump @rollup/wasm-node from 4.18.1 to 4.19.0 ([#1160](https://github.com/arcjet/arcjet-js/issues/1160)) ([7062ca0](https://github.com/arcjet/arcjet-js/commit/7062ca00012dd73b2e80f0679609be6e45ec5f5d))
* **dev:** bump typescript from 5.5.3 to 5.5.4 ([#1166](https://github.com/arcjet/arcjet-js/issues/1166)) ([644e3a6](https://github.com/arcjet/arcjet-js/commit/644e3a6e69d092626fdf4f356aaa8e8f974ae46b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/duration bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/headers bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/protocol bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/runtime bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/rollup-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/tsconfig bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...arcjet-v1.0.0-alpha.19) (2024-07-15)


### 🚀 New Features

* detect common free/disposable email providers locally ([#1096](https://github.com/arcjet/arcjet-js/issues/1096)) ([115d016](https://github.com/arcjet/arcjet-js/commit/115d01662d4ff456cf4d81825338ef1099626fdf)), closes [#1095](https://github.com/arcjet/arcjet-js/issues/1095)


### 📦 Dependencies

* **dev:** Bump @edge-runtime/jest-environment from 2.3.10 to 3.0.0 ([#1087](https://github.com/arcjet/arcjet-js/issues/1087)) ([1e6eb00](https://github.com/arcjet/arcjet-js/commit/1e6eb004ecb052f82d1a72772c0a1c99a8002965))
* **dev:** bump @edge-runtime/jest-environment from 3.0.0 to 3.0.1 ([#1123](https://github.com/arcjet/arcjet-js/issues/1123)) ([9064240](https://github.com/arcjet/arcjet-js/commit/90642400a22a13ca21bbe28380bc2beaad06c235))
* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/duration bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/headers bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/protocol bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/runtime bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/rollup-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/tsconfig bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...arcjet-v1.0.0-alpha.18) (2024-07-01)


### 🚀 New Features

* Allow characteristics to be specified on the SDK for fingerprint generation & propagate to rate limit rule ([#1016](https://github.com/arcjet/arcjet-js/issues/1016)) ([6b692da](https://github.com/arcjet/arcjet-js/commit/6b692da8e6da506a977ec5617a223b6512035a19)), closes [#1015](https://github.com/arcjet/arcjet-js/issues/1015)


### 🪲 Bug Fixes

* **sdk:** Inform type signature of protect via global characteristics ([#1043](https://github.com/arcjet/arcjet-js/issues/1043)) ([1ae4a89](https://github.com/arcjet/arcjet-js/commit/1ae4a89637c02dffd7801becdf519ce4f911dc6d)), closes [#1042](https://github.com/arcjet/arcjet-js/issues/1042)


### 📦 Dependencies

* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/duration bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/headers bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/protocol bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/runtime bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/rollup-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/tsconfig bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...arcjet-v1.0.0-alpha.17) (2024-06-17)


### 🧹 Miscellaneous Chores

* **arcjet:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/duration bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/headers bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/protocol bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/runtime bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/rollup-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/tsconfig bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...arcjet-v1.0.0-alpha.16) (2024-06-14)


### 🪲 Bug Fixes

* Ensure withRule always contains previous rules in the same chain ([#981](https://github.com/arcjet/arcjet-js/issues/981)) ([2ee6581](https://github.com/arcjet/arcjet-js/commit/2ee658188c8b423988c8e549f219c545103412d0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/duration bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/headers bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/protocol bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/runtime bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...arcjet-v1.0.0-alpha.15) (2024-06-12)


### ⚠ BREAKING CHANGES

* Remove rateLimit alias for fixedWindow rule ([#964](https://github.com/arcjet/arcjet-js/issues/964))
* Remove logger dependency from core ([#929](https://github.com/arcjet/arcjet-js/issues/929))
* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932))
* Freeze the ArcjetContext before using it ([#934](https://github.com/arcjet/arcjet-js/issues/934))

### 🧹 Miscellaneous Chores

* Freeze the ArcjetContext before using it ([#934](https://github.com/arcjet/arcjet-js/issues/934)) ([6720504](https://github.com/arcjet/arcjet-js/commit/672050415e4c73027be44238abbd9c7312519978))
* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932)) ([ea1c2b2](https://github.com/arcjet/arcjet-js/commit/ea1c2b25d146be10056cbc616180abeac75f9a01))
* Remove logger dependency from core ([#929](https://github.com/arcjet/arcjet-js/issues/929)) ([8c15961](https://github.com/arcjet/arcjet-js/commit/8c15961dfbb7f193f93a5036b26f181fc2ae7ec7))
* Remove rateLimit alias for fixedWindow rule ([#964](https://github.com/arcjet/arcjet-js/issues/964)) ([320d67c](https://github.com/arcjet/arcjet-js/commit/320d67c8c45ac381811615a10c86286057192291))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/duration bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/headers bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/protocol bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/runtime bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...arcjet-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871))
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824))

### 🚀 New Features

* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841)) ([96bbe94](https://github.com/arcjet/arcjet-js/commit/96bbe941b2f1613bc870e8f6073db919c1f41a7e))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871)) ([4e9e216](https://github.com/arcjet/arcjet-js/commit/4e9e2169e587ab010ff587a915ae8e1416c9b8f5))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858)) ([1806b94](https://github.com/arcjet/arcjet-js/commit/1806b94d7f7d0a7fd052e3121892d4dc1fdb719b)), closes [#822](https://github.com/arcjet/arcjet-js/issues/822) [#855](https://github.com/arcjet/arcjet-js/issues/855)
* Move all environment lookup into separate package ([#897](https://github.com/arcjet/arcjet-js/issues/897)) ([a5bb8ca](https://github.com/arcjet/arcjet-js/commit/a5bb8ca6bad9d831b3f67f12b3ef87048ced25bb))
* Separate `@arcjet/headers` package from core ([#824](https://github.com/arcjet/arcjet-js/issues/824)) ([c8364f4](https://github.com/arcjet/arcjet-js/commit/c8364f464b99b5b66749ea776e29c728257a2d74))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))


### 📝 Documentation

* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))
* Remove wording that implies is Shield is added by default ([#796](https://github.com/arcjet/arcjet-js/issues/796)) ([a85d18c](https://github.com/arcjet/arcjet-js/commit/a85d18ca6f6da589cfad58d3167b1c8a4b1edc55))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/duration bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/headers bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/logger bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/protocol bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/runtime bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...arcjet-v1.0.0-alpha.13) (2024-05-20)


### ⚠ BREAKING CHANGES

* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774))

### 🚀 New Features

* Filter cookie headers when normalizing with ArcjetHeaders ([#773](https://github.com/arcjet/arcjet-js/issues/773)) ([99b3e1f](https://github.com/arcjet/arcjet-js/commit/99b3e1fd1f104824642817e2f22bc78d308e2fb1))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.3 to 4.17.2 ([#708](https://github.com/arcjet/arcjet-js/issues/708)) ([6e548bf](https://github.com/arcjet/arcjet-js/commit/6e548bf30743d06615dc9a0b46b3cbdabd6a89e4))


### 🧹 Miscellaneous Chores

* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774)) ([c223ba0](https://github.com/arcjet/arcjet-js/commit/c223ba061f27c786159fb6224341d162ef15bf0f)), closes [#337](https://github.com/arcjet/arcjet-js/issues/337)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/duration bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/logger bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/protocol bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/rollup-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/tsconfig bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13

## [1.0.0-alpha.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.11...arcjet-v1.0.0-alpha.12) (2024-04-18)


### ⚠ BREAKING CHANGES

* Deprecate calling `protect()` with no rules ([#608](https://github.com/arcjet/arcjet-js/issues/608))

### 🚀 New Features

* Add configurable shield rule ([#609](https://github.com/arcjet/arcjet-js/issues/609)) ([a5717a1](https://github.com/arcjet/arcjet-js/commit/a5717a1183945d0cf1b06450b813fcd154a367a3)), closes [#606](https://github.com/arcjet/arcjet-js/issues/606)
* Add urls for Arcjet fly.io deployments ([#554](https://github.com/arcjet/arcjet-js/issues/554)) ([27d946b](https://github.com/arcjet/arcjet-js/commit/27d946b1f4adf00ab2c3ac931381d003771758df))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.14.1 to 4.14.3 ([#597](https://github.com/arcjet/arcjet-js/issues/597)) ([598adf0](https://github.com/arcjet/arcjet-js/commit/598adf0b3d61b9e9bce046c7c3e8ddef2802a37c))
* **dev:** Bump typescript from 5.4.4 to 5.4.5 ([#557](https://github.com/arcjet/arcjet-js/issues/557)) ([16af391](https://github.com/arcjet/arcjet-js/commit/16af3914d66f05eb3b0d79a9623d2c5ade52bddd))


### 🧹 Miscellaneous Chores

* Deprecate calling `protect()` with no rules ([#608](https://github.com/arcjet/arcjet-js/issues/608)) ([57a8f6b](https://github.com/arcjet/arcjet-js/commit/57a8f6ba933b769cf7531f27ca36c08ecf74ea80))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/duration bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/logger bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/protocol bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/rollup-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/tsconfig bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12

## [1.0.0-alpha.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.10...arcjet-v1.0.0-alpha.11) (2024-04-08)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.13.0 to 4.13.2 ([#472](https://github.com/arcjet/arcjet-js/issues/472)) ([0268e51](https://github.com/arcjet/arcjet-js/commit/0268e51eb8967b2379014c1d16c65d1fbca13186))
* **dev:** Bump @rollup/wasm-node from 4.13.2 to 4.14.0 ([#493](https://github.com/arcjet/arcjet-js/issues/493)) ([ac14f3f](https://github.com/arcjet/arcjet-js/commit/ac14f3fb12157f9b2306ce2e703f80c081dcd9bc))
* **dev:** Bump @rollup/wasm-node from 4.14.0 to 4.14.1 ([#519](https://github.com/arcjet/arcjet-js/issues/519)) ([f859c0e](https://github.com/arcjet/arcjet-js/commit/f859c0eb071fcd83c68c8c94b60071217a600b3a))
* **dev:** Bump typescript from 5.4.2 to 5.4.3 ([#412](https://github.com/arcjet/arcjet-js/issues/412)) ([a69b76b](https://github.com/arcjet/arcjet-js/commit/a69b76b011a58bad21dc0763661927003c6b2a2e))
* **dev:** Bump typescript from 5.4.3 to 5.4.4 ([#509](https://github.com/arcjet/arcjet-js/issues/509)) ([8976fb1](https://github.com/arcjet/arcjet-js/commit/8976fb1b49f06b50b2a1d52b8a4619548993c737))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/duration bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/logger bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/protocol bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/rollup-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/tsconfig bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11

## [1.0.0-alpha.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.9...arcjet-v1.0.0-alpha.10) (2024-03-13)


### 🚀 New Features

* **analyze:** Replace wasm-bindgen with jco generated bindings ([#334](https://github.com/arcjet/arcjet-js/issues/334)) ([48359ff](https://github.com/arcjet/arcjet-js/commit/48359ff986cc0ff4888fc2df6a89e9b6f9a5b697))


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.12.0 to 4.12.1 ([#320](https://github.com/arcjet/arcjet-js/issues/320)) ([7f07a8f](https://github.com/arcjet/arcjet-js/commit/7f07a8f78e2f2bf67ab0eba032eeb311704c4eee))
* **dev:** Bump @rollup/wasm-node from 4.12.1 to 4.13.0 ([#359](https://github.com/arcjet/arcjet-js/issues/359)) ([8658316](https://github.com/arcjet/arcjet-js/commit/8658316b252f9224069d5c11b8fc6acb6681c90e))
* **dev:** Bump typescript from 5.3.3 to 5.4.2 ([#321](https://github.com/arcjet/arcjet-js/issues/321)) ([e0c2914](https://github.com/arcjet/arcjet-js/commit/e0c2914ab868d4a3e571c959f4b00284bbbc3050))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/duration bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/logger bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/protocol bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/rollup-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/tsconfig bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10

## [1.0.0-alpha.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.8...arcjet-v1.0.0-alpha.9) (2024-03-04)


### ⚠ BREAKING CHANGES

* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228))

### 🚀 New Features

* Add `withRule` API for adding adhoc rules ([#245](https://github.com/arcjet/arcjet-js/issues/245)) ([f8ebbdc](https://github.com/arcjet/arcjet-js/commit/f8ebbdc7198010c4aa942255a76e65537c73f807)), closes [#193](https://github.com/arcjet/arcjet-js/issues/193)
* Add decorate package to set rate limit headers ([#247](https://github.com/arcjet/arcjet-js/issues/247)) ([232750d](https://github.com/arcjet/arcjet-js/commit/232750df8cf99378407e9c88e9d64d4b7a9410a4))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228)) ([4950364](https://github.com/arcjet/arcjet-js/commit/4950364be1f895fc8bb782950b20623fc8324ceb)), closes [#33](https://github.com/arcjet/arcjet-js/issues/33)


### 📦 Dependencies

* **dev:** Bump @edge-runtime/jest-environment from 2.3.9 to 2.3.10 ([#229](https://github.com/arcjet/arcjet-js/issues/229)) ([6f3a070](https://github.com/arcjet/arcjet-js/commit/6f3a0706ccd7cc9c3fd80f554b4229f4b11767cb))
* **dev:** Bump @rollup/wasm-node from 4.10.0 to 4.12.0 ([#235](https://github.com/arcjet/arcjet-js/issues/235)) ([cf7ffc2](https://github.com/arcjet/arcjet-js/commit/cf7ffc2ae35d75884a04c88818f8c780ca7af223))
* **dev:** Bump @rollup/wasm-node from 4.9.6 to 4.10.0 ([#223](https://github.com/arcjet/arcjet-js/issues/223)) ([47c24b4](https://github.com/arcjet/arcjet-js/commit/47c24b40a8419f1dabcf8607c90dfcb97f6a4195))


### 📝 Documentation

* Update HTTP version ([#227](https://github.com/arcjet/arcjet-js/issues/227)) ([c102c64](https://github.com/arcjet/arcjet-js/commit/c102c64246020cfa247327fe646c62e36a43a62f))


### 🧹 Miscellaneous Chores

* Add bugs and author info & update readme ([#254](https://github.com/arcjet/arcjet-js/issues/254)) ([9b0d2fc](https://github.com/arcjet/arcjet-js/commit/9b0d2fc674fdc1ddf9952b9a2ef3f5f3c860d41a))
* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260)) ([c93a2e1](https://github.com/arcjet/arcjet-js/commit/c93a2e11d550651ddbc3d9256facba59d4d4d965))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/duration bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/logger bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/protocol bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/rollup-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/tsconfig bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9

## [1.0.0-alpha.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.7...arcjet-v1.0.0-alpha.8) (2024-02-09)


### ⚠ BREAKING CHANGES

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211))
* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181))
* Required of props should always be required ([#180](https://github.com/arcjet/arcjet-js/issues/180))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179))
* Limit `ARCJET_BASE_URL` to small set of allowed URLs ([#83](https://github.com/arcjet/arcjet-js/issues/83))

### 🚀 New Features

* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184)) ([6701b02](https://github.com/arcjet/arcjet-js/commit/6701b02e8425c25953f103add46d7e850aa7d0b4))
* Allow user-defined characteristics on rate limit options ([#203](https://github.com/arcjet/arcjet-js/issues/203)) ([dc5b001](https://github.com/arcjet/arcjet-js/commit/dc5b0010dd772207ec662062bfa6da5fe712f987))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179)) ([2576341](https://github.com/arcjet/arcjet-js/commit/257634154328a96d47969a58b389c0e9aacf59bc))
* Limit `ARCJET_BASE_URL` to small set of allowed URLs ([#83](https://github.com/arcjet/arcjet-js/issues/83)) ([d9184ea](https://github.com/arcjet/arcjet-js/commit/d9184ea929cda015339aaafe8c6d3f5a5da39ef2))
* Support cookies and query via the protocol ([#214](https://github.com/arcjet/arcjet-js/issues/214)) ([ca0cd64](https://github.com/arcjet/arcjet-js/commit/ca0cd64ca2576eeec7f44dfe7e4f413427d5eea2))
* Support duration strings or integers on rate limit configuration ([#192](https://github.com/arcjet/arcjet-js/issues/192)) ([b173d83](https://github.com/arcjet/arcjet-js/commit/b173d83bb5c80c78fd5c08dfa2aae5885d099620))


### 🪲 Bug Fixes

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211)) ([c2d3dd0](https://github.com/arcjet/arcjet-js/commit/c2d3dd095affee68bb661f90d1195f114baa4017))
* Required of props should always be required ([#180](https://github.com/arcjet/arcjet-js/issues/180)) ([1f92885](https://github.com/arcjet/arcjet-js/commit/1f92885daeed2c1cda65fce65ace042a9589282d))


### 📦 Dependencies

* **dev:** bump @edge-runtime/jest-environment from 2.3.7 to 2.3.8 ([#154](https://github.com/arcjet/arcjet-js/issues/154)) ([9c4ed39](https://github.com/arcjet/arcjet-js/commit/9c4ed39bd017e8a0b692e13edfd2d754b549e8aa))
* **dev:** bump @edge-runtime/jest-environment from 2.3.8 to 2.3.9 ([#196](https://github.com/arcjet/arcjet-js/issues/196)) ([8bc0a8f](https://github.com/arcjet/arcjet-js/commit/8bc0a8f995403797a2cb9dbaa56e0ed6062b941f))
* **dev:** bump @rollup/wasm-node from 4.9.1 to 4.9.2 ([#97](https://github.com/arcjet/arcjet-js/issues/97)) ([eff4226](https://github.com/arcjet/arcjet-js/commit/eff4226ad0581dd7c5dff69bd3f259f058679f6e))
* **dev:** bump @rollup/wasm-node from 4.9.2 to 4.9.4 ([#119](https://github.com/arcjet/arcjet-js/issues/119)) ([ec50b96](https://github.com/arcjet/arcjet-js/commit/ec50b96ed3e96735d80a8f556d5a1cd8a68287c5))
* **dev:** bump @rollup/wasm-node from 4.9.4 to 4.9.5 ([#131](https://github.com/arcjet/arcjet-js/issues/131)) ([9fff856](https://github.com/arcjet/arcjet-js/commit/9fff856af1291bd05f7d5b6a02e007f5619e73c9))
* **dev:** bump @rollup/wasm-node from 4.9.5 to 4.9.6 ([#152](https://github.com/arcjet/arcjet-js/issues/152)) ([3e54cff](https://github.com/arcjet/arcjet-js/commit/3e54cffa4419470fdfc52712a34a20b919189fc5))


### 📝 Documentation

* Add minimum required fields for request details example ([#220](https://github.com/arcjet/arcjet-js/issues/220)) ([83a3a8c](https://github.com/arcjet/arcjet-js/commit/83a3a8c6ddd186ff863545e68fac9b7d66434933))
* Rename AJ_KEY to ARCJET_KEY & switch to next.js app dir example ([#201](https://github.com/arcjet/arcjet-js/issues/201)) ([9c4da7b](https://github.com/arcjet/arcjet-js/commit/9c4da7bc53fe7803046a40531db4976c70cb0449))
* Update Arcjet description ([#122](https://github.com/arcjet/arcjet-js/issues/122)) ([c011bc2](https://github.com/arcjet/arcjet-js/commit/c011bc262159c8f09fadff381ea71f475fed0b16))


### 🧹 Miscellaneous Chores

* Change `ttl` argument to `expiresAt` in cache implementation ([#218](https://github.com/arcjet/arcjet-js/issues/218)) ([0414e10](https://github.com/arcjet/arcjet-js/commit/0414e10509d402571c38029a0cb7f0aedc3693a4))
* **examples:** Encourage use of environment variables for keys ([#139](https://github.com/arcjet/arcjet-js/issues/139)) ([290a1b2](https://github.com/arcjet/arcjet-js/commit/290a1b2b7eb0cd42fd7c7b979b6f7f5004cae918))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181)) ([ff3e310](https://github.com/arcjet/arcjet-js/commit/ff3e310f47c554a27821b9b0f4060084968bd6c4))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182)) ([255a4a7](https://github.com/arcjet/arcjet-js/commit/255a4a7636e8e7bb0b274a73d1d1eee90393b74c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/duration bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/logger bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/protocol bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/rollup-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/tsconfig bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...arcjet-v1.0.0-alpha.7) (2023-12-21)


### ⚠ BREAKING CHANGES

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18))

### 🪲 Bug Fixes

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18)) ([3b0c1fb](https://github.com/arcjet/arcjet-js/commit/3b0c1fb5a19f5c6d15a0b83bdd24db0192aa9e49))


### 📦 Dependencies

* **dev:** Bump the dev-dependencies group with 5 updates ([#82](https://github.com/arcjet/arcjet-js/issues/82)) ([a67be47](https://github.com/arcjet/arcjet-js/commit/a67be47b76e623f1aef6687f9dcc87de8eb2f1da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/logger bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/protocol bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/rollup-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/tsconfig bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...arcjet-v1.0.0-alpha.6) (2023-12-18)


### ⚠ BREAKING CHANGES

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65))

### 🚀 New Features

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65)) ([c043f15](https://github.com/arcjet/arcjet-js/commit/c043f15342ec87a2b15e41ada05f90527daf0879))


### 🪲 Bug Fixes

* Wrap timeout default ternary so timeout option takes effect ([#66](https://github.com/arcjet/arcjet-js/issues/66)) ([d49ebd2](https://github.com/arcjet/arcjet-js/commit/d49ebd2a5581804b988161f2850e909f414effa3))


### 🧹 Miscellaneous Chores

* Add pre and post logging to remote client ([#70](https://github.com/arcjet/arcjet-js/issues/70)) ([46fd6b3](https://github.com/arcjet/arcjet-js/commit/46fd6b3797fc4ba27e96d7846f22aa67a91e9a5f))
* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))
* Disallow configuring timeout for report ([#67](https://github.com/arcjet/arcjet-js/issues/67)) ([ae8f1b7](https://github.com/arcjet/arcjet-js/commit/ae8f1b7c1814b694cb959c613ccf1e75bcc0158f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/analyze bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/logger bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/protocol bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/rollup-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/tsconfig bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
