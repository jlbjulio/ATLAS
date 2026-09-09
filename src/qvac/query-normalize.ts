export type InventoryFilters = {
  customer: string | null;
  country: string | null;
  city: string | null;
  modality: string | null;
  brand: string | null;
  minimum_age_years: number | null;
  maximum_age_years: number | null;
  status: "Confirmado" | "Reportado" | "Estimado" | "Desconocido" | null;
  stale_only: boolean;
  limit: number;
};

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function optional(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || ["any", "all", "todos", "cualquiera", "null"].includes(plain(cleaned))) {
    return null;
  }
  return cleaned;
}

function modality(value: unknown): string | null {
  const cleaned = optional(value);
  if (!cleaned) return null;
  const key = plain(cleaned);
  if (/\b(ct|tomograf)/.test(key)) return "CT";
  if (/\b(mr|mri|resonancia)/.test(key)) return "MR";
  if (/\b(us|ultrasound|ultrason|ecograf)/.test(key)) return "Ultrasound";
  return cleaned;
}

export function normalizeInventoryFilters(
  raw: Record<string, unknown>,
  question: string,
): InventoryFilters {
  const source = plain(question);
  let customer = optional(raw.customer);
  const country = optional(raw.country);
  let city = optional(raw.city);

  if (customer && !/hospital|clinic|clinica|centro|medical center/.test(plain(customer))) {
    customer = null;
  }
  if (customer && country && plain(customer) === plain(country)) {
    customer = null;
  }
  if (city && country && plain(city) === plain(country) && !/ciudad de|city/.test(source)) {
    city = null;
  }

  const minimum = typeof raw.minimum_age_years === "number" ? raw.minimum_age_years : null;
  const maximum = typeof raw.maximum_age_years === "number" ? raw.maximum_age_years : null;
  const asksMaximum = /menos de|hasta|maxim|younger than|under /.test(source);
  const asksStatus = /confirmad|reportad|estimad|desconocid|unknown|confirmed|reported|estimated/.test(source);
  const asksStale = /desactualiz|sin verificar|vencid|stale|outdated|not verified/.test(source);

  return {
    customer,
    country,
    city,
    modality: modality(question) ?? modality(raw.modality),
    brand: optional(raw.brand),
    minimum_age_years: minimum !== null && minimum <= 100 ? minimum : null,
    maximum_age_years:
      asksMaximum && maximum !== null && maximum <= 100 ? maximum : null,
    status: asksStatus ? (raw.status as InventoryFilters["status"]) : null,
    stale_only: asksStale && raw.stale_only === true,
    limit:
      typeof raw.limit === "number" && raw.limit >= 1 && raw.limit <= 500
        ? Math.trunc(raw.limit)
        : 100,
  };
}
