import { type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: number | string
  icon: ReactNode
  color: "blue" | "emerald" | "amber" | "orange"
}

const colorMap = {
  blue: "bg-blue-500/10 text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  orange: "bg-orange-500/10 text-orange-400",
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
