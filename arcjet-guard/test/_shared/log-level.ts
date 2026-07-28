/**
 * Test helper to override `ARCJET_LOG_LEVEL` without clobbering ambient state.
 */

/**
 * Set (or unset) `ARCJET_LOG_LEVEL` and return a function that restores the
 * value — or absence — it had before. Call the restore function in `finally`
 * so a pre-existing log level survives the test.
 *
 * @param value - Log level to set, or `undefined` to unset
 * @returns Restore function
 */
export function setLogLevel(value: string | undefined): () => void {
  const previous = process.env.ARCJET_LOG_LEVEL;
  if (value === undefined) {
    delete process.env.ARCJET_LOG_LEVEL;
  } else {
    process.env.ARCJET_LOG_LEVEL = value;
  }
  return () => {
    if (previous === undefined) {
      delete process.env.ARCJET_LOG_LEVEL;
    } else {
      process.env.ARCJET_LOG_LEVEL = previous;
    }
  };
}
