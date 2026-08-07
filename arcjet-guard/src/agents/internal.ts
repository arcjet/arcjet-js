/**
 * Brand stamped on tools wrapped by `guardTool()` so context helpers can
 * recognize them. Registry-scoped so duplicate copies of this package
 * interoperate.
 *
 * @internal Exported for use by the vendor namespaces; not part of the public
 * API. The symbol itself is observable on a wrapped tool, but the binding is
 * not a supported import.
 */
export const arcjetProtectedTool: symbol = Symbol.for("arcjet:ai:protected-tool");
