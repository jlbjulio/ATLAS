import { type HTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"
import type { ObservationStatus } from "@/types"

type BadgeVariant =
  | "confirmed"
  | "reported"
  | "estimated"
  | "unknown"
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: "sm" | "md"
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  confirmed: "bg-success-soft text-success-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  reported: "bg-info-soft text-info-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  estimated: "bg-warning-soft text-warning-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  unknown: "bg-neutral-soft text-neutral-soft-foreground",
  default: "bg-secondary text-secondary-foreground",
}

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", size = "md", className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
)
Badge.displayName = "Badge"

export const STATUS_LABELS: Record<ObservationStatus, string> = {
  CONFIRMED: "Confirmado",
  REPORTED: "Reportado",
  ESTIMATED: "Estimado",
  UNKNOWN: "Desconocido",
}

const STATUS_DESCRIPTIONS: Record<ObservationStatus, string> = {
  CONFIRMED: "Verificado y aceptado en la base instalada.",
  REPORTED: "Observado en campo, aún sin verificación independiente.",
  ESTIMATED: "Inferido por el modelo; requiere confirmación humana.",
  UNKNOWN: "Dato faltante o no concluyente.",
}

const STATUS_VARIANT: Record<ObservationStatus, BadgeVariant> = {
  CONFIRMED: "confirmed",
  REPORTED: "reported",
  ESTIMATED: "estimated",
  UNKNOWN: "unknown",
}

export function StatusBadge({
  status,
  size = "md",
  showLabel,
  className,
}: {
  status: ObservationStatus
  size?: "sm" | "md"
  showLabel?: boolean
  className?: string
}) {
  return (
    <Badge
      variant={STATUS_VARIANT[status]}
      size={size}
      className={className}
      title={STATUS_DESCRIPTIONS[status]}
    >
      {showLabel ? STATUS_LABELS[status] : status}
    </Badge>
  )
}
