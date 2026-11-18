/**
 * Countries we can ship to, plus address rules (state lists, postal codes).
 * Shared by the browser (form UI) and the server (validation).
 */

// ISO 3166-1 alpha-2 codes.
const ALL_CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  );

/**
 * Destinations we do NOT ship to.
 * - ID: origin country (international store; domestic sales handled separately)
 * - CU, IR, KP, SY: comprehensive sanctions — express carriers do not serve them
 * - RU, BY: major express carriers have suspended service
 * TODO (owner): review this list with your courier when the account is opened.
 */
export const BLOCKED_DESTINATIONS = new Set(["ID", "CU", "IR", "KP", "SY", "RU", "BY"]);

/** Shown first in the country dropdown (primary markets). */
export const PRIORITY_COUNTRIES = ["US", "GB", "DE", "FR", "IT", "AU", "JP", "SG", "MY"];

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export const SHIPPABLE_COUNTRY_CODES = ALL_CODES.filter((c) => !BLOCKED_DESTINATIONS.has(c));

export function isShippableCountry(code: string): boolean {
  return SHIPPABLE_COUNTRY_CODES.includes(code);
}

export function countryOptions(): { code: string; name: string }[] {
  const rest = SHIPPABLE_COUNTRY_CODES.filter((c) => !PRIORITY_COUNTRIES.includes(c))
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...PRIORITY_COUNTRIES.map((code) => ({ code, name: countryName(code) })), ...rest];
}

/* -------------------------- States / provinces -------------------------- */

export const STATES: Record<string, { code: string; name: string }[]> = {
  US: [
    ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
    ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
    ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
    ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
    ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
    ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
    ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
    ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
    ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
    ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ].map(([code, name]) => ({ code, name })),
  CA: [
    ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"], ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"], ["NT", "Northwest Territories"], ["NU", "Nunavut"],
    ["ON", "Ontario"], ["PE", "Prince Edward Island"], ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
  ].map(([code, name]) => ({ code, name })),
  AU: [
    ["ACT", "Australian Capital Territory"], ["NSW", "New South Wales"], ["NT", "Northern Territory"],
    ["QLD", "Queensland"], ["SA", "South Australia"], ["TAS", "Tasmania"], ["VIC", "Victoria"], ["WA", "Western Australia"],
  ].map(([code, name]) => ({ code, name })),
};

/** Countries where a free-text state/province/prefecture is required by couriers. */
const STATE_REQUIRED_TEXT = new Set(["JP", "MY", "IN", "BR", "MX", "CN", "AR", "IT"]);

export function stateRequirement(country: string): "select" | "required" | "optional" {
  if (STATES[country]) return "select";
  if (STATE_REQUIRED_TEXT.has(country)) return "required";
  return "optional";
}

export function stateLabel(country: string): string {
  if (country === "US") return "State";
  if (country === "JP") return "Prefecture";
  if (country === "GB" || country === "IE") return "County";
  if (country === "IT") return "Province";
  return "State / Province";
}

/* ------------------------------ Postal codes ----------------------------- */

const POSTAL_PATTERNS: Record<string, RegExp> = {
  US: /^\d{5}(-\d{4})?$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
  CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
  DE: /^\d{5}$/,
  FR: /^\d{5}$/,
  IT: /^\d{5}$/,
  ES: /^\d{5}$/,
  MY: /^\d{5}$/,
  KR: /^\d{5}$/,
  AU: /^\d{4}$/,
  NZ: /^\d{4}$/,
  AT: /^\d{4}$/,
  BE: /^\d{4}$/,
  CH: /^\d{4}$/,
  DK: /^\d{4}$/,
  NO: /^\d{4}$/,
  NL: /^\d{4}\s?[A-Z]{2}$/i,
  SE: /^\d{3}\s?\d{2}$/,
  JP: /^\d{3}-?\d{4}$/,
  SG: /^\d{6}$/,
  IN: /^\d{6}$/,
  CN: /^\d{6}$/,
};

/** Countries without (mandatory) postal codes. */
const NO_POSTAL = new Set(
  "AE AG AO AW BF BI BJ BO BS BW BZ CD CF CG CI CK CM DJ DM ER FJ GA GD GH GM GQ GY HK IE KI KM KN LC ML MO MR MW NR NU QA RW SB SC SL SR ST TD TG TK TL TO TT TV UG VU YE ZW".split(" "),
);

export function postalRequired(country: string): boolean {
  return !NO_POSTAL.has(country);
}

export function isValidPostalCode(country: string, postal: string): boolean {
  const value = postal.trim();
  if (!value) return !postalRequired(country);
  const pattern = POSTAL_PATTERNS[country];
  return pattern ? pattern.test(value) : /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/.test(value);
}

export function postalLabel(country: string): string {
  if (country === "US") return "ZIP code";
  if (country === "GB") return "Postcode";
  return "Postal code";
}
