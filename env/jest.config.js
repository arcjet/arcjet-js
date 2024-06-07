/** @type {import('jest').Config} */
const config = {
  // We only test JS files once compiled with TypeScript
  moduleFileExtensions: ["js"],
  coverageDirectory: "coverage",
  collectCoverage: true,
  // If this is set to default (babel) rather than v8, tests fail with the edge
  // runtime and the error "EvalError: Code generation from strings disallowed
  // for this context". Tracking in
  // https://github.com/vercel/edge-runtime/issues/250
  coverageProvider: "v8",
  verbose: true,
  testEnvironment: "node",
};

export default config;
