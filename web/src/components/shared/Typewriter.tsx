import { useEffect, useState } from "react";

interface TypewriterProps {
  text: string;
  charsPerTick?: number;
  intervalMs?: number;
}

export function Typewriter({
  text,
  charsPerTick = 2,
  intervalMs = 14,
}: TypewriterProps) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!text) return;
    let index = 0;
    const timer = setInterval(() => {
      index = Math.min(text.length, index + charsPerTick);
      setShown(text.slice(0, index));
      if (index >= text.length) clearInterval(timer);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [text, charsPerTick, intervalMs]);

  const done = shown.length >= text.length;

  return (
    <span>
      {shown}
      {!done && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" />
      )}
    </span>
  );
}
