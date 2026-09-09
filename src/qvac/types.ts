export type EquipmentObservation = {
  modality: string | null;
  quantity: number | null;
  brand: string | null;
  model: string | null;
  serial_number?: string | null;
  age_years: number | null;
  installation_year?: number | null;
  status: "Confirmado" | "Reportado" | "Estimado" | "Desconocido";
  confidence?: number | null;
  evidence_text?: string | null;
  notes?: string | null;
};

export type StructuredObservation = {
  client: string | null;
  city: string | null;
  country: string | null;
  equipment: EquipmentObservation[];
  missing_fields: string[];
  next_question: string | null;
  input_language?: string | null;
  privacy_flags?: string[];
};

export type PerformanceRecord = {
  timestamp: string;
  hardware: string;
  model: string;
  quantization: string;
  task: string;
  prompt: string;
  input_tokens: number;
  output_tokens: number;
  model_load_ms: number;
  ttft_ms: number;
  total_inference_ms: number;
  tokens_per_second: number;
  success: boolean;
  error: string | null;
};
