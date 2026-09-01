import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  PACKAGE_NAME,
  VERSION,
  getSkill,
  skillIdentity,
  skillLibraryVersion,
  skills,
  type SkillName,
} from "../dist/index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const expectedNames: readonly SkillName[] = [
  "choose-protections",
  "cli",
  "guard",
  "mcp",
  "protect",
];

test("@arcjet/skills", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), [
      "PACKAGE_NAME",
      "VERSION",
      "getSkill",
      "skillIdentity",
      "skillLibraryVersion",
      "skills",
    ]);
  });
});

describe("manifest", () => {
  test("package identity matches package.json", () => {
    const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      name: string;
      version: string;
      keywords: string[];
    };

    assert.equal(PACKAGE_NAME, "@arcjet/skills");
    assert.equal(pkg.name, PACKAGE_NAME);
    assert.equal(VERSION, pkg.version);
    assert.equal(skillLibraryVersion(), pkg.version);
    assert.ok(pkg.keywords.includes("tanstack-intent"));
  });

  test("ships one manifest entry per skill file", () => {
    assert.deepEqual(skills.map((skill) => skill.name).toSorted(), [...expectedNames].toSorted());

    for (const skill of skills) {
      assert.equal(skill.file, `skills/${skill.name}/SKILL.md`);
      assert.ok(existsSync(join(packageRoot, skill.file)), `missing ${skill.file}`);
      assert.ok(skill.sources.length > 0, `${skill.name} has no sources`);
      for (const source of skill.sources) {
        assert.ok(
          existsSync(join(packageRoot, source)),
          `missing source ${source} for ${skill.name}`,
        );
      }
    }
  });

  test("skillIdentity formats an Intent load id", () => {
    assert.equal(skillIdentity("protect"), "@arcjet/skills#protect");
    assert.equal(getSkill("protect")?.name, "protect");
    assert.equal(getSkill("protect")?.file, "skills/protect/SKILL.md");
  });
});

describe("SKILL.md files", () => {
  test("frontmatter matches the TypeScript manifest", () => {
    for (const skill of skills) {
      const text = readFileSync(join(packageRoot, skill.file), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
      assert.ok(match, `${skill.file} is missing YAML frontmatter`);

      const frontmatter = match[1];
      assert.match(frontmatter, new RegExp(`^name: ${skill.name}$`, "m"));
      assert.match(frontmatter, new RegExp(`library_version: "${VERSION.replaceAll(".", "\\.")}"`));
      assert.match(frontmatter, /library: "@arcjet\/skills"/);
      assert.match(frontmatter, /type: core/);

      const description = /^description: (?:"([^"]+)"|(.+))$/m.exec(frontmatter);
      assert.ok(description, `${skill.file} is missing description`);
      const described = description[1] ?? description[2];
      assert.equal(described, skill.description);

      for (const source of skill.sources) {
        assert.match(frontmatter, new RegExp(`- ${source.replaceAll(".", "\\.")}`));
      }

      const lineCount = text.split("\n").length;
      assert.ok(lineCount <= 500, `${skill.file} is ${lineCount} lines (Intent max 500)`);
      assert.ok(
        skill.description.length <= 1024,
        `${skill.name} description is ${skill.description.length} chars`,
      );
    }
  });

  test("package files include skills and source docs", () => {
    const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8")) as {
      files: string[];
    };

    assert.ok(pkg.files.includes("skills"));
    assert.ok(pkg.files.includes("docs"));
    assert.ok(pkg.files.includes("dist"));
  });
});

describe("npm tarball", () => {
  test("publishes skills and source docs", () => {
    const packed = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: packageRoot,
      encoding: "utf8",
    });
    const parsed: unknown = JSON.parse(packed);
    const report = Array.isArray(parsed)
      ? (parsed[0] as { files: Array<{ path: string }> })
      : (Object.values(parsed as Record<string, { files: Array<{ path: string }> }>)[0] ??
        undefined);
    assert.ok(report, "npm pack --json did not report a tarball");
    const paths = new Set(report.files.map((file) => file.path));

    assert.ok(paths.has("package.json"));
    assert.ok(paths.has("dist/index.js"));
    assert.ok(paths.has("docs/protect.md"));
    for (const skill of skills) {
      assert.ok(paths.has(skill.file), `tarball missing ${skill.file}`);
    }
  });
});
