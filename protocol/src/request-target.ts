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

/**
 * Get the raw path of an origin-form request target, but only when that target
 * is the request at `url`.
 *
 * Adapters read the target from a framework or runtime object that can belong
 * to another request (for example an internal subrequest that reuses the outer
 * request), or that was rewritten. The target is used only when resolving it
 * against the origin of `url` gives the same pathname and search as `url`.
 *
 * @param target
 *   Request target as received, such as `/a/%2E%2e/b?x=1`.
 * @param url
 *   URL of the request the target must belong to.
 * @returns
 *   Raw path, byte for byte, or `undefined` when the target is not an
 *   origin-form target of the request at `url`.
 */
export function rawPathForUrl(target: string | undefined, url: string | URL): string | undefined {
  const rawPath = rawPathFromOriginFormTarget(target);
  if (rawPath === undefined) {
    return undefined;
  }
  try {
    const requestUrl = new URL(url);
    const targetUrl = new URL(requestUrl.origin + target);
    if (targetUrl.pathname !== requestUrl.pathname || targetUrl.search !== requestUrl.search) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return rawPath;
}
