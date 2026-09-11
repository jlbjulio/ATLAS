import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import {
  Atom,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Magnet,
  MoreHorizontal,
  Scan,
  Waves,
  Monitor,
} from "lucide-react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./Button"
import { StatusBadge } from "./Badge"
import { ConfidenceBar } from "./ConfidenceBar"
import { EmptyState } from "./EmptyState"
import { formatBrand, formatDate, formatModality, isOpportunity } from "@/lib/format"
import type { Equipment, EquipmentModality } from "@/types"

const MODALITY_ICONS: Record<EquipmentModality, typeof Scan> = {
  MRI: Magnet,
  CT: Scan,
  XRAY: Atom,
  ULTRASOUND: Waves,
  PET: Atom,
  SPECT: Atom,
  MAMMOGRAPHY: Scan,
  FLUOROSCOPY: Scan,
  OTHER: Monitor,
}

function SortHeader({
  label,
  sorted,
  onToggle,
}: {
  label: string
  sorted: false | "asc" | "desc"
  onToggle: () => void
}) {
  return (
    <button
      className="flex items-center gap-1 transition-colors hover:text-foreground"
      onClick={onToggle}
    >
      {label}
      {sorted === "asc" ? (
        <ChevronUp className="h-4 w-4" />
      ) : sorted === "desc" ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      )}
    </button>
  )
}

interface EquipmentTableProps {
  data: Equipment[]
  pageSize?: number
  showClient?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
}

export function EquipmentTable({
  data,
  pageSize = 10,
  showClient = true,
  emptyTitle = "Sin equipos",
  emptyDescription = "No hay equipos que coincidan con los filtros.",
  emptyAction,
}: EquipmentTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<Equipment>[]>(() => {
    const cols: ColumnDef<Equipment>[] = [
      {
        accessorKey: "modality",
        header: "Equipo",
        cell: ({ row }) => {
          const eq = row.original
          const Icon = MODALITY_ICONS[eq.modality] ?? Monitor
          return (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {formatModality(eq.modality)}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {eq.serialNumber || "Sin N.º de serie"}
                </p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "brand",
        header: "Fabricante",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {formatBrand(row.original.brand)}
          </span>
        ),
      },
      {
        accessorKey: "model",
        header: "Modelo",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.model || "—"}
          </span>
        ),
      },
    ]

    if (showClient) {
      cols.push({
        id: "client",
        header: "Cliente",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">
            {row.original.location?.client || "—"}
          </span>
        ),
      })
    }

    cols.push(
      {
        id: "location",
        header: "Ubicación",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.location
              ? `${row.original.location.city}, ${row.original.location.country}`
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "ageYears",
        header: ({ column }) => (
          <SortHeader
            label="Antigüedad"
            sorted={column.getIsSorted()}
            onToggle={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => {
          const age = row.original.ageYears
          return (
            <span className="text-sm text-foreground">
              {age ? `${age} años` : "—"}
            </span>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <StatusBadge status={row.original.status} size="sm" showLabel />
            {isOpportunity(row.original) && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning-soft-foreground">
                Oportunidad
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "confidence",
        header: ({ column }) => (
          <SortHeader
            label="Confianza"
            sorted={column.getIsSorted()}
            onToggle={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => <ConfidenceBar value={row.original.confidence} />,
      },
      {
        accessorKey: "lastSeen",
        header: ({ column }) => (
          <SortHeader
            label="Última obs."
            sorted={column.getIsSorted()}
            onToggle={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.lastSeen)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Acciones">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const client = row.original.location?.client
                    navigate(
                      client
                        ? `/installed-base/${encodeURIComponent(client)}`
                        : "/installed-base",
                    )
                  }}
                >
                  Ver cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    )

    return cols
  }, [navigate, showClient])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Monitor className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }

  return (
    <div>
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
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between border-t border-border px-2 py-4">
          <p className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()} · {data.length} equipos
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
    </div>
  )
}
