import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  Button,
  StatCard,
  EmptyState,
  QualityDonut,
  EquipmentTable,
} from "@/components/common"
import { SharedPowerCard } from "@/components/shared/SharedPowerCard"
import { P2PSessionsCard } from "@/components/shared/P2PSessionsCard"
import { api, type DashboardStats } from "@/services/api"
import { useInstalledBase } from "@/hooks/useInstalledBase"
import { average } from "@/lib/format"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { equipments, loading: loadingBase, error } = useInstalledBase()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    let mounted = true
    api
      .dashboard()
      .then((data) => {
        if (mounted) setStats(data)
      })
      .catch((err) => console.error("Dashboard stats error:", err))
    return () => {
      mounted = false
    }
  }, [])

  const quality = useMemo(
    () => average(equipments.map((e) => e.confidence)),
    [equipments],
  )

  const recent = useMemo(
    () =>
      [...equipments]
        .sort(
          (a, b) =>
            new Date(b.lastSeen ?? 0).getTime() -
            new Date(a.lastSeen ?? 0).getTime(),
        )
        .slice(0, 8),
    [equipments],
  )

  if (loadingBase) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary-readable" />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6 text-danger-soft-foreground" />}
        title="No se pudo cargar el panel"
        description={error}
      />
    )
  }

  const statusCounts = stats?.status_counts ?? {}

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <img
          src="/mountains-light.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover dark:hidden"
        />
        <img
          src="/mountains-dark.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 hidden h-full w-full object-cover dark:block"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/40 dark:from-card dark:via-card/90 dark:to-card/50" />
        <div className="relative flex flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {greeting()}, Usuario
            </h1>
            <p className="mt-1 text-lg font-medium text-foreground/90">
              Del trabajo de campo a una decisión.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Convierte fotografías, voz y notas en una base instalada
              verificable, mejora la calidad de tus datos y descubre
              oportunidades de servicio y renovación.
            </p>
          </div>
          <div className="hidden text-right lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-readable">
              Datos de campo
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Impacto real
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total equipos"
          value={stats?.total_equipment ?? equipments.length}
          hint="Lectura actual de la base local"
          icon={<Database className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          title="Clientes activos"
          value={stats?.total_clients ?? 0}
          hint="Lectura actual de la base local"
          icon={<CheckCircle className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          title="Por confirmar"
          value={stats?.pending_confirmations ?? 0}
          hint="Equipos con datos pendientes"
          icon={<Clock className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          title="Oportunidades de renovación"
          value={stats?.renewal_opportunities ?? 0}
          hint="Equipos > 7 años"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      {(stats?.stale_assets ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => navigate("/opportunities")}
          className="flex w-full items-start gap-3 rounded-lg border border-warning-soft-foreground/25 bg-warning-soft px-4 py-3 text-left text-sm text-warning-soft-foreground transition-colors hover:bg-warning-soft/80"
        >
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <strong className="font-medium">
              {stats?.stale_assets} equipos sin verificar recientemente.
            </strong>{" "}
            Han pasado más de 12 meses desde la última observación. Revísalos
            para mantener la base instalada al día.
          </span>
        </button>
      )}

      <SharedPowerCard />

      <P2PSessionsCard />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Calidad de datos</CardTitle>
            <CardDescription>
              Puntaje explicable según completitud y evidencia
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            <QualityDonut value={quality} />
            <div className="w-full space-y-2">
              {[
                { label: "Confirmados", value: statusCounts.Confirmado ?? 0 },
                { label: "Reportados", value: statusCounts.Reportado ?? 0 },
                { label: "Estimados", value: statusCounts.Estimado ?? 0 },
                { label: "Desconocidos", value: statusCounts.Desconocido ?? 0 },
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
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => navigate("/data-quality")}
            >
              Ver detalle
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Equipos recientes</CardTitle>
                <CardDescription>
                  Últimas observaciones procesadas
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate("/queries")}
                >
                  <Search className="h-4 w-4" /> Consultar
                </Button>
                <Button size="sm" onClick={() => navigate("/capture")}>
                  <Mic className="h-4 w-4" /> Nueva captura
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <EquipmentTable
              data={recent}
              pageSize={8}
              emptyTitle="Sin equipos todavía"
              emptyDescription="Captura tu primera observación para poblar la base."
              emptyAction={
                <Button variant="primary" onClick={() => navigate("/capture")}>
                  <Mic className="h-4 w-4" /> Nueva captura
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
