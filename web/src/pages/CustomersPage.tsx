import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, Loader2 } from "lucide-react"
import {
  PageHeader,
  Card,
  CardContent,
  StatCard,
  EmptyState,
  ConfidenceBar,
} from "@/components/common"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInstalledBase } from "@/hooks/useInstalledBase"
import { average, formatDate } from "@/lib/format"

export function CustomersPage() {
  const navigate = useNavigate()
  const { clients, loading, error } = useInstalledBase()

  const rows = useMemo(
    () =>
      [...clients]
        .map((c) => ({
          ...c,
          quality: average(c.equipments.map((e) => e.confidence)),
        }))
        .sort((a, b) => b.totalEquipmentCount - a.totalEquipmentCount),
    [clients],
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
        icon={<Building2 className="h-6 w-6" />}
        title="No se pudo cargar"
        description={error}
      />
    )
  }

  const totalOpportunities = clients.reduce(
    (sum, c) => sum + c.renewalOpportunities,
    0,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer 360"
        title="Clientes"
        description="Base instalada, calidad de datos y última observación por cliente."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Clientes"
          value={clients.length}
          icon={<Building2 className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Equipos totales"
          value={clients.reduce((sum, c) => sum + c.totalEquipmentCount, 0)}
          icon={<Building2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          title="Oportunidades"
          value={totalOpportunities}
          icon={<Building2 className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title="Sin clientes"
              description="Registra una observación para crear el primer cliente."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Equipos</TableHead>
                  <TableHead>Calidad de datos</TableHead>
                  <TableHead>Oportunidades</TableHead>
                  <TableHead>Última visita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((client) => (
                  <TableRow
                    key={client.clientId}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/installed-base/${encodeURIComponent(client.clientName)}`,
                      )
                    }
                  >
                    <TableCell className="font-medium text-foreground">
                      {client.clientName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.city}, {client.country}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {client.totalEquipmentCount}
                    </TableCell>
                    <TableCell>
                      <ConfidenceBar value={client.quality} />
                    </TableCell>
                    <TableCell>
                      {client.renewalOpportunities > 0 ? (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                          {client.renewalOpportunities}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(client.lastVisit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
