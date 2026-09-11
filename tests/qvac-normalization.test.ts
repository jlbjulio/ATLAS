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
      country: "Panama",
      city: null,
      modality: "CT",
      brand: null,
      minimum_age_years: 7,
      maximum_age_years: null,
      maximum_confidence: null,
      installation_year_min: null,
      status: null,
      exclude_confirmed: false,
      stale_only: false,
      limit: 100,
    });
  });

  it("returns clean filters for a count question even when the model invents data", () => {
    const result = normalizeInventoryFilters(
      {
        modality: "cuantos equipos",
        brand: "hoy",
        minimum_age_years: 18,
        stale_only: true,
        limit: 10,
      },
      "cuantos equipos hay?",
    );

    expect(result).toMatchObject({
      country: null,
      modality: null,
      brand: null,
      minimum_age_years: null,
      maximum_age_years: null,
      exclude_confirmed: false,
      stale_only: false,
      limit: 100,
    });
  });

  it("maps renewal questions to the seven-year threshold without invented brands", () => {
    const result = normalizeInventoryFilters(
      {
        country: "Colombia",
        modality: "Oportunidades de renovación en Colombia",
        brand: "Colombia",
        minimum_age_years: 18,
      },
      "Oportunidades de renovación en Colombia",
    );

    expect(result).toMatchObject({
      country: "Colombia",
      modality: null,
      brand: null,
      minimum_age_years: 7,
    });
  });

  it("normalizes country aliases and modality synonyms from the question", () => {
    const result = normalizeInventoryFilters(
      { country: "Brasil", modality: "resonadores", minimum_age_years: 5 },
      "Clientes en Brasil con resonadores de más de siete años",
    );

    expect(result).toMatchObject({
      country: "Brazil",
      modality: "MR",
      minimum_age_years: 7,
    });
  });

  it("extracts confidence, installation year and unconfirmed filters", () => {
    expect(
      normalizeInventoryFilters(
        { maximum_confidence: 0.3 },
        "Equipos con confianza menor al 70%",
      ).maximum_confidence,
    ).toBe(0.7);

    expect(
      normalizeInventoryFilters(
        {},
        "Resonadores instalados después de 2020",
      ),
    ).toMatchObject({ modality: "MR", installation_year_min: 2021 });

    expect(
      normalizeInventoryFilters(
        { status: "Reportado" },
        "Equipos reportados sin confirmar",
      ),
    ).toMatchObject({ status: null, exclude_confirmed: true });
  });

  it("keeps known brands and rejects unknown ones", () => {
    expect(
      normalizeInventoryFilters(
        { brand: "Philips" },
        "Tomógrafos NovaMed con más de 10 años",
      ),
    ).toMatchObject({ modality: "CT", brand: "NovaMed", minimum_age_years: 10 });

    expect(
      normalizeInventoryFilters({ brand: "Philips" }, "Tomógrafos con más de 10 años"),
    ).toMatchObject({ brand: null });
  });
});
