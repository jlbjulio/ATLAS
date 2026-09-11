import { useEffect, useState } from "react";
import { Check, Loader2, MessageCircle } from "lucide-react";

import { InlineProgress, TypingDots } from "@/components/common/TypingDots";

export type QueryStage = "searching" | "answering";

const STEPS = [
  "Interpretando la pregunta",
  "Buscando en la base instalada",
  "Redactando la respuesta",
];

export function QueryProgress({ stage }: { stage: QueryStage }) {
  const [elapsed, setElapsed] = useState(0);
  const [searchStep, setSearchStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === "answering") {
      setSearchStep(2);
      return;
    }
    const timer = setTimeout(() => setSearchStep((step) => (step === 0 ? 1 : step)), 6000);
    return () => clearTimeout(timer);
  }, [stage]);

  const activeStep = stage === "answering" ? 2 : searchStep;

  return (
    <div
      className="animate-fade-in rounded-xl border border-border bg-card px-4 py-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary-readable">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <MessageCircle className="relative h-5 w-5" />
        </span>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          ATLAS está trabajando
          <TypingDots />
        </div>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {elapsed}s
        </span>
      </div>

      <ol className="mt-4 space-y-2">
        {STEPS.map((label, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <li
              key={label}
              className={`flex items-center gap-2 text-sm ${
                done
                  ? "text-muted-foreground"
                  : active
                    ? "text-foreground"
                    : "text-muted-foreground/60"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                  done
                    ? "border-success-soft-foreground/30 bg-success-soft text-success-soft-foreground"
                    : active
                      ? "border-primary/40 bg-primary/10 text-primary-readable"
                      : "border-border text-muted-foreground/60"
                }`}
              >
                {done ? (
                  <Check className="h-3 w-3" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 rounded-full bg-primary animate-indeterminate" />
      </div>

      {elapsed >= 4 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {elapsed >= 14
            ? "La primera consulta puede tardar ~20 segundos mientras el modelo local se prepara."
            : "Todo el procesamiento ocurre en este dispositivo, sin enviar datos afuera."}
        </p>
      )}
    </div>
  );
}

export function AnswerTyping() {
  return <InlineProgress label="ATLAS está redactando la respuesta..." />;
}
