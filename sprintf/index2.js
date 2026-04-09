//#region index.js
function bigintReplacer(key, value) {
	if (typeof value === "bigint") return "[BigInt]";
	return value;
}
function tryStringify(o) {
	try {
		return JSON.stringify(o, bigintReplacer);
	} catch {
		return `"[Circular]"`;
	}
}
const PERCENT_CODE = 37;
const LOWERCASE_D_CODE = 100;
const LOWERCASE_F_CODE = 102;
const LOWERCASE_I_CODE = 105;
const UPPERCASE_O_CODE = 79;
const LOWERCASE_O_CODE = 111;
const LOWERCASE_J_CODE = 106;
const LOWERCASE_S_CODE = 115;
/**
* Format a string with placeholders using the provided arguments.
*
* @param template
*   Template.
* @param values
*   Values to interpolate.
* @returns
*   Formatted string.
*/
function sprintf(template, ...values) {
	if (typeof template !== "string") throw new TypeError("First argument must be a string");
	if (values.length === 0) return template;
	let output = "";
	let valueIndex = 0;
	let lastPosition = -1;
	for (let index = 0; index < template.length;) {
		if (template.charCodeAt(index) === PERCENT_CODE && index + 1 < template.length) {
			lastPosition = lastPosition > -1 ? lastPosition : 0;
			switch (template.charCodeAt(index + 1)) {
				case LOWERCASE_D_CODE:
				case LOWERCASE_F_CODE: {
					if (valueIndex >= values.length) break;
					const value = values[valueIndex];
					if (typeof value !== "number") break;
					if (lastPosition < index) output += template.slice(lastPosition, index);
					output += value;
					lastPosition = index + 2;
					index++;
					break;
				}
				case LOWERCASE_I_CODE: {
					if (valueIndex >= values.length) break;
					const value = values[valueIndex];
					if (typeof value !== "number") break;
					if (lastPosition < index) output += template.slice(lastPosition, index);
					output += Math.floor(value);
					lastPosition = index + 2;
					index++;
					break;
				}
				case UPPERCASE_O_CODE:
				case LOWERCASE_O_CODE:
				case LOWERCASE_J_CODE: {
					if (valueIndex >= values.length) break;
					const value = values[valueIndex];
					if (value === void 0) break;
					if (lastPosition < index) output += template.slice(lastPosition, index);
					if (typeof value === "string") {
						output += `'${value}'`;
						lastPosition = index + 2;
						index++;
						break;
					}
					if (typeof value === "bigint") {
						output += `"[BigInt]"`;
						lastPosition = index + 2;
						index++;
						break;
					}
					if (typeof value === "function") {
						output += value.name || "<anonymous>";
						lastPosition = index + 2;
						index++;
						break;
					}
					output += tryStringify(value);
					lastPosition = index + 2;
					index++;
					break;
				}
				case LOWERCASE_S_CODE: {
					if (valueIndex >= values.length) break;
					const value = values[valueIndex];
					if (typeof value !== "string") break;
					if (lastPosition < index) output += template.slice(lastPosition, index);
					output += value;
					lastPosition = index + 2;
					index++;
					break;
				}
				case PERCENT_CODE:
					if (lastPosition < index) output += template.slice(lastPosition, index);
					output += "%";
					lastPosition = index + 2;
					index++;
					valueIndex--;
					break;
			}
			++valueIndex;
		}
		++index;
	}
	if (lastPosition === -1) return template;
	if (lastPosition < template.length) output += template.slice(lastPosition);
	return output;
}
//#endregion
export { sprintf as default, sprintf };
