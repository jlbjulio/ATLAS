export type EquipmentStatus = "Confirmado" | "Reportado" | "Estimado" | "Desconocido";

export type EquipmentDraft = {
  modality: string;
  brand: string | null;
  model: string | null;
  ageYears: number | null;
  quantity: number;
  confidence: number;
  status: EquipmentStatus;
};

export type Extraction = {
  equipments: EquipmentDraft[];
  missingFields: string[];
  nextQuestion: string | null;
  confidence: number;
};

export type LocalObservation = {
  id: string;
  client: string;
  city: string;
  country: string;
  rawText: string;
  audioUri: string | null;
  photoUri: string | null;
  extraction: Extraction;
  syncState: "Local" | "Pendiente de enviar" | "Sincronizado";
  createdAt: string;
};
