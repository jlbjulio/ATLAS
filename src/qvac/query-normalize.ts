import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type InventoryFilters = {
  customer: string | null;
  country: string | null;
  city: string | null;
  modality: string | null;
  brand: string | null;
  minimum_age_years: number | null;
  maximum_age_years: number | null;
  maximum_confidence: number | null;
  installation_year_min: number | null;
  status: "Confirmado" | "Reportado" | "Estimado" | "Desconocido" | null;
  exclude_confirmed: boolean;
  stale_only: boolean;
  limit: number;
};

type ReferenceValues = {
  values: Record<string, Array<{ value: string }>>;
};

const reference = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../../config/reference-values.json"),
    "utf8",
  ),
) as ReferenceValues;

const BRANDS = reference.values.brand.map((item) => item.value);

const COUNTRY_ALIASES: Record<string, string> = {
  panama: "Panama",
  colombia: "Colombia",
  brasil: "Brazil",
  brazil: "Brazil",
  mexico: "Mexico",
  peru: "Peru",
  chile: "Chile",
  argentina: "Argentina",
  ecuador: "Ecuador",
  "costa rica": "Costa Rica",
  "republica dominicana": "Dominican Republic",
  "dominican republic": "Dominican Republic",
};

const STATUS_BY_QUESTION: Array<[RegExp, InventoryFilters["status"]]> = [
  [/\bconfirmad/, "Confirmado"],
  [/\breportad/, "Reportado"],
  [/\bestimad/, "Estimado"],
  [/\bdesconocid/, "Desconocido"],
];

const SPANISH_NUMBERS: Record<string, number> = {
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
};

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const PLACEHOLDER_WORDS = [
  "any",
  "all",
  "todo",
  "todos",
  "toda",
  "todas",
  "cualquiera",
  "cualquier",
  "null",
  "ningun",
  "ninguno",
  "ninguna",
  "nulo",
];

function optional(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const words = plain(cleaned)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0 && words.every((word) => PLACEHOLDER_WORDS.includes(word))) {
    return null;
  }
  return cleaned;
}

function modalityFromText(text: string): string | null {
  const key = plain(text);
  if (/\b(mr|mri|resonancia|resonador|resonadores|magnet)/.test(key)) return "MR";
  if (/\b(ct|tomograf|tomografo|tomografos|scanner)/.test(key)) return "CT";
  if (/\b(ultrasound|ultrasonido|ultrason|ecograf|ecografo|ecografia)/.test(key)) {
    return "Ultrasound";
  }
  if (/\b(x-?ray|rayos x|radiograf)/.test(key)) return "X-Ray";
  return null;
}

function brandFromText(text: string): string | null {
  const key = plain(text);
  for (const brand of BRANDS) {
    const brandKey = plain(brand);
    const token = brandKey.split(" ")[0];
    if (key.includes(brandKey) || (token.length > 4 && key.includes(token))) {
      return brand;
    }
  }
  return null;
}

function inQuestion(question: string, value: string | null): boolean {
  if (!value) return false;
  const key = plain(value);
  return key.length >= 3 && plain(question).includes(key);
}

function countryFromText(text: string): string | null {
  const key = plain(text);
  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(key)) return country;
  }
  return null;
}

function numberFromText(value: string): number | null {
  const digits = value.match(/\d+/)?.[0];
  if (digits) return Number(digits);
  for (const [word, number] of Object.entries(SPANISH_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(plain(value))) return number;
  }
  return null;
}

function ageFilterFromText(
  text: string,
): { minimum: number | null; maximum: number | null } {
  const key = plain(text);
  const lessMatch = key.match(
    /(?:menos de|hasta|maxim\w*)\s+([a-z0-9]+)\s*(?:anos|age)?/,
  );
  const moreMatch = key.match(
    /(?:mas de|mayor\w* de|encima de|superior\w* a|mas viejo\w* que)\s+([a-z0-9]+)\s*(?:anos)?/,
  );
  return {
    minimum: moreMatch?.[1] ? numberFromText(moreMatch[1]) : null,
    maximum: lessMatch?.[1] ? numberFromText(lessMatch[1]) : null,
  };
}

function confidenceFromText(text: string): number | null {
  const key = plain(text);
  const explicit = key.match(
    /confianza\s+(?:menor|inferior|bajo|baja|por debajo|menos)(?:\s+(?:al?|de|que))?\s*(\d{1,3})\s*%?/,
  );
  const percentMatch = key.match(
    /(?:menor|inferior|bajo|baja|por debajo|menos)(?:\s+(?:al?|de|que))?\s*(\d{1,3})\s*%/,
  );
  const rawPercent = explicit?.[1] ?? percentMatch?.[1];
  if (!rawPercent) return null;
  const percent = Number(rawPercent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;
  return percent / 100;
}

function hasNumber(text: string): boolean {
  if (/\d/.test(text)) return true;
  const key = plain(text);
  return Object.keys(SPANISH_NUMBERS).some((word) =>
    new RegExp(`\\b${word}\\b`).test(key),
  );
}

function installationYearFromText(text: string): number | null {
  const key = plain(text);
  const afterMatch = key.match(
    /instalad\w*\s+(?:despues|posterior\w*)\s+(?:a|al|de)\s+(\d{4})/,
  );
  if (afterMatch?.[1]) return Number(afterMatch[1]) + 1;
  const fromMatch = key.match(/(?:desde|a partir de)\s+(\d{4})/);
  if (fromMatch?.[1]) return Number(fromMatch[1]);
  const exactMatch = key.match(/instalad\w*\s+(?:en\s+)?(\d{4})/);
  if (exactMatch?.[1]) return Number(exactMatch[1]);
  return null;
}

export function normalizeInventoryFilters(
  raw: Record<string, unknown>,
  question: string,
): InventoryFilters {
  const source = plain(question);
  // Every filter must be supported by the question text; the model only helps
  // phrase values that the text parser can recognize.
  let customer = optional(raw.customer);
  const country = countryFromText(question);
  let city = optional(raw.city);

  if (customer && !inQuestion(question, customer)) customer = null;
  if (customer && !/hospital|clinic|clinica|centro|medical center/.test(plain(customer))) {
    customer = null;
  }
  if (customer && country && plain(customer) === plain(country)) {
    customer = null;
  }
  if (customer && plain(customer) === source) {
    customer = null;
  }
  if (city && !inQuestion(question, city)) city = null;
  if (city && country && plain(city) === plain(country) && !/ciudad de|city/.test(source)) {
    city = null;
  }

  const textAges = ageFilterFromText(question);
  const asksMaximum = /menos de|hasta|maxim|younger than|under /.test(source);
  const asksRenewal = /renovaci|reemplaz|oportunidad|para cambiar/.test(source);
  const asksCount = /\bcuant\w*\b|how many|total de/.test(source);
  const mentionsAge = /anos|edad|antig|age/.test(source);
  const asksStatus = /confirmad|reportad|estimad|desconocid|unknown|confirmed|reported|estimated/.test(
    source,
  );
  const asksUnconfirmed = /sin confirmar|no confirmad|pendient|por confirmar|unconfirmed/.test(
    source,
  );
  const asksStale = /desactualiz|sin verificar|no verificado|vencid|stale|outdated|not verified/.test(
    source,
  );

  const allowsModelAge = hasNumber(question) && mentionsAge;
  let minimum =
    textAges.minimum ??
    (allowsModelAge && typeof raw.minimum_age_years === "number"
      ? raw.minimum_age_years
      : null);
  let maximum =
    textAges.maximum ??
    (allowsModelAge && typeof raw.maximum_age_years === "number"
      ? raw.maximum_age_years
      : null);

  if (!mentionsAge || asksCount) {
    minimum = null;
    maximum = null;
  }
  if (asksRenewal && minimum === null) minimum = 7;
  if (!asksMaximum) maximum = null;
  if (minimum !== null && (minimum < 0 || minimum > 100)) minimum = null;
  if (maximum !== null && (maximum < 0 || maximum > 100)) maximum = null;

  const questionStatus =
    STATUS_BY_QUESTION.find(([pattern]) => pattern.test(source))?.[1] ?? null;

  const confidence = confidenceFromText(question);

  return {
    customer,
    country,
    city,
    modality: modalityFromText(question),
    brand: brandFromText(question),
    minimum_age_years: minimum,
    maximum_age_years: maximum,
    maximum_confidence: confidence,
    installation_year_min: installationYearFromText(question),
    status: asksUnconfirmed ? null : asksStatus ? questionStatus : null,
    exclude_confirmed: asksUnconfirmed,
    stale_only: asksStale,
    limit: 100,
  };
}
