//#region index.js
function nowInSeconds() {
	return Math.floor(Date.now() / 1e3);
}
var Bucket = class {
	expires;
	data;
	constructor() {
		this.expires = /* @__PURE__ */ new Map();
		this.data = /* @__PURE__ */ new Map();
	}
	get(key) {
		const now = nowInSeconds();
		const ttl = (this.expires.get(key) ?? now) - now;
		if (ttl > 0) return [this.data.get(key), ttl];
		else {
			this.expires.delete(key);
			this.data.delete(key);
			return [void 0, 0];
		}
	}
	set(key, value, ttl) {
		const expiresAt = nowInSeconds() + ttl;
		this.expires.set(key, expiresAt);
		this.data.set(key, value);
	}
};
/**
* In-memory cache.
*/
var MemoryCache = class {
	/**
	* Data.
	*/
	namespaces;
	/**
	* Create a new in-memory cache.
	*/
	constructor() {
		this.namespaces = /* @__PURE__ */ new Map();
	}
	async get(namespace, key) {
		if (typeof namespace !== "string") throw new Error("`namespace` must be a string");
		if (typeof key !== "string") throw new Error("`key` must be a string");
		const namespaceCache = this.namespaces.get(namespace);
		if (typeof namespaceCache === "undefined") return [void 0, 0];
		return namespaceCache.get(key);
	}
	set(namespace, key, value, ttl) {
		if (typeof namespace !== "string") throw new Error("`namespace` must be a string");
		if (typeof key !== "string") throw new Error("`key` must be a string");
		const namespaceCache = this.namespaces.get(namespace) ?? new Bucket();
		namespaceCache.set(key, value, ttl);
		this.namespaces.set(namespace, namespaceCache);
	}
};
//#endregion
export { MemoryCache };
