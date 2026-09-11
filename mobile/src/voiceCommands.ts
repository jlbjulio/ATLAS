export type VoiceCommandFields = {
  client?: string;
  city?: string;
  country?: string;
  note?: string;
};

const CLIENT_KEYWORDS = "(?:cliente)";
const FACILITY_KEYWORDS = "(?:hospital|clínica|clinica|centro)";
const CITY_KEYWORDS = "(?:ciudad|ubicación|ubicacion)";
const COUNTRY_KEYWORDS = "(?:país|pais)";
const NOTE_KEYWORDS =
  "(?:observación|observacion|nota|evidencia|detalle|descripción|descripcion)";
const ALL_KEYWORDS = [
  "cliente",
  "hospital",
  "clínica",
  "clinica",
  "centro",
  "ciudad",
  "ubicación",
  "ubicacion",
  "país",
  "pais",
  "observación",
  "observacion",
  "nota",
  "evidencia",
  "detalle",
  "descripción",
  "descripcion",
].join("|");

function matchBlock(text: string, keyword: string): RegExpMatchArray | null {
  return text.match(
    new RegExp(
      `${keyword}\\s*[,:]?\\s*(.+?)(?=\\s*(?:${ALL_KEYWORDS}|[,;.]|$))`,
      "i",
    ),
  );
}

/**
 * Fills the observation form from dictated commands such as
 * "Cliente Hospital San Juan, Ciudad Panamá, Observación vi un tomógrafo".
 * Text without a recognized command returns an empty result so the caller can
 * append it to the observation as free dictation.
 */
export function parseVoiceCommands(text: string): VoiceCommandFields {
  const fields: VoiceCommandFields = {};

  const explicitClient = matchBlock(text, CLIENT_KEYWORDS);
  if (explicitClient?.[1]) {
    fields.client = explicitClient[1].trim();
  } else {
    // "Hospital San Juan" without the "Cliente" command keeps the full name.
    const facilityClient = text.match(
      new RegExp(
        `^\\s*${FACILITY_KEYWORDS}\\s*(.+?)(?=\\s*(?:${ALL_KEYWORDS}|[,;.]|$))`,
        "i",
      ),
    );
    if (facilityClient?.[0]) {
      fields.client = facilityClient[0].trim();
    }
  }

  const cityMatch = matchBlock(text, CITY_KEYWORDS);
  if (cityMatch?.[1]) {
    fields.city = cityMatch[1].trim();
  }

  const countryMatch = matchBlock(text, COUNTRY_KEYWORDS);
  if (countryMatch?.[1]) {
    fields.country = countryMatch[1].trim();
  }

  const noteMatch = text.match(
    new RegExp(`${NOTE_KEYWORDS}\\s*[,:]?\\s*(.+)`, "is"),
  );
  if (noteMatch?.[1]) {
    fields.note = noteMatch[1].trim();
  }

  return fields;
}
