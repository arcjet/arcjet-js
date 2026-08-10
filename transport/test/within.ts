/**
 * Bound an asynchronous test operation so a broken transport cannot hang the
 * test job.
 *
 * @param promise
 *   Operation to bound.
 * @param message
 *   Error message when the operation times out.
 * @param timeout
 *   Maximum duration in milliseconds.
 * @returns
 *   Result of the operation.
 */
export async function within<T>(
  promise: Promise<T>,
  message = "transport request timed out",
  timeout = 2_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
