import type { SensitiveInfoEntity } from "@arcjet/analyze";
import type { ArcjetSensitiveInfoType } from "arcjet";

/**
 * Every sensitive info type the Rampart backend can detect:
 * `"EMAIL"`, `"PHONE_NUMBER"`, `"IP_ADDRESS"`, `"CREDIT_CARD_NUMBER"`, `"URL"`,
 * `"SSN"`, `"GIVEN_NAME"`, `"SURNAME"`, `"TAX_ID"`, `"BANK_ACCOUNT"`,
 * `"ROUTING_NUMBER"`, `"GOVERNMENT_ID"`, `"PASSPORT"`, `"DRIVERS_LICENSE"`,
 * `"BUILDING_NUMBER"`, `"STREET_NAME"`, `"SECONDARY_ADDRESS"`, `"CITY"`,
 * `"STATE"`, and `"ZIP_CODE"`.
 *
 * These are all built-in {@linkcode ArcjetSensitiveInfoType} values, so they
 * can be passed directly to `sensitiveInfo({ deny: [...] })` without a generic.
 * Handy for denying (or allowing) everything Rampart knows about:
 *
 * ```ts
 * import { rampart, rampartEntities } from "@arcjet/sensitive-info-rampart";
 *
 * sensitiveInfo({ deny: rampartEntities, backend: rampart() });
 * ```
 */
export const rampartEntities: ReadonlyArray<ArcjetSensitiveInfoType> = [
  "EMAIL",
  "PHONE_NUMBER",
  "IP_ADDRESS",
  "CREDIT_CARD_NUMBER",
  "URL",
  "SSN",
  "GIVEN_NAME",
  "SURNAME",
  "TAX_ID",
  "BANK_ACCOUNT",
  "ROUTING_NUMBER",
  "GOVERNMENT_ID",
  "PASSPORT",
  "DRIVERS_LICENSE",
  "BUILDING_NUMBER",
  "STREET_NAME",
  "SECONDARY_ADDRESS",
  "CITY",
  "STATE",
  "ZIP_CODE",
];

/**
 * Map a raw label produced by the Rampart model (or a recognizer) to the
 * matching {@linkcode ArcjetSensitiveInfoType}.
 *
 * The model emits labels in its own naming (`PHONE`, `CREDIT_CARD`); this aligns
 * them to the names Arcjet already uses (`PHONE_NUMBER`, `CREDIT_CARD_NUMBER`)
 * so that, for example, `deny: ["PHONE_NUMBER"]` works the same regardless of
 * backend. Keys are upper-cased and stripped of any BIO prefix before lookup.
 */
const labelAliases: Record<string, ArcjetSensitiveInfoType> = {
  // Aligned to the four types the default backend also detects.
  EMAIL: "EMAIL",
  EMAIL_ADDRESS: "EMAIL",
  PHONE: "PHONE_NUMBER",
  PHONE_NUMBER: "PHONE_NUMBER",
  IP: "IP_ADDRESS",
  IP_ADDRESS: "IP_ADDRESS",
  CREDIT_CARD: "CREDIT_CARD_NUMBER",
  CREDIT_CARD_NUMBER: "CREDIT_CARD_NUMBER",
  // Rampart-specific types.
  URL: "URL",
  SSN: "SSN",
  GIVEN_NAME: "GIVEN_NAME",
  SURNAME: "SURNAME",
  TAX_ID: "TAX_ID",
  BANK_ACCOUNT: "BANK_ACCOUNT",
  ROUTING_NUMBER: "ROUTING_NUMBER",
  GOVERNMENT_ID: "GOVERNMENT_ID",
  PASSPORT: "PASSPORT",
  DRIVERS_LICENSE: "DRIVERS_LICENSE",
  BUILDING_NUMBER: "BUILDING_NUMBER",
  STREET_NAME: "STREET_NAME",
  SECONDARY_ADDRESS: "SECONDARY_ADDRESS",
  CITY: "CITY",
  STATE: "STATE",
  ZIP_CODE: "ZIP_CODE",
  ZIP: "ZIP_CODE",
  POSTAL_CODE: "ZIP_CODE",
};

/**
 * Normalize a raw model/recognizer label to an {@linkcode ArcjetSensitiveInfoType}.
 *
 * @param label
 *   Raw label (such as `"B-GIVEN_NAME"` or `"phone"`).
 * @returns
 *   The matching Arcjet type, or `undefined` when the label is `O` (outside) or
 *   otherwise unknown.
 */
export function normalizeLabel(
  label: string,
): ArcjetSensitiveInfoType | undefined {
  // Strip a leading BIO tag (`B-`, `I-`, `L-`, `U-`, `E-`, `S-`).
  const stripped = label.replace(/^[biluest]-/i, "").toUpperCase();
  if (stripped === "O" || stripped === "") {
    return undefined;
  }

  return labelAliases[stripped];
}

/**
 * Convert an Arcjet sensitive info type to the analyze-wasm tagged union used in
 * detection results.
 *
 * The four types the WebAssembly engine understands map to their native tag;
 * every other type is carried as `{ tag: "custom", val }`. This is purely the
 * internal wire form — `arcjet` turns it back into the plain string (such as
 * `"GIVEN_NAME"`) before it reaches user code. It is the inverse of
 * {@linkcode fromAnalyzeEntity}.
 *
 * @param type
 *   Arcjet sensitive info type.
 * @returns
 *   Tagged entity for an analyze detection result.
 */
export function toAnalyzeEntity(
  type: ArcjetSensitiveInfoType,
): SensitiveInfoEntity {
  switch (type) {
    case "EMAIL":
      return { tag: "email" };
    case "PHONE_NUMBER":
      return { tag: "phone-number" };
    case "IP_ADDRESS":
      return { tag: "ip-address" };
    case "CREDIT_CARD_NUMBER":
      return { tag: "credit-card-number" };
    default:
      return { tag: "custom", val: type };
  }
}

/**
 * Convert an analyze-wasm tagged entity back to its Arcjet type string.
 *
 * @param entity
 *   Tagged entity (from the allow/deny configuration or a detection result).
 * @returns
 *   Arcjet sensitive info type.
 */
export function fromAnalyzeEntity(
  entity: SensitiveInfoEntity,
): ArcjetSensitiveInfoType {
  if (entity.tag === "email") return "EMAIL";
  if (entity.tag === "phone-number") return "PHONE_NUMBER";
  if (entity.tag === "ip-address") return "IP_ADDRESS";
  if (entity.tag === "credit-card-number") return "CREDIT_CARD_NUMBER";
  return entity.val as ArcjetSensitiveInfoType;
}
