import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import {
  Database,
  Download,
  Copy,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  Filter,
  MessageCircle,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  Badge,
  StatusBadge,
  PageHeader,
} from "@/components/common"
import { SearchForm } from "@/components/forms"
import { LoadingMessages } from "@/components/common/LoadingMessages"
import { api } from "@/services/api"
import { mapSearchResponse } from "@/lib/mappers"
import type { ClientInstalledBase, QueryIntent } from "@/types"

const exampleQueries = [
  "Clientes en Brasil con resonadores de más de siete años",
  "Tomógrafos Philips con más de 10 años de antigüedad",
  "Oportunidades de renovación en Colombia",
  "Equipos reportados sin confirmar",
  "Base instalada por país",
  "Duplicados detectados esta semana",
  "Equipos con confianza menor al 70%",
  "Resonadores Siemens instalados después de 2020",
]

const QUICK_STATS = [
  { label: "Total Equipos", key: "total_equipment", icon: Database, color: "blue" },
  { label: "Confirmados", key: "confirmed", icon: CheckCircle, color: "emerald" },
  { label: "Pendientes", key: "pending", icon: Clock, color: "amber" },
  { label: "Renovaciones (>7 años)", key: "renewals", icon: AlertTriangle, color: "red" },
  { label: "Clientes", key: "clients", icon: Database, color: "purple" },
  { label: "Modalidades", key: "modalities", icon: Filter, color: "orange" },
] as const

const STAT_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-info-soft", text: "text-info-soft-foreground" },
  emerald: { bg: "bg-success-soft", text: "text-success-soft-foreground" },
  amber: { bg: "bg-warning-soft", text: "text-warning-soft-foreground" },
  red: { bg: "bg-danger-soft", text: "text-danger-soft-foreground" },
  purple: { bg: "bg-info-soft", text: "text-info-soft-foreground" },
  orange: { bg: "bg-warning-soft", text: "text-warning-soft-foreground" },
}

export function QueriesPage() {
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [currentQuery, setCurrentQuery] = useState<{
    query: string
    parsedIntent: QueryIntent
    results: ClientInstalledBase[]
    filters: Record<string, unknown>
    naturalResponse: string
  } | null>(null)
  const [stats, setStats] = useState<{
    total_equipment: number
    confirmed: number
    pending: number
    renewals: number
    clients: number
    modalities: number
    by_modality: Record<string, number>
  } | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [dashboard] = await Promise.all([api.dashboard()])
        setStats({
          total_equipment: dashboard.total_equipment,
          confirmed: dashboard.total_equipment - dashboard.pending_confirmations,
          pending: dashboard.pending_confirmations,
          renewals: dashboard.renewal_opportunities,
          clients: dashboard.total_clients,
          modalities: Object.keys(dashboard.by_modality ?? {}).length,
          by_modality: dashboard.by_modality ?? {},
        })
      } catch (err) {
        console.error("Stats load error:", err)
      }
    }
    loadStats()
  }, [])

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setCurrentQuery(null)
    setQueryError(null)

    try {
      const response = await api.search(query)
      const { results, filters, intent, naturalResponse } = mapSearchResponse(response)
      setCurrentQuery({
        query,
        parsedIntent: (intent as QueryIntent) ?? "UNKNOWN",
        results,
        filters,
        naturalResponse,
      })
    } catch (err) {
      console.error("Search error:", err)
      setQueryError(
        "ATLAS no pudo responder esta pregunta. Revisa que el backend local y QVAC estén disponibles."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const initial = searchParams.get("q")
    if (!initial) return
    let active = true
    const run = async () => {
      setIsLoading(true)
      setCurrentQuery(null)
      setQueryError(null)
      try {
        const response = await api.search(initial)
        const { results, filters, intent, naturalResponse } = mapSearchResponse(response)
        if (!active) return
        setCurrentQuery({
          query: initial,
          parsedIntent: (intent as QueryIntent) ?? "UNKNOWN",
          results,
          filters,
          naturalResponse,
        })
      } catch (err) {
        console.error("Search error:", err)
        if (active) {
          setQueryError(
            "ATLAS no pudo responder esta pregunta. Revisa que el backend local y QVAC estén disponibles."
          )
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [searchParams])

  const handleExport = () => {
    if (!currentQuery) return
    const csv = [
      ["Cliente", "Ciudad", "País", "Modalidad", "Marca", "Modelo", "Años", "Estado"],
      ...currentQuery.results.flatMap((c) =>
        c.equipments.map((e) => [
          c.clientName,
          c.city,
          c.country,
          e.modality,
          e.brand || "",
          e.model || "",
          e.ageYears?.toString() || "",
          e.status,
        ])
      ),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `atlas-query-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopySQL = () => {
    if (!currentQuery?.filters) return
    navigator.clipboard.writeText(
      JSON.stringify(currentQuery.filters, null, 2)
    )
  }


  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Consultas en lenguaje natural"
        title="Pregúntale a ATLAS"
        description="Consultas convertidas en filtros permitidos sobre la base instalada. Nunca se ejecuta SQL generado por un modelo."
        actions={
          <Button
            variant="secondary"
            onClick={() => setShowExamples(!showExamples)}
          >
            <ChevronDown className="w-4 h-4 mr-1" /> Ejemplos
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SearchForm
            onSearch={handleSearch}
            isLoading={isLoading}
            suggestions={exampleQueries}
            onSuggestionClick={handleSearch}
            initialValue={searchParams.get("q") ?? ""}
          />

          {queryError && (
            <div
              className="flex items-start gap-3 rounded-xl border border-danger-soft-foreground/25 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{queryError}</span>
            </div>
          )}

          {isLoading && (
            <div
              className="flex items-center gap-3 text-sm text-muted-foreground"
              role="status"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5 animate-pulse" />
              </div>
              <LoadingMessages
                messages={[
                  "ATLAS está interpretando tu pregunta...",
                  "Buscando en la base instalada local...",
                  "Preparando una respuesta natural...",
                ]}
              />
            </div>
          )}

          {showExamples && (
            <Card>
              <CardHeader>
                <CardTitle>Ejemplos de Consultas</CardTitle>
                <CardDescription>
                  Haz clic en cualquier ejemplo para ejecutarlo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exampleQueries.map((eq) => (
                    <Button
                      key={eq}
                      variant="ghost"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => handleSearch(eq)}
                      disabled={isLoading}
                    >
                      {eq}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {currentQuery && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-br-md bg-primary/10 px-4 py-3 text-sm text-foreground shadow-sm">
                  {currentQuery.query}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <Card className="min-w-0 flex-1">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Respuesta de ATLAS</CardTitle>
                        <CardDescription>
                          {currentQuery.naturalResponse}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleExport}
                          disabled={currentQuery.results.length === 0}
                        >
                          <Download className="w-4 h-4 mr-1" /> Exportar CSV
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopySQL}
                        >
                          <Copy className="w-4 h-4 mr-1" /> Copiar Filtros
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {currentQuery.results.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          No encontré equipos para mostrar. Prueba con alguna
                          de estas consultas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {exampleQueries.slice(0, 4).map((eq) => (
                            <Button
                              key={eq}
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSearch(eq)}
                            >
                              {eq}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentQuery.results.map((client) => (
                          <div
                            key={client.clientId}
                            className="border border-border rounded-lg overflow-hidden"
                          >
                            <div className="p-4 bg-muted border-b border-border">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium text-foreground">
                                    {client.clientName}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {client.city}, {client.country}
                                  </p>
                                </div>
                                <Badge>
                                  {client.equipments.length} equipos
                                </Badge>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 max-h-60 overflow-y-auto scrollbar-thin">
                                {client.equipments.map((equipment) => (
                                  <div
                                    key={equipment.id}
                                    className="p-3 bg-background border border-border rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <StatusBadge
                                        status={equipment.status}
                                        size="sm"
                                      />
                                      <span className="font-medium text-sm text-foreground">
                                        {equipment.modality}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {equipment.brand} {equipment.model || ""}
                                    </p>
                                    {equipment.ageYears && (
                                      <p
                                        className={`text-xs ${
                                          equipment.ageYears > 7
                                            ? "text-destructive"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {equipment.ageYears} años{" "}
                                        {equipment.ageYears > 7 && (
                                          <AlertTriangle className="inline w-3 h-3" />
                                        )}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground/70">
                                      Confianza:{" "}
                                      {(equipment.confidence * 100).toFixed(0)}%
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {currentQuery && (
            <Card>
              <CardHeader>
                <CardTitle>Filtros Aplicados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-neutral-soft text-foreground p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-48 overflow-y-auto">
                    <code>
                      {JSON.stringify(currentQuery.filters, null, 2)}
                    </code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleCopySQL}
                  >
                    <Copy className="w-4 h-4 mr-1" /> Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats &&
                  QUICK_STATS.map((item) => {
                    const colors = STAT_COLOR_MAP[item.color]
                    const value = stats[item.key as keyof typeof stats] as number
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-3 p-3 rounded-lg ${colors.bg}`}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                          <item.icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {value}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Modalidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats &&
                  Object.entries(stats.by_modality).map(([name, count]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="text-sm text-muted-foreground flex-1">
                        {name}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {count}
                      </span>
                      <div className="w-24 h-2 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary rounded"
                          style={{
                            width: `${(count / Math.max(...Object.values(stats.by_modality), 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
