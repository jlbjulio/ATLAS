export function TypingDots({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      aria-hidden="true"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce-dot"
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </span>
  );
}

interface InlineProgressProps {
  label: string;
  className?: string;
}

export function InlineProgress({ label, className = "" }: InlineProgressProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-sm text-muted-foreground animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      <TypingDots />
      {label}
    </span>
  );
}
