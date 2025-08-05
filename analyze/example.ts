import { matchFilter } from "./index.ts";

const context = { characteristics: [], log: console };
// Example request object simulating a request to the fastify example, with some cookies that I saw at `document.cookie` in Notion.
const request = {
  cookies:
    "NEXT_LOCALE=en-US; notion_locale=en-US/autodetect; notion_check_cookie_consent=true",
  headers: {
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    connection: "keep-alive",
    dnt: "1",
    host: "localhost:3000",
    purpose: "prefetch",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-ch-ua":
      '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "sec-purpose": "prefetch;prerender",
    "upgrade-insecure-requests": "1",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  },
  host: "localhost:3000",
  ip: "127.0.0.1",
  method: "GET",
  path: "/",
  protocol: "http:",
  query: "",
};

console.log("headers");
console.log(
  await matchFilter(
    context,
    request,
    'lower(http.request.headers["user-agent"]) ~ "chrome"',
  ),
);
console.log(
  await matchFilter(
    context,
    request,
    'lower(http.request.headers["user-agent"]) ~ "firefox"',
  ),
);

console.log("");
console.log("cookie");
console.log(
  await matchFilter(
    context,
    request,
    'http.request.cookie["NEXT_LOCALE"] ~ "en-"',
  ),
);
console.log(
  await matchFilter(
    context,
    request,
    'http.request.cookie["NEXT_LOCALE"] ~ "de-"',
  ),
);
