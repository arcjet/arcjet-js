/**
 * Eve's own floor is Node 24 — higher than `@arcjet/guard`.
 *
 * npm reports a mismatch as `EBADENGINE` plus a raw range. Importing this
 * namespace throws the same fact in one sentence instead.
 */

export const EVE_NODE_ENGINE_MESSAGE: string = "needs Node 24.";

/**
 * The `process.versions` slice this check reads. Injected in tests so the
 * branches do not depend on the runner's engine.
 */
export type NodeVersions = {
  readonly node?: string;
};

export function eveEngineError(): Error {
  return new Error(`@arcjet/guard/vercel-eve/v0: ${EVE_NODE_ENGINE_MESSAGE}`);
}

export function nodeMajor(
  versions: NodeVersions | undefined = readNodeVersions(),
): number | undefined {
  const node = versions?.node;
  if (typeof node !== "string" || node === "") {
    return undefined;
  }
  const major = Number(node.split(".")[0]);
  if (!Number.isFinite(major)) {
    return undefined;
  }
  return major;
}

export function assertEveEngine(versions: NodeVersions | undefined = readNodeVersions()): void {
  const major = nodeMajor(versions);
  if (major === undefined || major < 24) {
    throw eveEngineError();
  }
}

function readNodeVersions(): NodeVersions | undefined {
  const g: unknown = globalThis;
  if (typeof g !== "object" || g === null || !("process" in g)) {
    return undefined;
  }
  const proc = g.process;
  if (typeof proc !== "object" || proc === null || !("versions" in proc)) {
    return undefined;
  }
  const versions = proc.versions;
  if (typeof versions !== "object" || versions === null) {
    return undefined;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- object-and-null guard above
  return versions as NodeVersions;
}
