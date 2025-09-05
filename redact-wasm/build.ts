import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transpile } from "@bytecodealliance/jco-transpile";

const folder = new URL("wasm/", import.meta.url);
const name = "arcjet_analyze_bindings_redact.component";

// Something’s up with the types, hence the explicit type.
const result: {
  files: Record<string, [filePath: string, buffer: Uint8Array]>;
} = await transpile(fileURLToPath(new URL(name + ".wasm", folder)), {
  instantiation: "async",
  name,
  outDir: fileURLToPath(new URL(folder)),
});

for (const [filePath, bytes] of Object.entries(result.files)) {
  const url = pathToFileURL(filePath);
  await mkdir(new URL(".", url), { recursive: true });
  await writeFile(url, bytes);
  console.log(`Emitted: ${filePath} (${bytes.length} bytes)`);
}
