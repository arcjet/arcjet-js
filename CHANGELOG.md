# Changelog

## [1.0.0-alpha.7](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2023-12-21)


### ⚠ BREAKING CHANGES

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18))

### 🪲 Bug Fixes

* Reorganize SDK types to tighten helpers around custom props ([#18](https://github.com/arcjet/arcjet-js/issues/18)) ([3b0c1fb](https://github.com/arcjet/arcjet-js/commit/3b0c1fb5a19f5c6d15a0b83bdd24db0192aa9e49))


### 📦 Dependencies

* **dev:** Bump the dev-dependencies group with 5 updates ([#82](https://github.com/arcjet/arcjet-js/issues/82)) ([a67be47](https://github.com/arcjet/arcjet-js/commit/a67be47b76e623f1aef6687f9dcc87de8eb2f1da))


### ✅ Continuous Integration

* Switch to github token ([#81](https://github.com/arcjet/arcjet-js/issues/81)) ([cfc382a](https://github.com/arcjet/arcjet-js/commit/cfc382a1652358a2e8f1035f6baa78c509f846f4))

## [1.0.0-alpha.6](https://github.com/arcjet/arcjet-js/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2023-12-18)


### ⚠ BREAKING CHANGES

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65))

### 🚀 New Features

* Pass ArcjetContext to rules ([#65](https://github.com/arcjet/arcjet-js/issues/65)) ([c043f15](https://github.com/arcjet/arcjet-js/commit/c043f15342ec87a2b15e41ada05f90527daf0879))


### 🪲 Bug Fixes

* **next:** Avoid appending `?` if querystring is empty ([#71](https://github.com/arcjet/arcjet-js/issues/71)) ([16ca958](https://github.com/arcjet/arcjet-js/commit/16ca9583f806a11c23e2378be64fa9b1054feb50))
* **next:** Stop using NextUrl to avoid type conflict across version ([#62](https://github.com/arcjet/arcjet-js/issues/62)) ([294540a](https://github.com/arcjet/arcjet-js/commit/294540abda21dec4c4f054cea796fef9af091247))
* Wrap timeout default ternary so timeout option takes effect ([#66](https://github.com/arcjet/arcjet-js/issues/66)) ([d49ebd2](https://github.com/arcjet/arcjet-js/commit/d49ebd2a5581804b988161f2850e909f414effa3))


### 🧹 Miscellaneous Chores

* Add pre and post logging to remote client ([#70](https://github.com/arcjet/arcjet-js/issues/70)) ([46fd6b3](https://github.com/arcjet/arcjet-js/commit/46fd6b3797fc4ba27e96d7846f22aa67a91e9a5f))
* **deps-dev:** Bump the dev-dependencies group with 2 updates ([#55](https://github.com/arcjet/arcjet-js/issues/55)) ([94839f3](https://github.com/arcjet/arcjet-js/commit/94839f3105ab2be5f1e5cdf02278ca7cc24850c1))
* **deps:** Bump the dependencies group with 2 updates ([#54](https://github.com/arcjet/arcjet-js/issues/54)) ([9c68aa2](https://github.com/arcjet/arcjet-js/commit/9c68aa20b04b037bd8b32755251201188c899d6b))
* Disallow configuring timeout for report ([#67](https://github.com/arcjet/arcjet-js/issues/67)) ([ae8f1b7](https://github.com/arcjet/arcjet-js/commit/ae8f1b7c1814b694cb959c613ccf1e75bcc0158f))
* **examples:** Add Next 13 wrap example ([294540a](https://github.com/arcjet/arcjet-js/commit/294540abda21dec4c4f054cea796fef9af091247))
* **rollup:** Fail compilation on type check failure ([#68](https://github.com/arcjet/arcjet-js/issues/68)) ([b9a373b](https://github.com/arcjet/arcjet-js/commit/b9a373b48833a46fd1a9b5568dac6e6d9a3f5bbd))


### ✅ Continuous Integration

* Setup release workflow ([#74](https://github.com/arcjet/arcjet-js/issues/74)) ([53b5b63](https://github.com/arcjet/arcjet-js/commit/53b5b638b94370e27bb3550a50d36e89f45d261e))
