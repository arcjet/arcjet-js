/**
 * Brand stamped on tools wrapped by `protectTool()` so context helpers can
 * recognize them. Registry-scoped so duplicate copies of this package
 * interoperate.
 */
export const arcjetProtectedTool: symbol = Symbol.for("arcjet:ai:protected-tool");
