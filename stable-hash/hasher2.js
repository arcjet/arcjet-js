//#region hasher.js
var Sha256 = class {
	encoder;
	subtle;
	buf;
	constructor(subtle) {
		this.subtle = subtle;
		this.encoder = new TextEncoder();
		this.buf = "";
	}
	writeString(data) {
		this.buf += data;
	}
	async digest() {
		const buf = this.encoder.encode(this.buf);
		const digest = await this.subtle.digest("SHA-256", buf);
		return new Uint8Array(digest);
	}
};
const maxUint32 = 4294967295;
const fieldSeparator = ":";
const itemSeparator = ",";
/**
* Create a hasher for a boolean.
*
* @param key
*   Key.
* @param value
*   Value.
* @returns
*   Hasher.
*/
function bool(key, value) {
	return (data) => {
		data.writeString(key);
		data.writeString(fieldSeparator);
		if (value) data.writeString("true");
		else data.writeString("false");
	};
}
/**
* Create a hasher for an unsigned 32-bit integer.
*
* @param key
*   Key.
* @param value
*   Value.
* @returns
*   Hasher.
*/
function uint32(key, value) {
	return (data) => {
		data.writeString(key);
		data.writeString(fieldSeparator);
		if (value > maxUint32) data.writeString("0");
		else data.writeString(value.toFixed(0));
	};
}
/**
* Create a hasher for a string.
*
* @param key
*   Key.
* @param value
*   Value.
* @returns
*   Hasher.
*/
function string(key, value) {
	return (data) => {
		data.writeString(key);
		data.writeString(fieldSeparator);
		data.writeString(`"`);
		data.writeString(value.replaceAll(`"`, `\\"`));
		data.writeString(`"`);
	};
}
/**
* Create a hasher for a 64-bit floating point number.
*
* @param key
*   Key.
* @param value
*   Value.
* @returns
*   Hasher.
*/
function float64(key, value) {
	return (data) => {
		data.writeString(key);
		data.writeString(fieldSeparator);
		data.writeString(value.toString());
	};
}
/**
* Create a hasher for an array of strings.
*
* @param key
*   Key.
* @param values
*   Values.
* @returns
*   Hasher.
*/
function stringSliceOrdered(key, values) {
	return (data) => {
		data.writeString(key);
		data.writeString(fieldSeparator);
		data.writeString("[");
		for (const value of Array.from(values).sort()) {
			data.writeString(`"`);
			data.writeString(value.replaceAll(`"`, `\\"`));
			data.writeString(`"`);
			data.writeString(itemSeparator);
		}
		data.writeString("]");
	};
}
/**
* Create a hasher.
*
* @param subtle
*   Subtle crypto.
* @returns
*   Hasher.
*/
function makeHasher(subtle) {
	/**
	* Hash fields.
	*
	* @param hashers
	*   Hashers.
	* @returns
	*   Promise to a hash.
	*/
	return async function hash(...hashers) {
		const h = new Sha256(subtle);
		for (const hasher of hashers) {
			hasher(h);
			h.writeString(itemSeparator);
		}
		return hex(await h.digest());
	};
}
const hexSliceLookupTable = (function() {
	const alphabet = "0123456789abcdef";
	const table = new Array(256);
	for (let i = 0; i < 16; ++i) {
		const i16 = i * 16;
		for (let j = 0; j < 16; ++j) table[i16 + j] = alphabet[i] + alphabet[j];
	}
	return table;
})();
function hex(buf) {
	const len = buf.length;
	const start = 0;
	const end = len;
	let out = "";
	for (let i = start; i < end; ++i) out += hexSliceLookupTable[buf[i]];
	return out;
}
//#endregion
export { bool, float64, makeHasher, string, stringSliceOrdered, uint32 };
