import { type ReactNode } from "react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type Accent = "blue" | "emerald" | "amber" | "orange" | "red"

const ACCENT_CLASSES: Record<Accent, string> = {
  blue: "bg-info-soft text-info-soft-foreground",
  emerald: "bg-success-soft text-success-soft-foreground",
  amber: "bg-warning-soft text-warning-soft-foreground",
  orange: "bg-warning-soft text-warning-soft-foreground",
  red: "bg-danger-soft text-danger-soft-foreground",
}

interface StatCardProps {
  title: string
  value: ReactNode
  icon: ReactNode
  hint?: string
  accent?: Accent
  delta?: { value: string; trend: "up" | "down" }
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  icon,
  hint,
  accent = "blue",
  delta,
  className,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(onClick && "cursor-pointer transition-shadow hover:shadow-md", className)}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {value}
              </span>
              {delta && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                    delta.trend === "up"
                      ? "bg-success-soft text-success-soft-foreground"
                      : "bg-danger-soft text-danger-soft-foreground",
                  )}
                >
                  {delta.trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {delta.value}
                </span>
              )}
            </div>
          </div>
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              ACCENT_CLASSES[accent],
            )}
          >
            {icon}
          </span>
        </div>
        {hint && <p className="mt-3 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}
