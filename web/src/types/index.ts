export type EquipmentModality =
  | "MRI"
  | "CT"
  | "XRAY"
  | "ULTRASOUND"
  | "PET"
  | "SPECT"
  | "MAMMOGRAPHY"
  | "FLUOROSCOPY"
  | "OTHER";

export type ObservationStatus =
  "CONFIRMED" | "REPORTED" | "ESTIMATED" | "UNKNOWN";

export type EquipmentBrand =
  | "PHILIPS"
  | "SIEMENS"
  | "GE"
  | "CANON"
  | "HITACHI"
  | "FUJIFILM"
  | "SAMSUNG"
  | "MINDRAY"
  | "OTHER";

export interface Equipment {
  id: string;
  modality: EquipmentModality;
  brand?: EquipmentBrand;
  model?: string;
  serialNumber?: string;
  ageYears?: number;
  quantity: number;
  confidence: number; // 0-1
  status: ObservationStatus;
  lastSeen?: string;
  location?: {
    client: string;
    city: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  sourceObservationId: string;
}

export interface Observation {
  id: string;
  rawText: string;
  transcribedText?: string;
  audioUri?: string;
  imageUris?: string[];
  extractedEquipments: Equipment[];
  clientName?: string;
  city?: string;
  country?: string;
  observerId: string;
  observerName: string;
  status: ObservationStatus;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface ClientInstalledBase {
  clientId: string;
  clientName: string;
  city: string;
  country: string;
  equipments: Equipment[];
  lastVisit: string;
  totalEquipmentCount: number;
  renewalOpportunities: number;
}

export interface NaturalLanguageQuery {
  query: string;
  parsedIntent: QueryIntent;
  results: ClientInstalledBase[];
  sql?: string;
}

export type QueryIntent =
  | "LIST_CLIENTS"
  | "LIST_EQUIPMENT_BY_MODALITY"
  | "LIST_EQUIPMENT_BY_AGE"
  | "LIST_EQUIPMENT_BY_BRAND"
  | "RENEWAL_OPPORTUNITIES"
  | "DUPLICATES"
  | "CONFIDENCE_LOW"
  | "UNKNOWN";

export interface QVACExtractionResult {
  equipments: Omit<
    Equipment,
    "id" | "createdAt" | "updatedAt" | "sourceObservationId"
  >[];
  confidence: number;
  missingFields: string[];
  followUpQuestions: string[];
}

export interface AppState {
  observations: Observation[];
  clients: ClientInstalledBase[];
  currentQuery: NaturalLanguageQuery | null;
  isLoading: boolean;
  error: string | null;
}

export interface CaptureFormData {
  rawText: string;
  audioUri?: string;
  imageUris?: string[];
  clientName?: string;
  city?: string;
  country?: string;
}
