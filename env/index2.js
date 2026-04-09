//#region index.js
/**
* Detect the platform.
*
* @param environment
*   Environment.
* @returns
*   Name of platform if found.
*/
function platform(environment) {
	if (typeof environment["FIREBASE_CONFIG"] === "string" && environment["FIREBASE_CONFIG"] !== "") return "firebase";
	if (typeof environment["FLY_APP_NAME"] === "string" && environment["FLY_APP_NAME"] !== "") return "fly-io";
	if (typeof environment["VERCEL"] === "string" && environment["VERCEL"] === "1") return "vercel";
	if (typeof environment["RENDER"] === "string" && environment["RENDER"] === "true") return "render";
}
/**
* Check if the environment is development.
*
* @param environment
*   Environment.
* @returns
*   Whether the environment is development.
*/
function isDevelopment(environment) {
	return environment.NODE_ENV === "development" || environment.MODE === "development" || environment.ARCJET_ENV === "development";
}
/**
* Get the log level.
*
* @param environment
*   Environment.
* @returns
*   Log level.
*/
function logLevel(environment) {
	const level = environment["ARCJET_LOG_LEVEL"];
	switch (level) {
		case "debug":
		case "info":
		case "warn":
		case "error": return level;
		default: return "warn";
	}
}
const baseUrlAllowed = [
	"https://decide.arcjet.com",
	"https://decide.arcjettest.com",
	"https://fly.decide.arcjet.com",
	"https://fly.decide.arcjettest.com",
	"https://decide.arcjet.orb.local",
	"https://decide.arcjet.com/",
	"https://decide.arcjettest.com/",
	"https://fly.decide.arcjet.com/",
	"https://fly.decide.arcjettest.com/",
	"https://decide.arcjet.orb.local/"
];
/**
* Get the base URL of an Arcjet API.
*
* @param environment
*   Environment.
* @returns
*   Base URL of Arcjet API.
*/
function baseUrl(environment) {
	if (typeof environment["ARCJET_BASE_URL"] === "string" && baseUrlAllowed.includes(environment["ARCJET_BASE_URL"])) return environment["ARCJET_BASE_URL"];
	if (platform(environment) === "fly-io") return "https://fly.decide.arcjet.com";
	return "https://decide.arcjet.com";
}
//#endregion
export { baseUrl, isDevelopment, logLevel, platform };
