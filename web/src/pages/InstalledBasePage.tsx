import { useEffect, useState, useMemo } from "react"
import {
  Search,
  Database,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Modal,
  PageHeader,
  EmptyState,
} from "@/components/common"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/services/api"
import { mapInstalledBase } from "@/lib/mappers"
import type { ClientInstalledBase } from "@/types"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table"

const MODALITY_FILTERS = [
  { value: "", label: "Todas las modalidades" },
  { value: "MRI", label: "MRI" },
  { value: "CT", label: "CT" },
  { value: "XRAY", label: "X-Ray" },
  { value: "ULTRASOUND", label: "Ultrasonido" },
  { value: "PET", label: "PET" },
  { value: "OTHER", label: "Otro" },
]

const STATUS_FILTERS = [
  { value: "", label: "Todos los estados" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "REPORTED", label: "Reportado" },
  { value: "ESTIMATED", label: "Estimado" },
  { value: "UNKNOWN", label: "Desconocido" },
]

const BRAND_FILTERS = [
  { value: "", label: "Todas las marcas" },
  { value: "PHILIPS", label: "Philips" },
  { value: "SIEMENS", label: "Siemens" },
  { value: "GE", label: "GE" },
  { value: "CANON", label: "Canon" },
  { value: "OTHER", label: "Otra" },
]

const PAGE_SIZE = 10

export function InstalledBasePage() {
  const [clients, setClients] = useState<ClientInstalledBase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [modalityFilter, setModalityFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientInstalledBase | null>(null)
  const [viewMode] = useState<"cards" | "table">("table")
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await api.installedBase()
        setClients(mapInstalledBase(data))
      } catch (err) {
        setError("Error cargando la base instalada")
        console.error("Installed base load error:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.country.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesModality =
        !modalityFilter ||
        client.equipments.some((e) => e.modality === modalityFilter)
      const matchesStatus =
        !statusFilter ||
        client.equipments.some((e) => e.status === statusFilter)
      const matchesBrand =
        !brandFilter ||
        client.equipments.some((e) => e.brand === brandFilter)

      return matchesSearch && matchesModality && matchesStatus && matchesBrand
    })
  }, [clients, searchQuery, modalityFilter, statusFilter, brandFilter])

  const allEquipments = useMemo(
    () => clients.flatMap((c) => c.equipments),
    [clients]
  )

  const handleViewDetails = (client: ClientInstalledBase) => {
    setSelectedClient(client)
  }

  const columns: ColumnDef<ClientInstalledBase>[] = useMemo(
    () => [
      {
        accessorKey: "clientName",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.clientName}
          </span>
        ),
      },
      {
        accessorKey: "city",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Ubicación
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.city}, {row.original.country}
          </span>
        ),
      },
      {
        accessorKey: "totalEquipmentCount",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Equipos
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <Badge variant="default">{row.original.totalEquipmentCount} equipos</Badge>
        ),
      },
      {
        id: "modalities",
        header: "Modalidades",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {Array.from(new Set(row.original.equipments.map((e) => e.modality)))
              .slice(0, 3)
              .map((mod) => (
                <Badge key={mod} variant="default" className="text-xs">
                  {mod}
                </Badge>
              ))}
          </div>
        ),
      },
      {
        id: "renewal",
        header: "Renovaciones",
        cell: ({ row }) =>
          row.original.renewalOpportunities > 0 ? (
            <Badge variant="warning">
              {row.original.renewalOpportunities} oportunidades
            </Badge>
          ) : (
            <Badge variant="success">Sin urgencia</Badge>
          ),
      },
      {
        accessorKey: "lastVisit",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Última Visita
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="w-4 h-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.lastVisit).toLocaleDateString("es-ES")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewDetails(row.original)}
            >
              Ver
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredClients,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base instalada"
        title="Explorar base"
        description="Explora los equipos por cliente y geografía, revisa su calidad y detecta oportunidades de renovación."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar cliente, ciudad, país..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
            <Select
              value={modalityFilter}
              onValueChange={setModalityFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                {MODALITY_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={brandFilter}
              onValueChange={setBrandFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary-readable" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Equipos</p>
                <p className="text-2xl font-bold text-foreground">
                  {allEquipments.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success-soft flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success-soft-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmados</p>
                <p className="text-2xl font-bold text-foreground">
                  {allEquipments.filter((e) => e.status === "CONFIRMED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning-soft flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning-soft-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-foreground">
                  {allEquipments.length -
                    allEquipments.filter((e) => e.status === "CONFIRMED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Oportunidades Renovación
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {
                    allEquipments.filter(
                      (e) => e.ageYears && e.ageYears > 7
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(searchQuery || modalityFilter || statusFilter || brandFilter) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {filteredClients.reduce(
              (sum, client) =>
                sum +
                client.equipments.reduce((s, e) => s + e.quantity, 0),
              0
            )}{" "}
            unidades coinciden
          </span>
          <span>en {filteredClients.length} clientes</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchQuery("")
              setModalityFilter("")
              setStatusFilter("")
              setBrandFilter("")
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {viewMode === "table" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-40 text-center">
                        <EmptyState
                          className="border-0 bg-transparent"
                          icon={<Database className="h-6 w-6" />}
                          title="No se encontraron clientes"
                          description="Ajusta los filtros o limpia la búsqueda para ver toda la base."
                          action={
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSearchQuery("")
                                setModalityFilter("")
                                setStatusFilter("")
                                setBrandFilter("")
                              }}
                            >
                              Limpiar filtros
                            </Button>
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {table.getPageCount() > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Página {pagination.pageIndex + 1} de {table.getPageCount()}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedClient && (
        <Modal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={selectedClient.clientName}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {selectedClient.city}, {selectedClient.country}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Última visita:{" "}
                {new Date(selectedClient.lastVisit).toLocaleDateString("es-ES")}
              </span>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">
                Equipos ({selectedClient.totalEquipmentCount})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {selectedClient.equipments.map((equipment) => (
                  <div
                    key={equipment.id}
                    className="p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge
                            status={equipment.status}
                            size="sm"
                            showLabel
                          />
                          <span className="font-medium text-foreground">
                            {equipment.modality}
                          </span>
                          {equipment.brand && (
                            <span className="text-sm text-muted-foreground">
                              {equipment.brand}
                            </span>
                          )}
                          {equipment.model && (
                            <span className="text-sm text-muted-foreground/70">
                              {equipment.model}
                            </span>
                          )}
                          {equipment.ageYears && (
                            <span className="text-sm text-muted-foreground/70">
                              {equipment.ageYears} años
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>Cantidad: ×{equipment.quantity}</span>
                          <span>
                            Confianza: {(equipment.confidence * 100).toFixed(0)}%
                          </span>
                          {equipment.ageYears && equipment.ageYears > 7 && (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Candidato renovación
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
