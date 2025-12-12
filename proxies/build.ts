import fs from "node:fs/promises";

/**
 * Google IP prefix info.
 */
interface GooglePrefixBaseFields {
  /**
   * Region.
   */
  scope?: GoogleScope | "global";
  /**
   * Service.
   */
  service?: GoogleService;
}

/**
 * Google IPv4 prefix info.
 */
interface GooglePrefixIpv4 extends GooglePrefixBaseFields {
  /**
   * CIDR range.
   */
  ipv4Prefix: string;
}

/**
 * Google IPv6 prefix info.
 */
interface GooglePrefixIpv6 extends GooglePrefixBaseFields {
  /**
   * CIDR range.
   */
  ipv6Prefix: string;
}

/**
 * Google IP ranges response.
 */
interface GoogleResponse {
  /**
   * Sync token.
   */
  syncToken: string;
  /**
   * Creation date.
   */
  createDate: string;
  /**
   * List of IP prefixes.
   */
  prefixes: ReadonlyArray<GooglePrefixIpv4 | GooglePrefixIpv6>;
}

/**
 * Google region.
 */
type GoogleScope =
  | "africa-south1"
  | `asia-east${1 | 2}`
  | `asia-northeast${1 | 2 | 3}`
  | `asia-south${1 | 2}`
  | `asia-southeast${1 | 2 | 3}`
  | `australia-southeast${1 | 2}`
  | "europe-central2"
  | `europe-north${1 | 2}`
  | "europe-southwest1"
  | `europe-west${1 | 2 | 3 | 4 | 6 | 8 | 9 | 10 | 12 | 15}`
  | `me-central${1 | 2}`
  | "me-west1"
  | `northamerica-northeast${1 | 2}`
  | "northamerica-south1"
  | "southamerica-east1"
  | "southamerica-west1"
  | `us-central${1 | 2}`
  | `us-east${1 | 4 | 5 | 7}`
  | "us-south1"
  | `us-west${1 | 2 | 3 | 4 | 8}`;

/**
 * Google service.
 */
type GoogleService = "Google Cloud";

const [cloudflareIpv4, cloudflareIpv6] = await Promise.all(
  [
    "https://www.cloudflare.com/ips-v4/",
    "https://www.cloudflare.com/ips-v6/",
  ].map(async function (url) {
    const response = await fetch(url);
    const body = await response.text();
    return body.trim().split("\n");
  }),
);
const cloudflare = [...cloudflareIpv4, ...cloudflareIpv6].toSorted();

const googleResponse = await fetch(
  "https://www.gstatic.com/ipranges/goog.json",
);
const googleBody = (await googleResponse.json()) as GoogleResponse;
const google = googleBody.prefixes
  .map(function (d) {
    return "ipv4Prefix" in d ? d.ipv4Prefix : d.ipv6Prefix;
  })
  .toSorted();

const metadata = [
  {
    description:
      "IP addresses from Cloudflare in CIDR notation;\nfrom <https://www.cloudflare.com/ips-v4/> and <https://www.cloudflare.com/ips-v6/>.",
    identifier: "cloudflare",
    values: cloudflare,
  },
  {
    description:
      "IP addresses from Google in CIDR notation;\nfrom <https://www.gstatic.com/ipranges/goog.json>.",
    identifier: "google",
    values: google,
  },
];

const lines: Array<string> = [];

for (const d of metadata) {
  lines.push(
    "/**",
    " * " + d.description.replace(/\n/g, "\n * "),
    " */",
    "export const " +
      d.identifier +
      ": ReadonlyArray<string> = " +
      JSON.stringify(d.values, undefined, 2) +
      ";",
  );

  lines.push("");
}

await fs.writeFile("index.ts", lines.join("\n"));
