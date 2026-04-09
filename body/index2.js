//#region index.js
/**
* Read the body of a
* [web stream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).
*
* @param stream
*   Stream.
* @param options
*   Configuration (required).
* @returns
*   Promise that resolves to a concatenated body.
*/
async function readBodyWeb(stream, options) {
	const limit = options?.limit ?? 1048576;
	const length = options?.expectedLength ?? void 0;
	if (typeof limit !== "number" || limit < 0 || Number.isNaN(limit)) return Promise.reject(/* @__PURE__ */ new Error("Unexpected value `" + limit + "` for `options.limit`, expected positive number"));
	if (length !== void 0 && (typeof length !== "number" || length < 0 || Number.isNaN(length))) return Promise.reject(/* @__PURE__ */ new Error("Unexpected value `" + length + "` for `options.expectedLength`, expected positive number"));
	if (length !== void 0 && length > limit) return Promise.reject(/* @__PURE__ */ new Error("Cannot read stream whose expected length exceeds limit"));
	const controller = new AbortController();
	const timeout = setTimeout(function() {
		controller.abort(/* @__PURE__ */ new Error("Cannot read stream, did not receive data in time limit"));
	}, 100);
	const decoder = new TextDecoder("utf-8");
	let buffer = "";
	let received = 0;
	let written = false;
	await stream.pipeTo(new WritableStream({ write(chunk) {
		if (!written) {
			clearTimeout(timeout);
			written = true;
		}
		received += chunk.byteLength;
		if (received > limit) throw new Error("Cannot read stream that exceeds limit");
		buffer += decoder.decode(chunk, { stream: true });
	} }), { signal: controller.signal });
	if (!written) throw new Error("Cannot read stream, did not receive data");
	if (length !== void 0 && received !== length) throw new Error("Cannot read stream whose length does not match expected length");
	buffer += decoder.decode();
	return buffer;
}
/**
* Read the body of a Node.js stream.
*
* @param stream
*   Stream.
* @param options
*   Configuration (optional).
* @returns
*   Promise that resolves to a concatenated body.
*/
async function readBody(stream, options) {
	const limit = options?.limit ?? 1048576;
	const length = options?.expectedLength ?? void 0;
	const decoder = new TextDecoder("utf-8");
	let buffer = "";
	let complete = false;
	let received = 0;
	if (typeof limit !== "number" || limit < 0 || Number.isNaN(limit)) return Promise.reject(/* @__PURE__ */ new Error("Unexpected value `" + limit + "` for `options.limit`, expected positive number"));
	if (length !== void 0 && (typeof length !== "number" || length < 0 || Number.isNaN(length))) return Promise.reject(/* @__PURE__ */ new Error("Unexpected value `" + length + "` for `options.expectedLength`, expected positive number"));
	if (typeof stream.on !== "function") return Promise.reject(/* @__PURE__ */ new Error("Unexpected value `" + stream.on + "` for `stream.on`, expected function"));
	if (typeof stream.removeListener !== "function") return Promise.reject(/* @__PURE__ */ new Error("Unexpected value `" + stream.removeListener + "` for `stream.removeListener`, expected function"));
	if (typeof stream.readable !== "undefined" && !stream.readable) return Promise.reject(/* @__PURE__ */ new Error("Cannot read unreadable stream"));
	if (length !== void 0 && length > limit) return Promise.reject(/* @__PURE__ */ new Error("Cannot read stream whose expected length exceeds limit"));
	return new Promise((resolve, reject) => {
		if (typeof stream.on === "function") {
			stream.on("aborted", onAborted);
			stream.on("close", cleanup);
			stream.on("data", onData);
			stream.on("end", onEnd);
			stream.on("error", onEnd);
		}
		function done(err, buffer) {
			if (complete) return;
			complete = true;
			cleanup();
			if (typeof err !== "undefined") reject(err);
			else if (buffer !== null && buffer !== void 0) {
				buffer += decoder.decode();
				resolve(buffer);
			}
		}
		function onAborted() {
			done(/* @__PURE__ */ new Error("Cannot read aborted stream"));
		}
		function onData(chunk) {
			received += chunk.length;
			if (received > limit) done(/* @__PURE__ */ new Error("Cannot read stream that exceeds limit"));
			else buffer += decoder.decode(chunk, { stream: true });
		}
		function onEnd(err) {
			if (err) return done(err);
			if (length !== void 0 && received !== length) done(/* @__PURE__ */ new Error("Cannot read stream whose length does not match expected length"));
			else done(void 0, buffer);
		}
		function cleanup() {
			buffer = "";
			if (typeof stream.removeListener === "function") {
				stream.removeListener("aborted", onAborted);
				stream.removeListener("data", onData);
				stream.removeListener("end", onEnd);
				stream.removeListener("error", onEnd);
				stream.removeListener("close", cleanup);
			}
		}
		setTimeout(() => {
			if (received === 0) done(/* @__PURE__ */ new Error("Cannot read stream, did not receive data in time limit"));
		}, 100);
	});
}
//#endregion
export { readBody, readBodyWeb };
