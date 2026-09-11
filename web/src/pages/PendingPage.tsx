import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardList, Loader2, Mic } from "lucide-react"
import {
  PageHeader,
  Card,
  CardContent,
  EquipmentTable,
  StatCard,
  EmptyState,
  Button,
} from "@/components/common"
import { useInstalledBase } from "@/hooks/useInstalledBase"

export function PendingPage() {
  const navigate = useNavigate()
  const { equipments, loading, error } = useInstalledBase()

  const pending = useMemo(
    () =>
      equipments.filter((e) => e.status !== "CONFIRMED"),
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
        icon={<ClipboardList className="h-6 w-6" />}
        title="No se pudo cargar"
        description={error}
      />
    )
  }

  const byStatus = (status: string) =>
    pending.filter((e) => e.status === status).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trabajo de campo"
        title="Pendientes"
        description="Equipos observados que aún no se confirman. Revísalos para elevar la calidad de la base."
        actions={
          <Button variant="primary" onClick={() => navigate("/capture")}>
            <Mic className="h-4 w-4" /> Nueva captura
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Por confirmar"
          value={pending.length}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          title="Reportados"
          value={byStatus("REPORTED")}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Estimados"
          value={byStatus("ESTIMATED")}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <EquipmentTable
            data={pending}
            emptyTitle="Nada pendiente"
            emptyDescription="Todos los equipos registrados están confirmados."
          />
        </CardContent>
      </Card>
    </div>
  )
}
