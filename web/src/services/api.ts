/// <reference types="vite/client" />

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = new Error("La solicitud a la API falló");
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {
      error.data = await response.text();
    }
    const detail = (error.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string" && detail.trim()) {
      error.message = detail;
    }
    throw error;
  }
  return response.json();
}

async function typedFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  return handleResponse<T>(response);
}

export const api = {
  health: () => typedFetch<HealthResponse>(`${API_BASE}/health`),

  installedBase: () =>
    typedFetch<InstalledBaseClient[]>(`${API_BASE}/installed-base`),

  dashboard: () => typedFetch<DashboardStats>(`${API_BASE}/dashboard`),

  duplicates: () =>
    typedFetch<DuplicateCandidate[]>(`${API_BASE}/duplicates`),

  staleAssets: (days = 365) =>
    typedFetch<StaleAsset[]>(`${API_BASE}/stale?days=${days}`),

  extract: (payload: {
    text: string;
    client?: string;
    city?: string;
    country?: string;
  }) =>
    typedFetch<ExtractResponse>(`${API_BASE}/capture/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  analyzePhoto: (
    photo: File,
    payload: {
      text: string;
      client?: string;
      city?: string;
      country?: string;
      photoAuthorized: boolean;
    },
  ) => {
    const formData = new FormData();
    formData.append("file", photo);
    formData.append("text", payload.text);
    formData.append("photo_authorized", String(payload.photoAuthorized));
    if (payload.client) formData.append("client", payload.client);
    if (payload.city) formData.append("city", payload.city);
    if (payload.country) formData.append("country", payload.country);
    return typedFetch<ExtractResponse>(`${API_BASE}/capture/analyze-photo`, {
      method: "POST",
      body: formData,
    });
  },

  transcribe: (audioFile: File) => {
    const formData = new FormData();
    formData.append("file", audioFile);
    return typedFetch<TranscribeResponse>(`${API_BASE}/capture/transcribe`, {
      method: "POST",
      body: formData,
    });
  },

  confirm: (draft: Record<string, unknown>) =>
    typedFetch<ConfirmResponse>(`${API_BASE}/capture/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    }),

  search: (question: string) =>
    typedFetch<SearchResponse>(`${API_BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),

  searchAnswer: (question: string, summary: Record<string, unknown>) =>
    typedFetch<SearchAnswerResponse>(`${API_BASE}/search/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, summary }),
    }),

  createP2PInvitation: (localUrl: string) =>
    typedFetch<P2PInvitationResponse>(`${API_BASE}/p2p/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ local_url: localUrl }),
    }),

  listP2PSessions: () =>
    typedFetch<P2PSessionsResponse>(`${API_BASE}/p2p/sessions`),

  revokeP2PSession: (token: string) =>
    typedFetch<{ ok: boolean }>(`${API_BASE}/p2p/sessions/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }),
};

export type P2PSession = {
  token: string;
  device_name: string;
  paired_at: string;
  last_seen: string;
  expires_at: string;
};

export type P2PSessionsResponse = {
  sessions: P2PSession[];
};

export type HealthResponse = {
  local_only: boolean;
  models_exist: Record<string, boolean>;
  database: string;
  sqlite_version: string;
  extraction_mode: "base" | "adapter";
};

export type InstalledBaseClient = {
  id: string;
  name: string;
  city: string;
  country: string;
  asset_records: number;
  reported_units: number;
  average_confidence: number;
  last_observed: string;
  assets: CoreEquipment[];
};

export type DashboardStats = {
  total_equipment: number;
  total_clients: number;
  pending_confirmations: number;
  renewal_opportunities: number;
  stale_assets: number;
  duplicate_candidates: number;
  by_modality?: Record<string, number>;
  status_counts?: Record<string, number>;
};

export type DuplicateCandidate = {
  id: string;
  score: number;
  reasons: string[];
  conflicts: string[];
  review_status: string;
  created_at: string;
  incoming_modality: string | null;
  incoming_brand: string | null;
  incoming_model: string | null;
  incoming_quantity: number | null;
  incoming_age_years: number | null;
  existing_modality: string | null;
  existing_brand: string | null;
  existing_model: string | null;
  existing_quantity: number | null;
  existing_age_years: number | null;
  customer_name: string | null;
  customer_city: string | null;
  customer_country: string | null;
};

export type StaleAsset = CoreEquipment & {
  customer_name: string | null;
  customer_city: string | null;
  customer_country: string | null;
};

export type ExtractResponse = {
  draft: ObservationDraft;
  missing_fields: string[];
  next_question: string | null;
};

export type ObservationDraft = {
  client: string | null;
  city: string | null;
  country: string | null;
  raw_text: string;
  equipment: CoreEquipment[];
  source: string;
  visit_date: string;
  observer: string;
  evidence: Evidence[];
  missing_fields: string[];
  next_question: string | null;
  privacy_flags: string[];
};

export type CoreEquipment = {
  id: string;
  modality: string | null;
  quantity: number | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  age_years: number | null;
  installation_year: number | null;
  status: "Confirmado" | "Reportado" | "Estimado" | "Desconocido";
  confidence: number | null;
  evidence_text: string | null;
  notes: string | null;
};

export type Evidence = {
  id: string;
  kind: "text" | "audio" | "photo";
  local_path: string | null;
  sha256: string | null;
  excerpt: string | null;
};

export type TranscribeResponse = {
  text: string;
};

export type ConfirmResponse = {
  observation_id: string;
  asset_ids: string[];
  duplicate_candidates: Array<{
    incoming_asset_id: string;
    existing_asset_id: string;
    score: number;
    reasons: string[];
    conflicts: string[];
    review_status: string;
  }>;
};

export type SearchResponse = {
  results: SearchResult[];
  filters_applied: Record<string, unknown>;
  intent: string;
  natural_response: string;
  answer_summary: Record<string, unknown>;
};

export type SearchAnswerResponse = {
  natural_response: string;
};

export type P2PInvitationResponse = {
  code: string;
  invite_url: string;
  expires_at: string;
};

export type SearchResult = {
  id: string;
  customer_id: string;
  modality: string;
  quantity: number;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  age_years: number | null;
  installation_year: number | null;
  status: string;
  confidence: number;
  first_seen: string;
  last_seen: string;
  notes: string | null;
  customer_name: string;
  city: string;
  country: string;
};
