import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Loader2, Monitor, Search } from "lucide-react"
import {
  PageHeader,
  Card,
  CardContent,
  EquipmentTable,
  StatCard,
  EmptyState,
} from "@/components/common"
import { useInstalledBase } from "@/hooks/useInstalledBase"
import { formatModality } from "@/lib/format"
import type { EquipmentModality } from "@/types"

const MODALITIES: EquipmentModality[] = [
  "MRI",
  "CT",
  "XRAY",
  "ULTRASOUND",
  "PET",
  "SPECT",
  "MAMMOGRAPHY",
  "FLUOROSCOPY",
  "OTHER",
]

const SELECT_CLASS =
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function EquipmentsPage() {
  const [searchParams] = useSearchParams()
  const { equipments, loading, error } = useInstalledBase()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [modality, setModality] = useState("")
  const [status, setStatus] = useState("")
  const [country, setCountry] = useState("")

  const countries = useMemo(
    () =>
      [...new Set(equipments.map((e) => e.location?.country).filter(Boolean))]
        .sort()
        .map((c) => c as string),
    [equipments],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return equipments.filter((eq) => {
      const matchesQuery =
        !q ||
        eq.modality.toLowerCase().includes(q) ||
        (eq.model ?? "").toLowerCase().includes(q) ||
        (eq.serialNumber ?? "").toLowerCase().includes(q) ||
        (eq.location?.client ?? "").toLowerCase().includes(q) ||
        (eq.location?.city ?? "").toLowerCase().includes(q)
      const matchesModality = !modality || eq.modality === modality
      const matchesStatus = !status || eq.status === status
      const matchesCountry = !country || eq.location?.country === country
      return matchesQuery && matchesModality && matchesStatus && matchesCountry
    })
  }, [equipments, query, modality, status, country])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary-readable" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Monitor className="h-6 w-6" />}
        title="No se pudo cargar"
        description={error}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base instalada"
        title="Equipos"
        description="Todos los activos registrados, con su fabricante, ubicación, antigüedad y confianza."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Equipos"
          value={equipments.length}
          icon={<Monitor className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Oportunidades (>7 años)"
          value={equipments.filter((e) => (e.ageYears ?? 0) > 7).length}
          icon={<Monitor className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          title="Confirmados"
          value={equipments.filter((e) => e.status === "CONFIRMED").length}
          icon={<Monitor className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por equipo, modelo, serie o cliente..."
                aria-label="Buscar equipos"
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              aria-label="Filtrar por modalidad"
              className={SELECT_CLASS}
            >
              <option value="">Todas las modalidades</option>
              {MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {formatModality(m)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filtrar por estado"
              className={SELECT_CLASS}
            >
              <option value="">Todos los estados</option>
              <option value="CONFIRMED">Confirmado</option>
              <option value="REPORTED">Reportado</option>
              <option value="ESTIMATED">Estimado</option>
              <option value="UNKNOWN">Desconocido</option>
            </select>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Filtrar por país"
              className={SELECT_CLASS}
            >
              <option value="">Todos los países</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <EquipmentTable
            data={filtered}
            emptyTitle="Sin equipos"
            emptyDescription="Ajusta los filtros o la búsqueda para ver resultados."
          />
        </CardContent>
      </Card>
    </div>
  )
}
