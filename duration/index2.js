//#region index.js
const second = 1;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const maxUint32 = 4294967295;
const units = new Map([
	["s", second],
	["m", minute],
	["h", hour],
	["d", day]
]);
const integers = [
	"0",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9"
];
function leadingInt(s) {
	let i = 0;
	let x = 0;
	for (; i < s.length; i++) {
		const c = s[i];
		if (!integers.includes(c)) break;
		x = x * 10 + parseInt(c, 10);
		if (x > maxUint32) throw new Error("bad [0-9]*");
	}
	return [x, s.slice(i)];
}
/**
* Parse a duration into a number representing seconds while ensuring the value
* fits within an unsigned 32-bit integer.
*
* If a number is passed it is validated and returned.
*
* If a string is passed it must be in the form of digits followed by a unit.
* Supported units are `s` (seconds),
* `m` (minutes),
* `h` (hours),
* and `d` (days).
*
* @example
*   ```ts
*   console.log(parse("1s")) // => 1
*   console.log(parse("1m")) // => 60
*   console.log(parse("1h")) // => 3600
*   console.log(parse("1d")) // => 86400
*   ```
* @param value
*   Value to parse.
* @returns
*   Parsed seconds.
*/
function parse(value) {
	const original = value;
	if (typeof value === "number") {
		if (value > maxUint32) throw new Error(`invalid duration: ${original}`);
		if (value < 0) throw new Error(`invalid duration: ${original}`);
		if (!Number.isInteger(value)) throw new Error(`invalid duration: ${original}`);
		return value;
	}
	if (typeof value !== "string") throw new Error("can only parse a duration string");
	let d = 0;
	if (value === "0") return 0;
	if (value === "") throw new Error(`invalid duration: ${original}`);
	while (value !== "") {
		let v = 0;
		if (!integers.includes(value[0])) throw new Error(`invalid duration: ${original}`);
		[v, value] = leadingInt(value);
		if (value !== "" && value[0] == ".") throw new Error(`unsupported decimal duration: ${original}`);
		let i = 0;
		for (; i < value.length; i++) {
			const c = value[i];
			if (integers.includes(c)) break;
		}
		if (i == 0) throw new Error(`missing unit in duration: ${original}`);
		const u = value.slice(0, i);
		value = value.slice(i);
		const unit = units.get(u);
		if (typeof unit === "undefined") throw new Error(`unknown unit "${u}" in duration ${original}`);
		if (v > maxUint32 / unit) throw new Error(`invalid duration ${original}`);
		v *= unit;
		d += v;
		if (d > maxUint32) throw new Error(`invalid duration ${original}`);
	}
	return d;
}
//#endregion
export { parse };
