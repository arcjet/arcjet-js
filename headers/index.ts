function isIterable(val: any): val is Iterable<any> {
  return typeof val?.[Symbol.iterator] === "function";
}

type HeadersInit =
  | Headers
  | Array<[string, string]>
  | Record<string, Array<string> | string | undefined>

/**
 * Arcjet headers.
 *
 * This exists to prevent the `cookie` header from being set
 * and non-string values from being set.
 *
 * @see
 *   [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers).
 */
export class ArcjetHeaders extends Headers {
  constructor(init?: HeadersInit | undefined) {
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
        for (const [key, value] of Object.entries(init)) {
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
   * Append a header while ignoring `cookie`.
   *
   * @see
   *   [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append)
   *
   * @param key
   *   Header name.
   * @param value
   *   Header value.
   * @returns
   *   Nothing.
   */
  append: (key: string, value: string) => void = (key, value) => {
    if (typeof key !== "string" || typeof value !== "string") {
      return;
    }

    if (key.toLowerCase() !== "cookie") {
      Headers.prototype.append.call(this, key, value);
    }
  };
  /**
   * Set a header while ignoring `cookie`.
   *
   * @see
   *   [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set)
   *
   * @param key
   *   Header key.
   * @param value
   *   Header value.
   * @returns
   *   Nothing.
   */
  set: (key: string, value: string) => void = (key, value) => {
    if (typeof key !== "string" || typeof value !== "string") {
      return;
    }

    if (key.toLowerCase() !== "cookie") {
      Headers.prototype.set.call(this, key, value);
    }
  };
}

/**
 * @deprecated
 *   Use the named export `ArcjetHeaders` instead.
 */
export default ArcjetHeaders;
