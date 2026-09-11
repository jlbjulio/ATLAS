import { cn } from "@/lib/utils"

interface ConfidenceMeterProps {
  value: number
  showPercent?: boolean
  description?: string
  className?: string
}

function level(value: number) {
  if (value >= 0.8)
    return {
      label: "Alta",
      text: "text-emerald-300",
      bar: "bg-emerald-400",
    }
  if (value >= 0.6)
    return { label: "Media", text: "text-amber-300", bar: "bg-amber-400" }
  return { label: "Baja", text: "text-red-300", bar: "bg-red-400" }
}

export function ConfidenceMeter({
  value,
  showPercent = true,
  description,
  className,
}: ConfidenceMeterProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  const { label, text, bar } = level(value)

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Confianza</span>
        <span className={cn("font-semibold", text)}>
          {label}
          {showPercent ? ` · ${pct}%` : ""}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confianza ${label}`}
      >
        <div
          className={cn("h-full rounded-full transition-all", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
