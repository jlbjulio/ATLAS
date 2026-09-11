import { useEffect, useState } from "react";

interface LoadingMessagesProps {
  messages: string[];
  interval?: number;
  className?: string;
}

export function LoadingMessages({
  messages,
  interval = 900,
  className = "",
}: LoadingMessagesProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, interval);
    return () => clearInterval(timer);
  }, [messages.length, interval]);

  return (
    <span
      className={`inline-block transition-opacity duration-200 ${className}`}
      key={index}
    >
      {messages[index]}
    </span>
  );
}
