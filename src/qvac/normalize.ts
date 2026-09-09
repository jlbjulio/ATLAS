import type { StructuredObservation } from "./types.js";

function canonicalModality(value: string | null): string | null {
  if (!value) return null;
  const key = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\b(ct|tomograf)/.test(key)) return "CT";
  if (/\b(mr|mri|resonancia)/.test(key)) return "MR";
  if (/\b(us|ultrasound|ultrason|ecograf)/.test(key)) return "Ultrasound";
  return value;
}

export function normalizeObservation(
  value: StructuredObservation,
  options: { hasImage?: boolean } = {},
): StructuredObservation {
  const missing = new Set<string>();
  if (!value.client) missing.add("client");
  if (!value.country) missing.add("country");
  if (!value.city) missing.add("city");
  value.equipment.forEach((item, index) => {
    item.modality = canonicalModality(item.modality);
    if (!item.modality) missing.add(`equipment[${index}].modality`);
    if (!item.quantity) missing.add(`equipment[${index}].quantity`);
    if (!item.serial_number) missing.add(`equipment[${index}].serial_number`);
    if (!item.brand) missing.add(`equipment[${index}].brand`);
    if (!item.model) missing.add(`equipment[${index}].model`);
    if (item.age_years === null && !item.installation_year) {
      missing.add(`equipment[${index}].age_years`);
    }
    if (item.status === "Confirmado") item.status = "Reportado";
    item.confidence = null;
    if (!options.hasImage && item.notes?.toLowerCase().includes("privacy")) {
      item.notes = null;
    }
  });
  return {
    ...value,
    missing_fields: [...missing],
    next_question: missing.size ? value.next_question : null,
    privacy_flags: options.hasImage ? (value.privacy_flags ?? []) : [],
  };
}
