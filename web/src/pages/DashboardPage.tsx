import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
  Mic,
  Loader2,
  Camera,
  MessageCircle,
  MapPin,
  ShieldCheck,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  PageHeader,
  EmptyState,
  ConfidenceMeter,
} from "@/components/common"
import { api, type DashboardStats } from "@/services/api"
import { mapDashboard, mapInstalledBase } from "@/lib/mappers"
import type { ClientInstalledBase } from "@/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { MetricCard } from "@/components/ui/metric-card"

interface DashboardStatsExtended extends DashboardStats {
  by_modality: Record<string, number>
  status_counts: Record<string, number>
}

const MODALITY_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
]

const STATUS_COLOR_MAP: Record<string, string> = {
  Confirmado: "var(--success)",
  Reportado: "var(--primary)",
  Estimado: "var(--accent)",
  Desconocido: "var(--muted-foreground)",
}

const FLOW_STEPS = [
  { icon: Camera, title: "Captura", text: "Foto, voz o texto en campo." },
  { icon: MessageCircle, title: "Comprensión", text: "Modelos locales estructuran." },
  { icon: ShieldCheck, title: "Revisión", text: "Tú confirmas cada dato." },
  { icon: Database, title: "Decisión", text: "Base verificable y accionable." },
]

export function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [clients, setClients] = useState<ClientInstalledBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        const [dashboardStats, installedBase] = await Promise.all([
          api.dashboard(),
          api.installedBase(),
        ])
        setStats(mapDashboard(dashboardStats) as DashboardStatsExtended)
        setClients(mapInstalledBase(installedBase))
      } catch (err) {
        setError("Error cargando el panel")
        console.error("Dashboard load error:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  const allEquipments = useMemo(
    () => clients.flatMap((c) => c.equipments),
    [clients]
  )

  const avgConfidence = useMemo(() => {
    if (allEquipments.length === 0) return 0
    return (
      allEquipments.reduce((sum, e) => sum + (e.confidence || 0), 0) /
      allEquipments.length
    )
  }, [allEquipments])

  const territory = useMemo(() => {
    const map = new Map<
      string,
      { country: string; clients: number; equipments: number }
    >()
    clients.forEach((c) => {
      const key = c.country || "Sin país"
      const current =
        map.get(key) ?? { country: key, clients: 0, equipments: 0 }
      current.clients += 1
      current.equipments += c.totalEquipmentCount
      map.set(key, current)
    })
    return [...map.values()]
      .sort((a, b) => b.equipments - a.equipments)
      .slice(0, 5)
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
        icon={<AlertTriangle className="h-6 w-6 text-red-300" />}
        title="Error al cargar"
        description={error}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        }
      />
    )
  }

  const totalEquipments = stats?.total_equipment ?? 0
  const totalClients = stats?.total_clients ?? 0
  const pendingConfirmations = stats?.pending_confirmations ?? 0
  const renewalOpportunities = stats?.renewal_opportunities ?? 0

  const byModality = stats?.by_modality ?? {}
  const modalityData = Object.entries(byModality).map(([name, value]) => ({
    name,
    value,
  }))

  const statusCounts = stats?.status_counts ?? {}

  const topClients = [...clients]
    .sort((a, b) => b.totalEquipmentCount - a.totalEquipmentCount)
    .slice(0, 4)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Installed Base Intelligence"
        title="Inicio"
        description="Del trabajo de campo a una decisión: la base instalada verificable, su calidad y las oportunidades de renovación."
        actions={
          <>
            <Button variant="primary" onClick={() => navigate("/capture")}>
              <Mic className="h-4 w-4" /> Nueva captura
            </Button>
            <Button variant="secondary" onClick={() => navigate("/queries")}>
              <Search className="h-4 w-4" /> Consultar
            </Button>
          </>
        }
      />

      <Card className="bg-card/60">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step) => (
            <div key={step.title} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10 text-primary-readable">
                <step.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.text}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total equipos"
          value={totalEquipments}
          icon={<Database className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Clientes activos"
          value={totalClients}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />
        <MetricCard
          title="Por confirmar"
          value={pendingConfirmations}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <MetricCard
          title="Oportunidades de renovación"
          value={renewalOpportunities}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top clientes por equipos</CardTitle>
            <CardDescription>Mayor base instalada registrada</CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-2">
                {topClients.map((client) => (
                  <Link
                    key={client.clientName}
                    to={`/installed-base/${client.clientName}`}
                    className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Database className="h-5 w-5 text-primary-readable" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {client.clientName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {client.city}, {client.country}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {client.totalEquipmentCount}
                      </p>
                      <p className="text-xs text-primary-readable">
                        Ver detalle
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Database className="h-6 w-6" />}
                title="Sin clientes todavía"
                description="Captura tu primera observación para poblar la base instalada."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/capture")}
                  >
                    <Mic className="h-4 w-4" /> Nueva captura
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calidad de datos</CardTitle>
            <CardDescription>
              Puntaje explicable según completitud y evidencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ConfidenceMeter
              value={avgConfidence}
              description="Promedio de confianza de los equipos registrados."
            />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estado de observaciones
              </p>
              {Object.keys(statusCounts).length > 0 ? (
                Object.entries(statusCounts).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded"
                      style={{
                        backgroundColor:
                          STATUS_COLOR_MAP[label] ?? "var(--muted-foreground)",
                      }}
                    />
                    <span className="flex-1 text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {value}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aún no hay estados registrados.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por modalidad</CardTitle>
            <CardDescription>Equipos por tipo en la base</CardDescription>
          </CardHeader>
          <CardContent>
            {modalityData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={modalityData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                      width={80}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        color: "var(--foreground)",
                      }}
                      cursor={{ fill: "var(--muted)" }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {modalityData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={MODALITY_COLORS[index % MODALITY_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={<Database className="h-6 w-6" />}
                title="Sin distribución"
                description="Aparecerá cuando haya equipos registrados."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Territory Intelligence</CardTitle>
            <CardDescription>Equipos agregados por país</CardDescription>
          </CardHeader>
          <CardContent>
            {territory.length > 0 ? (
              <div className="space-y-3">
                {territory.map((row) => (
                  <div
                    key={row.country}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm text-foreground">
                      {row.country}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {row.clients} clientes
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {row.equipments}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<MapPin className="h-6 w-6" />}
                title="Sin datos geográficos"
                description="Registra clientes con ciudad y país para ver el agregado."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
