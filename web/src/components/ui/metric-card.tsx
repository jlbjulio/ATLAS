import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: number | string
  icon: ReactNode
  color: "blue" | "emerald" | "amber" | "orange"
}

const colorMap = {
  blue: "bg-info-soft text-info-soft-foreground",
  emerald: "bg-success-soft text-success-soft-foreground",
  amber: "bg-warning-soft text-warning-soft-foreground",
  orange: "bg-warning-soft text-warning-soft-foreground",
}

export function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">
              {value}
            </p>
          </div>
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg ${colorMap[color]}`}
          >
            {icon}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Lectura actual de la base local
        </p>
      </CardContent>
    </Card>
  )
}
