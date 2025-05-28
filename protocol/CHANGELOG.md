# Changelog

## [1.0.0-beta.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.7...@arcjet/protocol-v1.0.0-beta.8) (2025-05-28)


### ⚠ BREAKING CHANGES

* **arcjet:** Require every rule to have a validate & protect function ([#4204](https://github.com/arcjet/arcjet-js/issues/4204))

### 🚀 New Features

* **arcjet:** Require every rule to have a validate & protect function ([#4204](https://github.com/arcjet/arcjet-js/issues/4204)) ([c5ee233](https://github.com/arcjet/arcjet-js/commit/c5ee233c69e45866c52f1f7c9876ac5cb81ab246))
* **arcjet:** Segment cache entries by rule ([#4191](https://github.com/arcjet/arcjet-js/issues/4191)) ([2f3c8a8](https://github.com/arcjet/arcjet-js/commit/2f3c8a81bed27608638a8e4a0bfacf3e151b5e8c)), closes [#213](https://github.com/arcjet/arcjet-js/issues/213)
* **protocol:** Add fingerprints to rule results ([#4190](https://github.com/arcjet/arcjet-js/issues/4190)) ([143bf2a](https://github.com/arcjet/arcjet-js/commit/143bf2a4575f47391d4fcb31e4d9d9da76cb5a2d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/cache bumped from 1.0.0-beta.7 to 1.0.0-beta.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/rollup-config bumped from 1.0.0-beta.7 to 1.0.0-beta.8
    * @arcjet/tsconfig bumped from 1.0.0-beta.7 to 1.0.0-beta.8

## [1.0.0-beta.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.6...@arcjet/protocol-v1.0.0-beta.7) (2025-05-06)


### 🚀 New Features

* **protocol:** Support identifier and version on rules ([#4027](https://github.com/arcjet/arcjet-js/issues/4027)) ([37cd996](https://github.com/arcjet/arcjet-js/commit/37cd996339f167a965e043a35a98a8a35f09ab52))


### 🪲 Bug Fixes

* **protocol:** Ensure sensitiveInfo rule sends mode ([#4026](https://github.com/arcjet/arcjet-js/issues/4026)) ([3ce22ed](https://github.com/arcjet/arcjet-js/commit/3ce22ed69cffc1e6488fe09aeab49a9adfcaeecd))


### 🧹 Miscellaneous Chores

* **protocol:** Increase code coverage on ArcjetStackToProtocol ([#4025](https://github.com/arcjet/arcjet-js/issues/4025)) ([6d89564](https://github.com/arcjet/arcjet-js/commit/6d89564459efaef97bb1eee93c97addf2acda16c))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/rollup-config bumped from 1.0.0-beta.6 to 1.0.0-beta.7
    * @arcjet/tsconfig bumped from 1.0.0-beta.6 to 1.0.0-beta.7

## [1.0.0-beta.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.5...@arcjet/protocol-v1.0.0-beta.6) (2025-04-17)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/rollup-config bumped from 1.0.0-beta.5 to 1.0.0-beta.6
    * @arcjet/tsconfig bumped from 1.0.0-beta.5 to 1.0.0-beta.6

## [1.0.0-beta.5](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.4...@arcjet/protocol-v1.0.0-beta.5) (2025-03-27)


### 🚀 New Features

* Add more detected bots ([#3689](https://github.com/arcjet/arcjet-js/issues/3689)) ([0bf3260](https://github.com/arcjet/arcjet-js/commit/0bf32608749bb4beb8e19d250657217d707f7cc1))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/rollup-config bumped from 1.0.0-beta.4 to 1.0.0-beta.5
    * @arcjet/tsconfig bumped from 1.0.0-beta.4 to 1.0.0-beta.5

## [1.0.0-beta.4](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.3...@arcjet/protocol-v1.0.0-beta.4) (2025-03-14)


### ⚠ BREAKING CHANGES

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531))

### deps

* Upgrade packages to eslint 9 ([#3531](https://github.com/arcjet/arcjet-js/issues/3531)) ([84826b5](https://github.com/arcjet/arcjet-js/commit/84826b51f0c7925ede7a889499bed3a188e48e65)), closes [#539](https://github.com/arcjet/arcjet-js/issues/539)


### 🚀 New Features

* regenerate webassembly with new bots ([#3570](https://github.com/arcjet/arcjet-js/issues/3570)) ([9db5e03](https://github.com/arcjet/arcjet-js/commit/9db5e033ba66cb0d5d03917b12f57aa1ddc0150b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/rollup-config bumped from 1.0.0-beta.3 to 1.0.0-beta.4
    * @arcjet/tsconfig bumped from 1.0.0-beta.3 to 1.0.0-beta.4

## [1.0.0-beta.3](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.2...@arcjet/protocol-v1.0.0-beta.3) (2025-03-05)


### 🚀 New Features

* **analyze:** Add Hydrozen monitoring bot ([#3132](https://github.com/arcjet/arcjet-js/issues/3132)) ([211dbd0](https://github.com/arcjet/arcjet-js/commit/211dbd0fe35f3a72c267fd21cfeb083214f66372))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/rollup-config bumped from 1.0.0-beta.2 to 1.0.0-beta.3
    * @arcjet/tsconfig bumped from 1.0.0-beta.2 to 1.0.0-beta.3

## [1.0.0-beta.2](https://github.com/arcjet/arcjet-js/compare/v1.0.0-beta.1...@arcjet/protocol-v1.0.0-beta.2) (2025-02-04)


### 🚀 New Features

* Implement Astro integration ([#2992](https://github.com/arcjet/arcjet-js/issues/2992)) ([a48eea8](https://github.com/arcjet/arcjet-js/commit/a48eea89f80bff18c9a1889fd83f1eed9092b110)), closes [#1075](https://github.com/arcjet/arcjet-js/issues/1075)


### 🪲 Bug Fixes

* **protocol:** Double timeout when email rule configured ([#2934](https://github.com/arcjet/arcjet-js/issues/2934)) ([23f9a9e](https://github.com/arcjet/arcjet-js/commit/23f9a9eab277b9c2e1a350ca621367cefe0c0e1f)), closes [#1697](https://github.com/arcjet/arcjet-js/issues/1697)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/rollup-config bumped from 1.0.0-beta.1 to 1.0.0-beta.2
    * @arcjet/tsconfig bumped from 1.0.0-beta.1 to 1.0.0-beta.2

## [1.0.0-beta.1](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.34...@arcjet/protocol-v1.0.0-beta.1) (2025-01-15)


### ⚠ BREAKING CHANGES

* **protocol:** Improve deprecation message on enum-like field usage ([#2855](https://github.com/arcjet/arcjet-js/issues/2855))

### 🚀 New Features

* support `allow` or `deny` config in validateEmail & deprecate `block` config ([#2661](https://github.com/arcjet/arcjet-js/issues/2661)) ([890afcd](https://github.com/arcjet/arcjet-js/commit/890afcd2d1afef262b741a74521b82cb85711860)), closes [#1834](https://github.com/arcjet/arcjet-js/issues/1834)


### 🪲 Bug Fixes

* **protocol:** Improve deprecation message on enum-like field usage ([#2855](https://github.com/arcjet/arcjet-js/issues/2855)) ([6512258](https://github.com/arcjet/arcjet-js/commit/6512258546076d6ac3478b02337741c2c0dbf67f))
* **protocol:** Include `cookies` and `query` fields on reports ([#2777](https://github.com/arcjet/arcjet-js/issues/2777)) ([cff2e3a](https://github.com/arcjet/arcjet-js/commit/cff2e3ae4e3ed3e714d90cd52da26ec7b6a7c4cc))


### 🧹 Miscellaneous Chores

* Deprecate Arcjet enum-like objects ([#2684](https://github.com/arcjet/arcjet-js/issues/2684)) ([7d9ac4f](https://github.com/arcjet/arcjet-js/commit/7d9ac4f6401c2e47632c8dc97845f6cd3abf92f9)), closes [#2621](https://github.com/arcjet/arcjet-js/issues/2621)
* **protocol:** Opt out of Buf & ConnectRPC v2 changes ([#2473](https://github.com/arcjet/arcjet-js/issues/2473)) ([06b5b21](https://github.com/arcjet/arcjet-js/commit/06b5b21d10c4a861c5379b4896168284d5c33225))
* Switch most test harnesses to node:test ([#2479](https://github.com/arcjet/arcjet-js/issues/2479)) ([8a71bbc](https://github.com/arcjet/arcjet-js/commit/8a71bbc3d1fa6b63586f1bae7fa6f0f8d4fbad66))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/rollup-config bumped from 1.0.0-alpha.34 to 1.0.0-beta.1
    * @arcjet/tsconfig bumped from 1.0.0-alpha.34 to 1.0.0-beta.1

## [1.0.0-alpha.34](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.33...@arcjet/protocol-v1.0.0-alpha.34) (2024-12-03)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/rollup-config bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34
    * @arcjet/tsconfig bumped from 1.0.0-alpha.33 to 1.0.0-alpha.34

## [1.0.0-alpha.33](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.32...@arcjet/protocol-v1.0.0-alpha.33) (2024-11-29)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/rollup-config bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33
    * @arcjet/tsconfig bumped from 1.0.0-alpha.32 to 1.0.0-alpha.33

## [1.0.0-alpha.32](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.31...@arcjet/protocol-v1.0.0-alpha.32) (2024-11-26)


### ⚠ BREAKING CHANGES

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326))

### 🚀 New Features

* check verification status ([#2229](https://github.com/arcjet/arcjet-js/issues/2229)) ([3329fd7](https://github.com/arcjet/arcjet-js/commit/3329fd7baaafa6784d6f6573905c95fd0686ea4e))


### 🪲 Bug Fixes

* Stop publishing TypeScript source files ([#2326](https://github.com/arcjet/arcjet-js/issues/2326)) ([f8f6a2d](https://github.com/arcjet/arcjet-js/commit/f8f6a2d998220d9705ecda8f10d3c5e14b47cad6)), closes [#1836](https://github.com/arcjet/arcjet-js/issues/1836)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/rollup-config bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32
    * @arcjet/tsconfig bumped from 1.0.0-alpha.31 to 1.0.0-alpha.32

## [1.0.0-alpha.31](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.30...@arcjet/protocol-v1.0.0-alpha.31) (2024-11-22)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/rollup-config bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31
    * @arcjet/tsconfig bumped from 1.0.0-alpha.30 to 1.0.0-alpha.31

## [1.0.0-alpha.30](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.29...@arcjet/protocol-v1.0.0-alpha.30) (2024-11-20)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/rollup-config bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30
    * @arcjet/tsconfig bumped from 1.0.0-alpha.29 to 1.0.0-alpha.30

## [1.0.0-alpha.29](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.28...@arcjet/protocol-v1.0.0-alpha.29) (2024-11-19)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/rollup-config bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29
    * @arcjet/tsconfig bumped from 1.0.0-alpha.28 to 1.0.0-alpha.29

## [1.0.0-alpha.28](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.27...@arcjet/protocol-v1.0.0-alpha.28) (2024-10-23)


### ⚠ BREAKING CHANGES

* Ensure performance metrics are scoped to same call ([#2019](https://github.com/arcjet/arcjet-js/issues/2019))
* **protocol:** Remove received_at and decision fields from Report ([#1988](https://github.com/arcjet/arcjet-js/issues/1988))
* Remove `match` option from rate limit rules ([#1815](https://github.com/arcjet/arcjet-js/issues/1815))

### 🚀 New Features

* Add Remix adapter ([#1866](https://github.com/arcjet/arcjet-js/issues/1866)) ([32d6d41](https://github.com/arcjet/arcjet-js/commit/32d6d41661ec2e5fe08d4300b60086dc007841bc)), closes [#1313](https://github.com/arcjet/arcjet-js/issues/1313)
* Use `waitUntil` for Report call if available ([#1838](https://github.com/arcjet/arcjet-js/issues/1838)) ([2851021](https://github.com/arcjet/arcjet-js/commit/28510216334e2b66fc19a7ee51e741fb59a20607)), closes [#884](https://github.com/arcjet/arcjet-js/issues/884)


### 🪲 Bug Fixes

* Ensure performance metrics are scoped to same call ([#2019](https://github.com/arcjet/arcjet-js/issues/2019)) ([e9f869c](https://github.com/arcjet/arcjet-js/commit/e9f869ca0c287c9dfb23fa3ebe91007822b3390e)), closes [#1865](https://github.com/arcjet/arcjet-js/issues/1865)


### 🧹 Miscellaneous Chores

* **protocol:** Remove received_at and decision fields from Report ([#1988](https://github.com/arcjet/arcjet-js/issues/1988)) ([3da543e](https://github.com/arcjet/arcjet-js/commit/3da543e78fa95dc2d001fd54a210115458eb5a60))
* Remove `match` option from rate limit rules ([#1815](https://github.com/arcjet/arcjet-js/issues/1815)) ([853119d](https://github.com/arcjet/arcjet-js/commit/853119d24c37330690c937149a0cf1d0c4d31862)), closes [#1810](https://github.com/arcjet/arcjet-js/issues/1810)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/rollup-config bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28
    * @arcjet/tsconfig bumped from 1.0.0-alpha.27 to 1.0.0-alpha.28

## [1.0.0-alpha.27](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.26...@arcjet/protocol-v1.0.0-alpha.27) (2024-10-01)


### 🚀 New Features

* Add Deno adapter ([#1782](https://github.com/arcjet/arcjet-js/issues/1782)) ([fdfcaf3](https://github.com/arcjet/arcjet-js/commit/fdfcaf3e0242e9b4a6d9db5d93dc601f983bae3c)), closes [#758](https://github.com/arcjet/arcjet-js/issues/758)
* Add NestJS adapter ([#1776](https://github.com/arcjet/arcjet-js/issues/1776)) ([4e52453](https://github.com/arcjet/arcjet-js/commit/4e5245300f2e9958630a948b902472c2e056b3ba)), closes [#781](https://github.com/arcjet/arcjet-js/issues/781)


### 🪲 Bug Fixes

* **protocol:** Ensure relative imports have extensions ([#1722](https://github.com/arcjet/arcjet-js/issues/1722)) ([73928c8](https://github.com/arcjet/arcjet-js/commit/73928c8c77c643577384cb5481a1dff955638388)), closes [#1720](https://github.com/arcjet/arcjet-js/issues/1720)


### 🧹 Miscellaneous Chores

* **analyze:** Update well known bots ([#1784](https://github.com/arcjet/arcjet-js/issues/1784)) ([52f1ee3](https://github.com/arcjet/arcjet-js/commit/52f1ee35fde144d152ef2face2546ed79ca35f49))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/rollup-config bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27
    * @arcjet/tsconfig bumped from 1.0.0-alpha.26 to 1.0.0-alpha.27

## [1.0.0-alpha.26](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.25...@arcjet/protocol-v1.0.0-alpha.26) (2024-09-16)


### 🚀 New Features

* Implement bot detection categories ([#1618](https://github.com/arcjet/arcjet-js/issues/1618)) ([540cfe8](https://github.com/arcjet/arcjet-js/commit/540cfe8d74b9f029248cfeb6f27e4c7b47fbb9b7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/rollup-config bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26
    * @arcjet/tsconfig bumped from 1.0.0-alpha.25 to 1.0.0-alpha.26

## [1.0.0-alpha.25](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.24...@arcjet/protocol-v1.0.0-alpha.25) (2024-09-10)


### 🧹 Miscellaneous Chores

* **analyze:** Update crawler list with Coda Server Fetcher ([#1580](https://github.com/arcjet/arcjet-js/issues/1580)) ([91dd435](https://github.com/arcjet/arcjet-js/commit/91dd435bc5abeafbe7955b6e186668e7af6307a1))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/rollup-config bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25
    * @arcjet/tsconfig bumped from 1.0.0-alpha.24 to 1.0.0-alpha.25

## [1.0.0-alpha.24](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.23...@arcjet/protocol-v1.0.0-alpha.24) (2024-09-05)


### ⚠ BREAKING CHANGES

* Rework bot detection rule with allow/deny configuration ([#1437](https://github.com/arcjet/arcjet-js/issues/1437))

### 🚀 New Features

* Rework bot detection rule with allow/deny configuration ([#1437](https://github.com/arcjet/arcjet-js/issues/1437)) ([eef18e3](https://github.com/arcjet/arcjet-js/commit/eef18e3a7c52a849fbc1766439dc28bf0cb2da27))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/rollup-config bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24
    * @arcjet/tsconfig bumped from 1.0.0-alpha.23 to 1.0.0-alpha.24

## [1.0.0-alpha.23](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.22...@arcjet/protocol-v1.0.0-alpha.23) (2024-09-02)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/rollup-config bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23
    * @arcjet/tsconfig bumped from 1.0.0-alpha.22 to 1.0.0-alpha.23

## [1.0.0-alpha.22](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.21...@arcjet/protocol-v1.0.0-alpha.22) (2024-08-26)


### ⚠ BREAKING CHANGES

* **tsconfig:** Enable verbatim module syntax ([#1324](https://github.com/arcjet/arcjet-js/issues/1324))

### 🚀 New Features

* add detect sensitive info rule ([#1300](https://github.com/arcjet/arcjet-js/issues/1300)) ([006e344](https://github.com/arcjet/arcjet-js/commit/006e34449a1af0768fe2c265c40161e0ecf90d82))


### 🧹 Miscellaneous Chores

* **tsconfig:** Enable verbatim module syntax ([#1324](https://github.com/arcjet/arcjet-js/issues/1324)) ([7012b54](https://github.com/arcjet/arcjet-js/commit/7012b5473431a84c6025e361a89eca027ebfc93f)), closes [#1314](https://github.com/arcjet/arcjet-js/issues/1314)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/rollup-config bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22
    * @arcjet/tsconfig bumped from 1.0.0-alpha.21 to 1.0.0-alpha.22

## [1.0.0-alpha.21](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.20...@arcjet/protocol-v1.0.0-alpha.21) (2024-08-05)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/rollup-config bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21
    * @arcjet/tsconfig bumped from 1.0.0-alpha.20 to 1.0.0-alpha.21

## [1.0.0-alpha.20](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.19...@arcjet/protocol-v1.0.0-alpha.20) (2024-07-24)


### 📦 Dependencies

* **dev:** bump @rollup/wasm-node from 4.18.1 to 4.19.0 ([#1160](https://github.com/arcjet/arcjet-js/issues/1160)) ([7062ca0](https://github.com/arcjet/arcjet-js/commit/7062ca00012dd73b2e80f0679609be6e45ec5f5d))
* **dev:** bump typescript from 5.5.3 to 5.5.4 ([#1166](https://github.com/arcjet/arcjet-js/issues/1166)) ([644e3a6](https://github.com/arcjet/arcjet-js/commit/644e3a6e69d092626fdf4f356aaa8e8f974ae46b))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/rollup-config bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20
    * @arcjet/tsconfig bumped from 1.0.0-alpha.19 to 1.0.0-alpha.20

## [1.0.0-alpha.19](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.18...@arcjet/protocol-v1.0.0-alpha.19) (2024-07-15)


### 📦 Dependencies

* Bump typeid-js from 0.7.0 to 1.0.0 ([#1079](https://github.com/arcjet/arcjet-js/issues/1079)) ([fa276c5](https://github.com/arcjet/arcjet-js/commit/fa276c508f9881287f519a3e9d0513ec6b4558f1))
* **dev:** Bump @rollup/wasm-node from 4.18.0 to 4.18.1 ([#1092](https://github.com/arcjet/arcjet-js/issues/1092)) ([ffc298a](https://github.com/arcjet/arcjet-js/commit/ffc298ad030721519af02c6c2da26fd2bd3fbdbd))
* **dev:** Bump typescript from 5.5.2 to 5.5.3 ([#1065](https://github.com/arcjet/arcjet-js/issues/1065)) ([ef05395](https://github.com/arcjet/arcjet-js/commit/ef053953cf4a6cba621b778cba2e0dd4e114b626))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/rollup-config bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19
    * @arcjet/tsconfig bumped from 1.0.0-alpha.18 to 1.0.0-alpha.19

## [1.0.0-alpha.18](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.17...@arcjet/protocol-v1.0.0-alpha.18) (2024-07-01)


### ⚠ BREAKING CHANGES

* Move generated protobuf to default buf file path ([#1009](https://github.com/arcjet/arcjet-js/issues/1009))

### 🚀 New Features

* Allow characteristics to be specified on the SDK for fingerprint generation & propagate to rate limit rule ([#1016](https://github.com/arcjet/arcjet-js/issues/1016)) ([6b692da](https://github.com/arcjet/arcjet-js/commit/6b692da8e6da506a977ec5617a223b6512035a19)), closes [#1015](https://github.com/arcjet/arcjet-js/issues/1015)


### 📦 Dependencies

* **dev:** Bump typescript from 5.4.5 to 5.5.2 ([#1011](https://github.com/arcjet/arcjet-js/issues/1011)) ([c17a101](https://github.com/arcjet/arcjet-js/commit/c17a101c5729db44ddf8a7e14d5e4184dcf38949))


### 🧹 Miscellaneous Chores

* Move generated protobuf to default buf file path ([#1009](https://github.com/arcjet/arcjet-js/issues/1009)) ([6800a00](https://github.com/arcjet/arcjet-js/commit/6800a003d9d2e1ba356408328f33d8f19e0d89c7))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/rollup-config bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18
    * @arcjet/tsconfig bumped from 1.0.0-alpha.17 to 1.0.0-alpha.18

## [1.0.0-alpha.17](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.16...@arcjet/protocol-v1.0.0-alpha.17) (2024-06-17)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/rollup-config bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17
    * @arcjet/tsconfig bumped from 1.0.0-alpha.16 to 1.0.0-alpha.17

## [1.0.0-alpha.16](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.15...@arcjet/protocol-v1.0.0-alpha.16) (2024-06-14)


### 🧹 Miscellaneous Chores

* **@arcjet/protocol:** Synchronize arcjet-js versions


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/rollup-config bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16
    * @arcjet/tsconfig bumped from 1.0.0-alpha.15 to 1.0.0-alpha.16

## [1.0.0-alpha.15](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.14...@arcjet/protocol-v1.0.0-alpha.15) (2024-06-12)


### ⚠ BREAKING CHANGES

* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932))

### 🧹 Miscellaneous Chores

* Move client into protocol and rename builders in adapters ([#932](https://github.com/arcjet/arcjet-js/issues/932)) ([ea1c2b2](https://github.com/arcjet/arcjet-js/commit/ea1c2b25d146be10056cbc616180abeac75f9a01))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/rollup-config bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15
    * @arcjet/tsconfig bumped from 1.0.0-alpha.14 to 1.0.0-alpha.15

## [1.0.0-alpha.14](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.13...@arcjet/protocol-v1.0.0-alpha.14) (2024-06-10)


### ⚠ BREAKING CHANGES

* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871))
* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841))

### 🚀 New Features

* Allow ArcjetContext extension via new argument to core `protect()` ([#841](https://github.com/arcjet/arcjet-js/issues/841)) ([96bbe94](https://github.com/arcjet/arcjet-js/commit/96bbe941b2f1613bc870e8f6073db919c1f41a7e))
* Create runtime package and remove from SDK ([#871](https://github.com/arcjet/arcjet-js/issues/871)) ([4e9e216](https://github.com/arcjet/arcjet-js/commit/4e9e2169e587ab010ff587a915ae8e1416c9b8f5))
* **logger:** Align logger with Pino API ([#858](https://github.com/arcjet/arcjet-js/issues/858)) ([1806b94](https://github.com/arcjet/arcjet-js/commit/1806b94d7f7d0a7fd052e3121892d4dc1fdb719b)), closes [#822](https://github.com/arcjet/arcjet-js/issues/822) [#855](https://github.com/arcjet/arcjet-js/issues/855)


### 📦 Dependencies

* Bump @bufbuild/protobuf from 1.9.0 to 1.10.0 ([#847](https://github.com/arcjet/arcjet-js/issues/847)) ([de8266f](https://github.com/arcjet/arcjet-js/commit/de8266f53beb66d0e4770b82cb0c372715704993))
* **dev:** Bump @rollup/wasm-node from 4.17.2 to 4.18.0 ([#803](https://github.com/arcjet/arcjet-js/issues/803)) ([e6321af](https://github.com/arcjet/arcjet-js/commit/e6321afbad7127442d78b9c760c0e4c1ef73a77c))


### 📝 Documentation

* Add quick start links & update Bun example ([#870](https://github.com/arcjet/arcjet-js/issues/870)) ([ee3079f](https://github.com/arcjet/arcjet-js/commit/ee3079f21484ed3b5cf67ae03a45cb9d07b3d911))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/rollup-config bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14
    * @arcjet/tsconfig bumped from 1.0.0-alpha.13 to 1.0.0-alpha.14

## [1.0.0-alpha.13](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.12...@arcjet/protocol-v1.0.0-alpha.13) (2024-05-20)


### ⚠ BREAKING CHANGES

* **protocol:** Export only things we use from connect and buf ([#783](https://github.com/arcjet/arcjet-js/issues/783))
* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774))

### 🚀 New Features

* Create Bun.sh adapter ([#757](https://github.com/arcjet/arcjet-js/issues/757)) ([381dde5](https://github.com/arcjet/arcjet-js/commit/381dde59b2daae1599bf1d9b4106f1054aed8f99)), closes [#475](https://github.com/arcjet/arcjet-js/issues/475)
* Create SvelteKit adapter ([#775](https://github.com/arcjet/arcjet-js/issues/775)) ([002fdbb](https://github.com/arcjet/arcjet-js/commit/002fdbb7472bb88921bb6577d6950e7064605589)), closes [#754](https://github.com/arcjet/arcjet-js/issues/754)


### 🪲 Bug Fixes

* **protocol:** Export only things we use from connect and buf ([#783](https://github.com/arcjet/arcjet-js/issues/783)) ([4596da5](https://github.com/arcjet/arcjet-js/commit/4596da514de35fd04bb186a6cd61c698492ee0ed))


### 📦 Dependencies

* Bump @bufbuild/protobuf from 1.8.0 to 1.9.0 ([#652](https://github.com/arcjet/arcjet-js/issues/652)) ([4cd2114](https://github.com/arcjet/arcjet-js/commit/4cd21148e1d1061ee8638bc70221d8bdf02ad4cb))
* **dev:** Bump @rollup/wasm-node from 4.14.3 to 4.17.2 ([#708](https://github.com/arcjet/arcjet-js/issues/708)) ([6e548bf](https://github.com/arcjet/arcjet-js/commit/6e548bf30743d06615dc9a0b46b3cbdabd6a89e4))


### 🧹 Miscellaneous Chores

* **eslint-config:** Update linting rules ([#774](https://github.com/arcjet/arcjet-js/issues/774)) ([c223ba0](https://github.com/arcjet/arcjet-js/commit/c223ba061f27c786159fb6224341d162ef15bf0f)), closes [#337](https://github.com/arcjet/arcjet-js/issues/337)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/rollup-config bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13
    * @arcjet/tsconfig bumped from 1.0.0-alpha.12 to 1.0.0-alpha.13

## [1.0.0-alpha.12](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.11...@arcjet/protocol-v1.0.0-alpha.12) (2024-04-18)


### 🚀 New Features

* Add configurable shield rule ([#609](https://github.com/arcjet/arcjet-js/issues/609)) ([a5717a1](https://github.com/arcjet/arcjet-js/commit/a5717a1183945d0cf1b06450b813fcd154a367a3)), closes [#606](https://github.com/arcjet/arcjet-js/issues/606)


### 📦 Dependencies

* Bump typeid-js from 0.5.0 to 0.6.0 ([#566](https://github.com/arcjet/arcjet-js/issues/566)) ([b6dcaeb](https://github.com/arcjet/arcjet-js/commit/b6dcaeb1667e082ed03a077b6a4b15e0e212ace7))
* Bump typeid-js from 0.6.0 to 0.7.0 ([#620](https://github.com/arcjet/arcjet-js/issues/620)) ([8b09974](https://github.com/arcjet/arcjet-js/commit/8b099749c656149b4bd947f14d79023e2a578a62))
* **dev:** Bump @rollup/wasm-node from 4.14.1 to 4.14.3 ([#597](https://github.com/arcjet/arcjet-js/issues/597)) ([598adf0](https://github.com/arcjet/arcjet-js/commit/598adf0b3d61b9e9bce046c7c3e8ddef2802a37c))
* **dev:** Bump typescript from 5.4.4 to 5.4.5 ([#557](https://github.com/arcjet/arcjet-js/issues/557)) ([16af391](https://github.com/arcjet/arcjet-js/commit/16af3914d66f05eb3b0d79a9623d2c5ade52bddd))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/rollup-config bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12
    * @arcjet/tsconfig bumped from 1.0.0-alpha.11 to 1.0.0-alpha.12

## [1.0.0-alpha.11](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.10...@arcjet/protocol-v1.0.0-alpha.11) (2024-04-08)


### 🚀 New Features

* Add ArcjetIpDetails to an ArcjetDecision ([#510](https://github.com/arcjet/arcjet-js/issues/510)) ([0642c51](https://github.com/arcjet/arcjet-js/commit/0642c5184272d8cc855cffa84491b1b7e75f1465)), closes [#474](https://github.com/arcjet/arcjet-js/issues/474)


### 📦 Dependencies

* Bump @bufbuild/protobuf from 1.7.2 to 1.8.0 ([#377](https://github.com/arcjet/arcjet-js/issues/377)) ([5253740](https://github.com/arcjet/arcjet-js/commit/5253740ba485e9fbacd627a0baf1bb54df5a56fc))
* **dev:** Bump @rollup/wasm-node from 4.13.0 to 4.13.2 ([#472](https://github.com/arcjet/arcjet-js/issues/472)) ([0268e51](https://github.com/arcjet/arcjet-js/commit/0268e51eb8967b2379014c1d16c65d1fbca13186))
* **dev:** Bump @rollup/wasm-node from 4.13.2 to 4.14.0 ([#493](https://github.com/arcjet/arcjet-js/issues/493)) ([ac14f3f](https://github.com/arcjet/arcjet-js/commit/ac14f3fb12157f9b2306ce2e703f80c081dcd9bc))
* **dev:** Bump @rollup/wasm-node from 4.14.0 to 4.14.1 ([#519](https://github.com/arcjet/arcjet-js/issues/519)) ([f859c0e](https://github.com/arcjet/arcjet-js/commit/f859c0eb071fcd83c68c8c94b60071217a600b3a))
* **dev:** Bump typescript from 5.4.2 to 5.4.3 ([#412](https://github.com/arcjet/arcjet-js/issues/412)) ([a69b76b](https://github.com/arcjet/arcjet-js/commit/a69b76b011a58bad21dc0763661927003c6b2a2e))
* **dev:** Bump typescript from 5.4.3 to 5.4.4 ([#509](https://github.com/arcjet/arcjet-js/issues/509)) ([8976fb1](https://github.com/arcjet/arcjet-js/commit/8976fb1b49f06b50b2a1d52b8a4619548993c737))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/rollup-config bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11
    * @arcjet/tsconfig bumped from 1.0.0-alpha.10 to 1.0.0-alpha.11

## [1.0.0-alpha.10](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.9...@arcjet/protocol-v1.0.0-alpha.10) (2024-03-13)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.12.0 to 4.12.1 ([#320](https://github.com/arcjet/arcjet-js/issues/320)) ([7f07a8f](https://github.com/arcjet/arcjet-js/commit/7f07a8f78e2f2bf67ab0eba032eeb311704c4eee))
* **dev:** Bump @rollup/wasm-node from 4.12.1 to 4.13.0 ([#359](https://github.com/arcjet/arcjet-js/issues/359)) ([8658316](https://github.com/arcjet/arcjet-js/commit/8658316b252f9224069d5c11b8fc6acb6681c90e))
* **dev:** Bump typescript from 5.3.3 to 5.4.2 ([#321](https://github.com/arcjet/arcjet-js/issues/321)) ([e0c2914](https://github.com/arcjet/arcjet-js/commit/e0c2914ab868d4a3e571c959f4b00284bbbc3050))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/rollup-config bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10
    * @arcjet/tsconfig bumped from 1.0.0-alpha.9 to 1.0.0-alpha.10

## [1.0.0-alpha.9](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.8...@arcjet/protocol-v1.0.0-alpha.9) (2024-03-04)


### ⚠ BREAKING CHANGES

* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228))

### 🚀 New Features

* Add decorate package to set rate limit headers ([#247](https://github.com/arcjet/arcjet-js/issues/247)) ([232750d](https://github.com/arcjet/arcjet-js/commit/232750df8cf99378407e9c88e9d64d4b7a9410a4))
* Separate ArcjetRequest and ArcjetRequestDetails types to accept record of headers ([#228](https://github.com/arcjet/arcjet-js/issues/228)) ([4950364](https://github.com/arcjet/arcjet-js/commit/4950364be1f895fc8bb782950b20623fc8324ceb)), closes [#33](https://github.com/arcjet/arcjet-js/issues/33)


### 📦 Dependencies

* **dev:** Bump @rollup/wasm-node from 4.10.0 to 4.12.0 ([#235](https://github.com/arcjet/arcjet-js/issues/235)) ([cf7ffc2](https://github.com/arcjet/arcjet-js/commit/cf7ffc2ae35d75884a04c88818f8c780ca7af223))
* **dev:** Bump @rollup/wasm-node from 4.9.6 to 4.10.0 ([#223](https://github.com/arcjet/arcjet-js/issues/223)) ([47c24b4](https://github.com/arcjet/arcjet-js/commit/47c24b40a8419f1dabcf8607c90dfcb97f6a4195))


### 🧹 Miscellaneous Chores

* Add bugs and author info & update readme ([#254](https://github.com/arcjet/arcjet-js/issues/254)) ([9b0d2fc](https://github.com/arcjet/arcjet-js/commit/9b0d2fc674fdc1ddf9952b9a2ef3f5f3c860d41a))
* Remove logger from context and leverage singleton logger instead ([#260](https://github.com/arcjet/arcjet-js/issues/260)) ([c93a2e1](https://github.com/arcjet/arcjet-js/commit/c93a2e11d550651ddbc3d9256facba59d4d4d965))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/rollup-config bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9
    * @arcjet/tsconfig bumped from 1.0.0-alpha.8 to 1.0.0-alpha.9

## [1.0.0-alpha.8](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.7...@arcjet/protocol-v1.0.0-alpha.8) (2024-02-09)


### ⚠ BREAKING CHANGES

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211))
* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179))
* **protocol:** Introduce Shield name ([#158](https://github.com/arcjet/arcjet-js/issues/158))

### 🚀 New Features

* Add fixedWindow, tokenBucket, and slidingWindow primitives ([#184](https://github.com/arcjet/arcjet-js/issues/184)) ([6701b02](https://github.com/arcjet/arcjet-js/commit/6701b02e8425c25953f103add46d7e850aa7d0b4))
* Build extra field from unknown request properties ([#179](https://github.com/arcjet/arcjet-js/issues/179)) ([2576341](https://github.com/arcjet/arcjet-js/commit/257634154328a96d47969a58b389c0e9aacf59bc))
* Support cookies and query via the protocol ([#214](https://github.com/arcjet/arcjet-js/issues/214)) ([ca0cd64](https://github.com/arcjet/arcjet-js/commit/ca0cd64ca2576eeec7f44dfe7e4f413427d5eea2))
* Support duration strings or integers on rate limit configuration ([#192](https://github.com/arcjet/arcjet-js/issues/192)) ([b173d83](https://github.com/arcjet/arcjet-js/commit/b173d83bb5c80c78fd5c08dfa2aae5885d099620))


### 🪲 Bug Fixes

* Handle TTL as seconds instead of milliseconds ([#211](https://github.com/arcjet/arcjet-js/issues/211)) ([c2d3dd0](https://github.com/arcjet/arcjet-js/commit/c2d3dd095affee68bb661f90d1195f114baa4017))


### 📦 Dependencies

* bump @bufbuild/protobuf from 1.6.0 to 1.7.2 ([#167](https://github.com/arcjet/arcjet-js/issues/167)) ([c7dbdba](https://github.com/arcjet/arcjet-js/commit/c7dbdba85e57be93a816064ed56dadccd18e24af))
* bump @connectrpc/connect from 1.2.1 to 1.3.0 ([#126](https://github.com/arcjet/arcjet-js/issues/126)) ([40db7f3](https://github.com/arcjet/arcjet-js/commit/40db7f3340ddf0e820b7b587211969300772314a))
* Bump `@connectrpc/connect` from 1.2.0 to 1.2.1 ([#100](https://github.com/arcjet/arcjet-js/issues/100)) ([74013ef](https://github.com/arcjet/arcjet-js/commit/74013efc4ce7b310d5dc70d11af7df284b12c018))
* bump typeid-js from 0.3.0 to 0.5.0 ([#176](https://github.com/arcjet/arcjet-js/issues/176)) ([fadf89f](https://github.com/arcjet/arcjet-js/commit/fadf89ff98b50ac12254c912d0631c01a5d3e279))
* **dev:** bump @rollup/wasm-node from 4.9.1 to 4.9.2 ([#97](https://github.com/arcjet/arcjet-js/issues/97)) ([eff4226](https://github.com/arcjet/arcjet-js/commit/eff4226ad0581dd7c5dff69bd3f259f058679f6e))
* **dev:** bump @rollup/wasm-node from 4.9.2 to 4.9.4 ([#119](https://github.com/arcjet/arcjet-js/issues/119)) ([ec50b96](https://github.com/arcjet/arcjet-js/commit/ec50b96ed3e96735d80a8f556d5a1cd8a68287c5))
* **dev:** bump @rollup/wasm-node from 4.9.4 to 4.9.5 ([#131](https://github.com/arcjet/arcjet-js/issues/131)) ([9fff856](https://github.com/arcjet/arcjet-js/commit/9fff856af1291bd05f7d5b6a02e007f5619e73c9))
* **dev:** bump @rollup/wasm-node from 4.9.5 to 4.9.6 ([#152](https://github.com/arcjet/arcjet-js/issues/152)) ([3e54cff](https://github.com/arcjet/arcjet-js/commit/3e54cffa4419470fdfc52712a34a20b919189fc5))


### 🧹 Miscellaneous Chores

* **protocol:** Introduce Shield name ([#158](https://github.com/arcjet/arcjet-js/issues/158)) ([311713b](https://github.com/arcjet/arcjet-js/commit/311713b42e0958d7887c5709181522196efd2159))
* Regenerate the protobuf bindings ([#183](https://github.com/arcjet/arcjet-js/issues/183)) ([807e8de](https://github.com/arcjet/arcjet-js/commit/807e8de376d730fbf9e12c537f417fce96e78fea))
* Remove count property on ArcjetRateLimitReason ([#181](https://github.com/arcjet/arcjet-js/issues/181)) ([ff3e310](https://github.com/arcjet/arcjet-js/commit/ff3e310f47c554a27821b9b0f4060084968bd6c4))
* Remove timeout property on ArcjetRateLimitRule ([#182](https://github.com/arcjet/arcjet-js/issues/182)) ([255a4a7](https://github.com/arcjet/arcjet-js/commit/255a4a7636e8e7bb0b274a73d1d1eee90393b74c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/rollup-config bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8
    * @arcjet/tsconfig bumped from 1.0.0-alpha.7 to 1.0.0-alpha.8

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...@arcjet/protocol-v1.0.0-alpha.7) (2023-12-21)


### 📦 Dependencies

* **dev:** Bump the dev-dependencies group with 5 updates ([#82](https://github.com/arcjet/arcjet-js/issues/82)) ([a67be47](https://github.com/arcjet/arcjet-js/commit/a67be47b76e623f1aef6687f9dcc87de8eb2f1da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/rollup-config bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7
    * @arcjet/tsconfig bumped from 1.0.0-alpha.6 to 1.0.0-alpha.7

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...@arcjet/protocol-v1.0.0-alpha.6) (2023-12-18)


### ⚠ BREAKING CHANGES

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65))

### 🚀 New Features

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65)) ([c043f15](https://github.com/arcjet/arcjet-js/commit/c043f15342ec87a2b15e41ada05f90527daf0879))


### 🧹 Miscellaneous Chores

* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))
* **deps:** Bump the dependencies group with 2 updates ([#54](https://github.com/arcjet/arcjet-js/issues/54)) ([9c68aa2](https://github.com/arcjet/arcjet-js/commit/9c68aa20b04b037bd8b32755251201188c899d6b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcjet/logger bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
  * devDependencies
    * @arcjet/eslint-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/rollup-config bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
    * @arcjet/tsconfig bumped from 1.0.0-alpha.5 to 1.0.0-alpha.6
