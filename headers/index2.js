//#region index.js
function isIterable(val) {
	return typeof val?.[Symbol.iterator] === "function";
}
/**
* Arcjet headers.
*
* This exists to prevent the `cookie` header from being set
* and non-string values from being set.
*
* @see
*   [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers).
*/
var ArcjetHeaders = class extends Headers {
	constructor(init) {
		super();
		if (typeof init !== "undefined" && typeof init !== "string" && init !== null) if (isIterable(init)) for (const [key, value] of init) this.append(key, value);
		else for (const [key, value] of Object.entries(init)) {
			if (typeof value === "undefined") continue;
			if (Array.isArray(value)) for (const singleValue of value) this.append(key, singleValue);
			else this.append(key, value);
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
	append = (key, value) => {
		if (typeof key !== "string" || typeof value !== "string") return;
		if (key.toLowerCase() !== "cookie") Headers.prototype.append.call(this, key, value);
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
	set = (key, value) => {
		if (typeof key !== "string" || typeof value !== "string") return;
		if (key.toLowerCase() !== "cookie") Headers.prototype.set.call(this, key, value);
	};
};
//#endregion
export { ArcjetHeaders, ArcjetHeaders as default };
