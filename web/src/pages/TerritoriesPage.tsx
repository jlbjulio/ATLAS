import { useMemo } from "react"
import { Loader2, MapPin } from "lucide-react"
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { average } from "@/lib/format"

interface Territory {
  name: string
  clients: number
  equipments: number
  opportunities: number
  quality: number
}

export function TerritoriesPage() {
  const { clients, equipments, loading, error } = useInstalledBase()

  const byCountry = useMemo<Territory[]>(() => {
    const map = new Map<string, Territory & { qualities: number[] }>()
    clients.forEach((c) => {
      const key = c.country || "Sin país"
      const entry =
        map.get(key) ??
        ({
          name: key,
          clients: 0,
          equipments: 0,
          opportunities: 0,
          quality: 0,
          qualities: [],
        } as Territory & { qualities: number[] })
      entry.clients += 1
      entry.equipments += c.totalEquipmentCount
      entry.opportunities += c.renewalOpportunities
      entry.qualities.push(
        average(c.equipments.map((e) => e.confidence)),
      )
      map.set(key, entry)
    })
    return [...map.values()]
      .map((entry) => ({ ...entry, quality: average(entry.qualities) }))
      .sort((a, b) => b.equipments - a.equipments)
  }, [clients])

  const byCity = useMemo<Territory[]>(() => {
    const map = new Map<string, Territory & { qualities: number[] }>()
    clients.forEach((c) => {
      const key = `${c.city}, ${c.country}`
      const entry =
        map.get(key) ??
        ({
          name: key,
          clients: 0,
          equipments: 0,
          opportunities: 0,
          quality: 0,
          qualities: [],
        } as Territory & { qualities: number[] })
      entry.clients += 1
      entry.equipments += c.totalEquipmentCount
      entry.opportunities += c.renewalOpportunities
      entry.qualities.push(average(c.equipments.map((e) => e.confidence)))
      map.set(key, entry)
    })
    return [...map.values()]
      .map((entry) => ({ ...entry, quality: average(entry.qualities) }))
      .sort((a, b) => b.equipments - a.equipments)
  }, [clients])

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
        icon={<MapPin className="h-6 w-6" />}
        title="No se pudo cargar"
        description={error}
      />
    )
  }

  const totalOpportunities = equipments.filter(
    (e) => (e.ageYears ?? 0) > 7,
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Territory Intelligence"
        title="Territorios"
        description="Agregado de modalidades, fabricantes y antigüedad por país y ciudad."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Países"
          value={byCountry.length}
          icon={<MapPin className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Ciudades"
          value={byCity.length}
          icon={<MapPin className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          title="Oportunidades"
          value={totalOpportunities}
          icon={<MapPin className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por país</CardTitle>
          <CardDescription>Clientes, equipos y calidad agregada</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {byCountry.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title="Sin datos geográficos"
              description="Registra clientes con país para ver el agregado."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Equipos</TableHead>
                  <TableHead>Oportunidades</TableHead>
                  <TableHead>Calidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byCountry.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell className="font-medium text-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {row.clients}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {row.equipments}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.opportunities}
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

      <Card>
        <CardHeader>
          <CardTitle>Por ciudad</CardTitle>
          <CardDescription>Principales ciudades por equipos</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Equipos</TableHead>
                <TableHead>Oportunidades</TableHead>
                <TableHead>Calidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCity.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium text-foreground">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {row.clients}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {row.equipments}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.opportunities}
                  </TableCell>
                  <TableCell>
                    <ConfidenceBar value={row.quality} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
