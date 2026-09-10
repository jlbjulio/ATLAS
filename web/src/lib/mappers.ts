import type {
  CoreEquipment,
  Evidence,
  ObservationDraft,
  HealthResponse,
  InstalledBaseClient,
  DashboardStats,
  ExtractResponse,
  TranscribeResponse,
  SearchResponse,
  SearchResult,
} from '@/services/api';

import type {
  EquipmentModality,
  EquipmentBrand,
  ObservationStatus,
  ClientInstalledBase,
  QVACExtractionResult,
} from '@/types';

export function mapHealth(response: HealthResponse) {
  const requiredModels = ['qwen3-0.6b', 'whisper-small', 'silero-vad'];
  return {
    available: response.local_only && requiredModels.every((model) => response.models_exist[model]),
    models: response.models_exist,
  };
}

export function mapInstalledBase(clients: InstalledBaseClient[]): ClientInstalledBase[] {
  return clients.map((client) => ({
    clientId: client.id,
    clientName: client.name,
    city: client.city,
    country: client.country,
    equipments: client.assets.map((asset) => mapEquipment(asset)),
    lastVisit: client.last_observed,
    totalEquipmentCount: client.reported_units,
    renewalOpportunities: client.assets.filter((asset) => (asset.age_years ?? 0) > 7).length,
  }));
}

export function mapDashboard(stats: DashboardStats) {
  return stats;
}

function mapStatus(status: string): ObservationStatus {
  const map: Record<string, ObservationStatus> = {
    Confirmado: 'CONFIRMED',
    Reportado: 'REPORTED',
    Estimado: 'ESTIMATED',
    Desconocido: 'UNKNOWN',
  };
  return map[status] ?? 'UNKNOWN';
}

function mapStatusToSpanish(status: ObservationStatus): 'Confirmado' | 'Reportado' | 'Estimado' | 'Desconocido' {
  const map: Record<ObservationStatus, 'Confirmado' | 'Reportado' | 'Estimado' | 'Desconocido'> = {
    CONFIRMED: 'Confirmado',
    REPORTED: 'Reportado',
    ESTIMATED: 'Estimado',
    UNKNOWN: 'Desconocido',
  };
  return map[status];
}

function mapModality(modality: string | null): EquipmentModality {
  const valid: EquipmentModality[] = [
    'MRI', 'CT', 'XRAY', 'ULTRASOUND', 'PET', 'SPECT', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'OTHER'
  ];
  return (valid.includes(modality as EquipmentModality) ? modality : 'OTHER') as EquipmentModality;
}

function mapBrand(brand: string | null): EquipmentBrand | undefined {
  const valid: EquipmentBrand[] = [
    'PHILIPS', 'SIEMENS', 'GE', 'CANON', 'HITACHI', 'FUJIFILM', 'SAMSUNG', 'MINDRAY', 'OTHER'
  ];
  if (!brand) return undefined;
  return valid.includes(brand as EquipmentBrand) ? (brand as EquipmentBrand) : undefined;
}

export function mapEquipment(e: CoreEquipment) {
  return {
    id: e.id,
    modality: mapModality(e.modality),
    brand: mapBrand(e.brand),
    model: e.model ?? undefined,
    ageYears: e.age_years ?? undefined,
    quantity: e.quantity ?? 1,
    confidence: e.confidence ?? 0,
    status: mapStatus(e.status),
    location: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceObservationId: '',
  };
}

export function mapEvidence(e: Evidence) {
  return {
    id: e.id,
    kind: e.kind,
    localPath: e.local_path,
    sha256: e.sha256,
    excerpt: e.excerpt,
  };
}

export function mapObservationDraft(draft: ObservationDraft): QVACExtractionResult {
  return {
    equipments: draft.equipment.map(mapEquipment),
    confidence: draft.equipment.length > 0
      ? draft.equipment.reduce((sum, e) => sum + (e.confidence ?? 0), 0) / draft.equipment.length
      : 0,
    missingFields: draft.missing_fields,
    followUpQuestions: draft.next_question ? [draft.next_question] : [],
  };
}

export function mapExtractionResponse(response: ExtractResponse): QVACExtractionResult {
  return mapObservationDraft(response.draft);
}

export function mapTranscribeResponse(response: TranscribeResponse): string {
  return response.text;
}

export function mapSearchResults(results: SearchResult[]): ClientInstalledBase[] {
  const clientMap = new Map<string, ClientInstalledBase>();

  for (const r of results) {
    const clientKey = `${r.customer_name}|${r.city}|${r.country}`;
    let client = clientMap.get(clientKey);

    if (!client) {
      client = {
        clientId: r.customer_id,
        clientName: r.customer_name,
        city: r.city,
        country: r.country,
        equipments: [],
        lastVisit: r.last_seen,
        totalEquipmentCount: 0,
        renewalOpportunities: 0,
      };
      clientMap.set(clientKey, client);
    }

    client.equipments.push({
      id: r.id,
      modality: mapModality(r.modality),
      brand: mapBrand(r.brand),
      model: r.model ?? undefined,
      ageYears: r.age_years ?? undefined,
      quantity: r.quantity,
      confidence: r.confidence,
      status: mapStatus(r.status),
      location: {
        client: r.customer_name,
        city: r.city,
        country: r.country,
      },
      createdAt: r.first_seen,
      updatedAt: r.last_seen,
      sourceObservationId: '',
    });
    client.totalEquipmentCount = client.equipments.length;
    client.renewalOpportunities = client.equipments.filter(e => e.ageYears && e.ageYears > 7).length;
  }

  return Array.from(clientMap.values());
}

export function mapSearchResponse(response: SearchResponse): {
  results: ClientInstalledBase[];
  filters: Record<string, unknown>;
  intent: string;
} {
  return {
    results: mapSearchResults(response.results),
    filters: response.filters_applied,
    intent: response.intent,
  };
}

export function toCoreDraft(
  formData: { rawText: string; clientName?: string; city?: string; country?: string; audioUri?: string; imageUris?: string[] },
  extraction: QVACExtractionResult
): ObservationDraft {
  const now = new Date().toISOString().split('T')[0];

  return {
    client: formData.clientName ?? null,
    city: formData.city ?? null,
    country: formData.country ?? null,
    raw_text: formData.rawText,
    equipment: extraction.equipments.map((eq) => ({
      id: crypto.randomUUID(),
      modality: eq.modality,
      quantity: eq.quantity,
      brand: eq.brand ?? null,
      model: eq.model ?? null,
      serial_number: null,
      age_years: eq.ageYears ?? null,
      installation_year: eq.ageYears ? new Date().getFullYear() - eq.ageYears : null,
      status: mapStatusToSpanish(eq.status),
      confidence: eq.confidence,
      evidence_text: '',
      notes: null,
    })),
    source: formData.audioUri ? 'Voice' : 'Text',
    visit_date: now,
    observer: 'web-user',
    // Browser object URLs are not durable evidence paths. Require a reviewed
    // local-photo pipeline before allowing them into the confirmed record.
    evidence: [],
    missing_fields: extraction.missingFields,
    next_question: extraction.followUpQuestions[0] ?? null,
    privacy_flags: formData.imageUris?.length ? ['photo_review_required'] : [],
  };
}
