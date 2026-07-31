// SvelteKit resolves `$env/dynamic/private` during its own build, so importing
// this package's built output in a Node test needs it stubbed. Only `env`, the
// one export the module reads, is provided — anything else should fail loudly
// rather than look supported.
//
// A resolve hook has to be registered from a real file, which is why this is a
// module of its own rather than part of the test.

const stub = "data:text/javascript,export const env = {};";

/** @type {import("node:module").ResolveHook} */
export function resolve(specifier, context, next) {
  if (specifier === "$env/dynamic/private") {
    return { shortCircuit: true, url: stub };
  }

  return next(specifier, context);
}
