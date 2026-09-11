import { useMemo } from "react"
import { Loader2, TrendingUp } from "lucide-react"
import {
  PageHeader,
  Card,
  CardContent,
  EquipmentTable,
  StatCard,
  EmptyState,
} from "@/components/common"
import { useInstalledBase } from "@/hooks/useInstalledBase"
import { average } from "@/lib/format"

export function OpportunitiesPage() {
  const { equipments, loading, error } = useInstalledBase()

  const opportunities = useMemo(
    () =>
      equipments
        .filter((e) => (e.ageYears ?? 0) > 7)
        .sort((a, b) => (b.ageYears ?? 0) - (a.ageYears ?? 0)),
    [equipments],
  )

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
        icon={<TrendingUp className="h-6 w-6" />}
        title="No se pudo cargar"
        description={error}
      />
    )
  }

  const avgAge = average(opportunities.map((e) => e.ageYears ?? 0))
  const clients = new Set(opportunities.map((e) => e.location?.client)).size

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Opportunity Radar"
        title="Oportunidades de renovación"
        description="Activos de más de 7 años que conviene revisar. Indican revisión, no reemplazo automático."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Equipos a revisar"
          value={opportunities.length}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          title="Clientes implicados"
          value={clients}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          title="Antigüedad media"
          value={`${avgAge.toFixed(1)} años`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="red"
        />
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <EquipmentTable
            data={opportunities}
            emptyTitle="Sin oportunidades"
            emptyDescription="No hay equipos de más de 7 años en la base instalada."
          />
        </CardContent>
      </Card>
    </div>
  )
}
