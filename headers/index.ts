function isIterable(val: any): val is Iterable<any> {
  return typeof val?.[Symbol.iterator] === "function";
}

/**
 * This Fetch API interface allows you to perform various actions on HTTP
 * request and response headers. These actions include retrieving, setting,
 * adding to, and removing. A Headers object has an associated header list,
 * which is initially empty and consists of zero or more name and value pairs.
 *
 * You can add to this using methods like `append()`.
 *
 * In all methods of this interface, header names are matched by
 * case-insensitive byte sequence.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers)
 */
export class ArcjetHeaders extends Headers {
  constructor(
    init?: HeadersInit | Record<string, string | string[] | undefined>,
  ) {
    super();
    if (
      typeof init !== "undefined" &&
      typeof init !== "string" &&
      init !== null
    ) {
      if (isIterable(init)) {
        for (const [key, value] of init) {
          this.append(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(
          init as Record<string, string | string[] | undefined>,
        )) {
          if (typeof value === "undefined") {
            continue;
          }

          if (Array.isArray(value)) {
            for (const singleValue of value) {
              this.append(key, singleValue);
            }
          } else {
            this.append(key, value);
          }
        }
      }
    }
  }

  /**
   * Append a key and value to the headers, while filtering any key named
   * `cookie`.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append)
   *
   * @param key The key to append in the headers
   * @param value The value to append for the key in the headers
   */
  append(key: string, value: string): void {
    if (typeof key !== "string" || typeof value !== "string") {
      return;
    }

    if (key.toLowerCase() !== "cookie") {
      super.append(key, value);
    }
  }
  /**
   * Set a key and value in the headers, but filtering any key named `cookie`.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set)
   *
   * @param key The key to set in the headers
   * @param value The value to set for the key in the headers
   */
  set(key: string, value: string): void {
    if (typeof key !== "string" || typeof value !== "string") {
      return;
    }

    if (key.toLowerCase() !== "cookie") {
      super.set(key, value);
    }
  }
}

/**
 * @deprecated
 *   Use the named export `ArcjetHeaders` instead.
 */
export default ArcjetHeaders;
