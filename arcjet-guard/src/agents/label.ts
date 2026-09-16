/**
 * The guard label rule, as the service enforces it.
 *
 * This is a convenience that fails fast, not the place the rule lives. The
 * service enforces, and this check can be bypassed by an older SDK, another
 * language, or a direct API call — so it must never be stricter than the
 * service. A check that rejects a label the service accepts breaks working
 * code, which is not hypothetical: `arcjet-go` refused an underscore for a day
 * after the service began accepting one.
 *
 * Too loose is recoverable, because the service still reports the rejection at
 * call time as `AJ1023`. Too strict is not.
 *
 * The cases both sides agree on are in `test/_shared/guard-label-cases.json`,
 * copied from the source of truth in the `arcjet` monorepo. Every validator
 * that decides whether a label is usable reads them, so a copy that drifts
 * fails by name. Nothing enforces that this copy is current, because the
 * monorepo is private and this repository is public — a change to the grammar
 * updates every copy in the same change.
 */

/**
 * The code the service attaches when it rejected a label and substituted
 * `invalid-label`.
 */
export const LABEL_REJECTED_CODE = "AJ1023";

/**
 * Whether the service reported that it rejected this decision's label.
 *
 * When it did, the label it evaluated was `invalid-label`, so no published
 * policy could have matched and the guard did not run. That is unevaluated
 * policy rather than an allow, and every caller routes it through
 * `onGuardError` — which is why this lives in one place rather than in each of
 * the six decision classifiers.
 *
 * A capture call has no response to carry the code, so capture uses
 * {@link labelProblem} instead.
 */
export function labelRejectedByService(decision: {
  readonly warnings: readonly { readonly code: string }[];
}): boolean {
  return decision.warnings.some((warning) => warning.code === LABEL_REJECTED_CODE);
}

const MAX_LABEL_BYTES = 256;

const encoder = new TextEncoder();

/**
 * Thrown when a guard label cannot match any policy.
 *
 * A configuration error rather than a decision: nothing was evaluated. It is
 * raised where the label is written — at construction — rather than on every
 * call, so a misspelling fails once at startup instead of disabling the guard
 * for the life of the process.
 */
export class ArcjetInvalidLabelError extends Error {
  /** The label as written, so a caller can report or log it. */
  readonly label: string;

  constructor(label: string, where: string, problem: string) {
    super(
      `${where}: guard label ${JSON.stringify(label)} is invalid (${problem}). ` +
        "No policy can match it — rename the tool or pass an explicit action.",
    );
    this.name = "ArcjetInvalidLabelError";
    this.label = label;
  }
}

function isLowerAsciiLetterOrDigit(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");
}

/**
 * Why `label` is unusable, or `undefined` when it is usable.
 *
 * Non-throwing, because capture needs to warn without failing: a capture call
 * has no response to carry `AJ1023`, so this is the only signal available
 * there.
 */
export function labelProblem(label: string): string | undefined {
  if (label === "") return "empty";
  if (encoder.encode(label).length > MAX_LABEL_BYTES) {
    return `longer than ${MAX_LABEL_BYTES} bytes`;
  }

  // Iterate by code point so a non-ASCII character is judged whole rather than
  // as surrogate halves.
  // Code points are exactly what this needs: a non-ASCII character is judged
  // whole, and every character a label may contain is ASCII anyway.
  // oxlint-disable-next-line typescript/no-misused-spread
  const runes = [...label];
  if (!isLowerAsciiLetterOrDigit(runes[0]!)) {
    return "must start with a lowercase letter or digit";
  }
  if (!isLowerAsciiLetterOrDigit(runes.at(-1)!)) {
    return "must end with a lowercase letter or digit";
  }

  for (const ch of runes) {
    if (isLowerAsciiLetterOrDigit(ch) || ch === "-" || ch === "." || ch === "_") {
      continue;
    }
    if (ch >= "A" && ch <= "Z") return `uppercase letter ${JSON.stringify(ch)}`;
    return `invalid character ${JSON.stringify(ch)}`;
  }

  return undefined;
}

/**
 * Throw when `action` cannot match a policy.
 *
 * Call this where the label is known and the failure is cheap — at
 * construction, never per call. A label that only exists at call time is
 * judged by the service instead.
 *
 * @internal Adapter factories call this; `validateGuardLabel` is the public
 * spelling.
 */
export function assertValidAction(action: string, where: string): void {
  const problem = labelProblem(action);
  if (problem !== undefined) {
    throw new ArcjetInvalidLabelError(action, where, problem);
  }
}

/**
 * Throw when `label` cannot match a policy.
 *
 * The public spelling, matching Go's `ValidateGuardLabel`. Use it to check a
 * label you build yourself before handing it to a guard.
 *
 * @example
 * ```ts
 * import { validateGuardLabel } from "@arcjet/guard";
 *
 * validateGuardLabel("send_email.invoked"); // returns
 * validateGuardLabel("getWeather.invoked"); // throws ArcjetInvalidLabelError
 * ```
 */
export function validateGuardLabel(label: string): void {
  assertValidAction(label, "validateGuardLabel");
}
