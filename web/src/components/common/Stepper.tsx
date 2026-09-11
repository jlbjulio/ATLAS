import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepperProps {
  steps: string[]
  current: number
  className?: string
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      aria-label="Progreso del flujo"
    >
      {steps.map((step, index) => {
        const isDone = index < current
        const isActive = index === current
        return (
          <li
            key={step}
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 border-t-2 pt-2 text-xs font-medium",
              isDone && "border-success text-success",
              isActive && "border-primary text-primary-readable",
              !isDone && !isActive && "border-border text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                isDone && "border-success bg-success/15 text-success",
                isActive && "border-primary bg-primary/15 text-primary-readable",
                !isDone && !isActive && "border-border text-muted-foreground",
              )}
            >
              {isDone ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span className="truncate">{step}</span>
          </li>
        )
      })}
    </ol>
  )
}
