import { describe, expect, it } from "vitest";

import { normalizeObservation } from "../src/qvac/normalize.js";
import { normalizeInventoryFilters } from "../src/qvac/query-normalize.js";

describe("QVAC observation normalization", () => {
  it("removes false missing fields and reserves confirmation for the user", () => {
    const result = normalizeObservation({
      client: "Hospital Demo",
      city: "Panama City",
      country: "Panama",
      equipment: [
        {
          modality: "tomógrafo",
          quantity: 1,
          brand: "NovaMed",
          model: "CT-500",
          age_years: 8,
          status: "Confirmado",
          confidence: 0.99,
          notes: "Privacy flag: face",
        },
      ],
      missing_fields: ["brand", "brand", "model"],
      next_question: "What is the serial number?",
    });

    expect(result.equipment[0].status).toBe("Reportado");
    expect(result.equipment[0].modality).toBe("CT");
    expect(result.missing_fields).toEqual(["equipment[0].serial_number"]);
    expect(result.privacy_flags).toEqual([]);
    expect(result.equipment[0].confidence).toBeNull();
    expect(result.equipment[0].notes).toBeNull();
  });
});

describe("inventory-query normalization", () => {
  it("removes invented filters and maps modalities to the dataset vocabulary", () => {
    const result = normalizeInventoryFilters(
      {
        customer: "clientes en Panamá con tomógrafos",
        country: "Panamá",
        city: "Panamá",
        modality: "tomógrafos",
        brand: "any",
        minimum_age_years: 7,
        maximum_age_years: 10_000_000,
        status: "Confirmado",
        stale_only: true,
        limit: 100,
      },
      "clientes en Panamá con tomógrafos de más de siete años",
    );

    expect(result).toEqual({
      customer: null,
      country: "Panamá",
      city: null,
      modality: "CT",
      brand: null,
      minimum_age_years: 7,
      maximum_age_years: null,
      status: null,
      stale_only: false,
      limit: 100,
    });
  });
});
