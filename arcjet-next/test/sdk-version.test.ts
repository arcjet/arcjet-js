import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

// The build replaces the `__ARCJET_SDK_VERSION__` placeholder with the version
// from `package.json`, which the SDK reports to the Arcjet API with every
// request. This fails if the replacement step is ever dropped from the build,
// as happened in the rollup -> tsdown migration.
test("build should embed the SDK version", async function () {
  const packageUrl = new URL("../package.json", import.meta.url);
  const { version } = JSON.parse(await readFile(packageUrl, "utf8"));
  const distUrl = new URL("../dist/", import.meta.url);

  let found = false;
  for (const name of await readdir(distUrl, { recursive: true })) {
    if (!name.endsWith(".js")) {
      continue;
    }
    const code = await readFile(new URL(name, distUrl), "utf8");
    assert.ok(
      !code.includes("__ARCJET_SDK_VERSION__"),
      `dist/${name} contains the unreplaced __ARCJET_SDK_VERSION__ placeholder`,
    );
    if (code.includes(JSON.stringify(version))) {
      found = true;
    }
  }

  assert.ok(found, "no dist file embeds the package version");
});
