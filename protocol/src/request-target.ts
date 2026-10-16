/**
 * Extract the path exactly as it appeared in an origin-form HTTP request
 * target. Parsed URLs may normalize dot segments or escapes and cannot be used
 * to verify an HTTP signature covering `@path`.
 */
export function rawPathFromOriginFormTarget(target: string | undefined): string | undefined {
  if (typeof target !== "string" || !target.startsWith("/")) {
    return undefined;
  }
  for (let index = 0; index < target.length; index++) {
    const code = target.charCodeAt(index);
    if (code <= 0x20 || code > 0x7e || code === 0x23) {
      return undefined;
    }
  }
  const query = target.indexOf("?");
  return query === -1 ? target : target.slice(0, query);
}
