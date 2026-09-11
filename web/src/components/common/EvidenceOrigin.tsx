import { type ReactNode } from "react"
import { Calendar, Camera, Mic, RefreshCw, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface EvidenceOriginProps {
  observerName?: string
  createdAt?: string
  sourceId?: string
  imageCount?: number
  hasAudio?: boolean
  synced?: boolean
  className?: string
}

function Chip({
  icon,
  children,
}: {
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
      {icon}
      {children}
    </span>
  )
}

export function EvidenceOrigin({
  observerName,
  createdAt,
  sourceId,
  imageCount,
  hasAudio,
  synced,
  className,
}: EvidenceOriginProps) {
  const hasData =
    observerName || createdAt || sourceId || imageCount || hasAudio
  if (!hasData) return null

  const dateLabel = createdAt
    ? new Date(createdAt).toLocaleString("es-ES", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Evidencia de origen
      </p>
      <div className="flex flex-wrap gap-2">
        {observerName && (
          <Chip icon={<User className="h-3.5 w-3.5" />}>{observerName}</Chip>
        )}
        {dateLabel && (
          <Chip icon={<Calendar className="h-3.5 w-3.5" />}>{dateLabel}</Chip>
        )}
        {typeof imageCount === "number" && imageCount > 0 && (
          <Chip icon={<Camera className="h-3.5 w-3.5" />}>
            {imageCount} foto{imageCount > 1 ? "s" : ""}
          </Chip>
        )}
        {hasAudio && <Chip icon={<Mic className="h-3.5 w-3.5" />}>Nota de voz</Chip>}
        <Chip icon={<RefreshCw className="h-3.5 w-3.5" />}>
          {synced ? "Sincronizado" : "Pendiente de sincronizar"}
        </Chip>
      </div>
      {sourceId && (
        <p className="font-mono text-[11px] text-muted-foreground/70">
          {sourceId}
        </p>
      )}
    </div>
  )
}
