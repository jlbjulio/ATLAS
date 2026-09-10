import { useEffect, useState } from "react"
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
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/common"
import { Button } from "@/components/common"
import { api, type DashboardStats } from "@/services/api"
import { mapDashboard, mapInstalledBase } from "@/lib/mappers"
import type { ClientInstalledBase } from "@/types"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
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
        setError("Error cargando el dashboard")
        console.error("Dashboard load error:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Error al cargar
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            variant="primary"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Reintentar
          </Button>
        </div>
      </div>
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
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            Inteligencia de base instalada
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Visión general de la base instalada y actividad reciente
          </p>
        </div>
        <div className="flex gap-3">
          <Button             variant="primary" onClick={() => navigate("/capture")}>
            <Mic className="w-4 h-4 mr-2" /> Nueva Captura
          </Button>
          <Button variant="secondary" onClick={() => navigate("/queries")}>
            <Search className="w-4 h-4 mr-2" /> Consultar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Equipos"
          value={totalEquipments}
          icon={<Database className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          title="Clientes Activos"
          value={totalClients}
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />
        <MetricCard
          title="Por Confirmar"
          value={pendingConfirmations}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <MetricCard
          title="Oportunidades Renovación"
          value={renewalOpportunities}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes por Equipos</CardTitle>
            <CardDescription>
              Clientes con mayor base instalada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.length > 0 ? (
                topClients.map((client) => (
                  <Link
                    key={client.clientName}
                    to={`/installed-base/${client.clientName}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {client.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.city}, {client.country}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {client.totalEquipmentCount}
                      </p>
                      <p className="text-xs text-destructive">Ver detalles</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de clientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Modalidad</CardTitle>
            <CardDescription>
              Equipos en la base instalada por tipo
            </CardDescription>
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
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={28}
                    >
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
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                La distribución aparecerá cuando haya equipos registrados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.keys(statusCounts).length > 0 ? (
                Object.entries(statusCounts).map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded"
                      style={{
                        backgroundColor:
                          STATUS_COLOR_MAP[label] ?? "var(--muted-foreground)",
                      }}
                    />
                    <span className="text-sm text-muted-foreground flex-1">
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
    </div>
  )
}
