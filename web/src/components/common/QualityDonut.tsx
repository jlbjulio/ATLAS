import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

interface QualityDonutProps {
  value: number
  label?: string
}

export function QualityDonut({ value, label = "Calidad general" }: QualityDonutProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  const data = [
    { name: "quality", value: pct },
    { name: "rest", value: 100 - pct },
  ]
  return (
    <div className="relative h-44 w-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={58}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            cornerRadius={8}
            isAnimationActive={false}
          >
            <Cell fill="var(--primary)" />
            <Cell fill="var(--muted)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{pct}%</span>
        <span className="mt-0.5 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
