import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface NextBestQuestionProps {
  missingFields?: string[]
  followUpQuestions?: string[]
  className?: string
}

export function NextBestQuestion({
  missingFields = [],
  followUpQuestions = [],
  className,
}: NextBestQuestionProps) {
  if (missingFields.length === 0 && followUpQuestions.length === 0) return null

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4",
        className,
      )}
      role="status"
    >
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
        <AlertTriangle className="h-4 w-4" />
        Un dato más para completar el registro
      </h4>
      <p className="mb-2 text-xs text-amber-100/80">
        ATLAS pregunta solo por lo que más aporta a la confianza del registro.
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-amber-100/90">
        {followUpQuestions.map((q, i) => (
          <li key={`q-${i}`}>{q}</li>
        ))}
        {missingFields.map((field, i) => (
          <li key={`f-${i}`}>Campo faltante: {field}</li>
        ))}
      </ul>
    </div>
  )
}
