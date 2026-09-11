import type {
  EquipmentModality,
  EquipmentBrand,
  Equipment,
  ObservationStatus,
} from "@/types"

export const MODALITY_LABELS: Record<EquipmentModality, string> = {
  MRI: "Resonancia Magnética",
  CT: "Tomografía",
  XRAY: "Rayos X",
  ULTRASOUND: "Ultrasonido",
  PET: "PET",
  SPECT: "SPECT",
  MAMMOGRAPHY: "Mamografía",
  FLUOROSCOPY: "Fluoroscopía",
  OTHER: "Otra",
}

export function formatModality(modality: EquipmentModality): string {
  return MODALITY_LABELS[modality] ?? modality
}

const BRAND_LABELS: Record<EquipmentBrand, string> = {
  PHILIPS: "Philips",
  SIEMENS: "Siemens",
  GE: "GE HealthCare",
  CANON: "Canon",
  HITACHI: "Hitachi",
  FUJIFILM: "Fujifilm",
  SAMSUNG: "Samsung",
  MINDRAY: "Mindray",
  OTHER: "Otra",
}

export function formatBrand(brand?: EquipmentBrand): string {
  if (!brand) return "—"
  return BRAND_LABELS[brand] ?? brand
}

export const STATUS_LABELS: Record<ObservationStatus, string> = {
  CONFIRMED: "Confirmado",
  REPORTED: "Reportado",
  ESTIMATED: "Estimado",
  UNKNOWN: "Desconocido",
}

export function isOpportunity(equipment: Equipment): boolean {
  return (equipment.ageYears ?? 0) > 7
}

export function formatDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTime(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}
