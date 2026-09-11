import { useMemo } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  StatCard,
  EmptyState,
  QualityDonut,
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
import { average } from "@/lib/format"

export function DataQualityPage() {
  const { clients, equipments, loading, error } = useInstalledBase()

  const quality = useMemo(
    () => average(equipments.map((e) => e.confidence)),
    [equipments],
  )

  const buckets = useMemo(() => {
    const high = equipments.filter((e) => e.confidence >= 0.8).length
    const medium = equipments.filter(
      (e) => e.confidence >= 0.6 && e.confidence < 0.8,
    ).length
    const low = equipments.filter((e) => e.confidence < 0.6).length
    return { high, medium, low }
  }, [equipments])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      CONFIRMED: 0,
      REPORTED: 0,
      ESTIMATED: 0,
      UNKNOWN: 0,
    }
    equipments.forEach((e) => {
      counts[e.status] = (counts[e.status] ?? 0) + 1
    })
    return counts
  }, [equipments])

  const clientRows = useMemo(
    () =>
      [...clients]
        .map((c) => ({
          name: c.clientName,
          location: `${c.city}, ${c.country}`,
          equipments: c.totalEquipmentCount,
          quality: average(c.equipments.map((e) => e.confidence)),
        }))
        .sort((a, b) => a.quality - b.quality),
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
        icon={<ShieldCheck className="h-6 w-6" />}
        title="No se pudo cargar"
        description={error}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Confidence Engine"
        title="Calidad de datos"
        description="Puntaje explicable según completitud, evidencia y confirmaciones de la base instalada."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          title="Confianza alta (≥80%)"
          value={buckets.high}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          title="Confianza media"
          value={buckets.medium}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          title="Confianza baja (<60%)"
          value={buckets.low}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="red"
        />
        <StatCard
          title="Confirmados"
          value={statusCounts.CONFIRMED}
          icon={<ShieldCheck className="h-5 w-5" />}
          accent="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calidad general</CardTitle>
            <CardDescription>
              Promedio de confianza de los equipos
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <QualityDonut value={quality} />
            <div className="space-y-3">
              {[
                { label: "Confirmados", value: statusCounts.CONFIRMED },
                { label: "Reportados", value: statusCounts.REPORTED },
                { label: "Estimados", value: statusCounts.ESTIMATED },
                { label: "Desconocidos", value: statusCounts.UNKNOWN },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="flex-1 text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="font-medium text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calidad por cliente</CardTitle>
            <CardDescription>
              Clientes ordenados por menor calidad de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {clientRows.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6" />}
                title="Sin clientes"
                description="Aún no hay datos para evaluar."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Equipos</TableHead>
                    <TableHead>Calidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientRows.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>
                        <p className="font-medium text-foreground">
                          {row.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.location}
                        </p>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {row.equipments}
                      </TableCell>
                      <TableCell>
                        <ConfidenceBar value={row.quality} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
