import { cn } from "@/lib/utils"

export function ConfidenceBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  const bar =
    value >= 0.8
      ? "bg-success"
      : value >= 0.6
        ? "bg-accent"
        : "bg-destructive"
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-9 text-right text-xs font-medium tabular-nums text-foreground">
        {pct}%
      </span>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
