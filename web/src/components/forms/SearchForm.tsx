import { useState, type FormEvent } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/common";

interface SearchFormProps {
  onSearch: (query: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function SearchForm({
  onSearch,
  isLoading = false,
  placeholder = "Consulta en lenguaje natural...",
  suggestions = [],
  onSuggestionClick,
}: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await onSearch(query);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSuggestionClick?.(suggestion);
  };

  const defaultSuggestions = [
    "Clientes en Brasil con resonadores de más de siete años",
    "Tomógrafos Philips con más de 10 años",
    "Oportunidades de renovación en Colombia",
    "Equipos reportados sin confirmar",
    "Base instalada por país",
    "Duplicados detectados esta semana",
  ];

  const allSuggestions = [...new Set([...defaultSuggestions, ...suggestions])];

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Conversa con ATLAS</CardTitle>
            <p className="mt-1 text-sm font-normal text-surface-500">Pregunta por clientes, equipos, antigüedad o renovaciones.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="relative">
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 transition-colors focus-within:border-primary-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-100">
            <textarea
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder === "Consulta en lenguaje natural..." ? "Ej. ¿Qué tomógrafos Philips necesitan renovación?" : placeholder}
              className="min-h-[88px] w-full resize-none border-0 bg-transparent p-0 text-base text-surface-900 outline-none placeholder:text-surface-400 focus:ring-0"
              disabled={isLoading}
              aria-label="Pregunta para ATLAS"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setQuery("")}
                  aria-label="Limpiar pregunta"
                >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {showSuggestions && query && (
            <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-surface-200 rounded-lg shadow-lg scrollbar-thin">
              <ul className="py-1">
                {allSuggestions
                  .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
                  .slice(0, 8)
                  .map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-2 text-left text-sm text-surface-700 hover:bg-surface-50 transition-colors flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-surface-400" />
                        {suggestion}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <Button
              type="submit"
              loading={isLoading}
              disabled={!query.trim() || isLoading}
              className="w-full sm:w-auto"
            >
              {!isLoading && <Sparkles className="w-4 h-4" />}
              Preguntar a ATLAS
            </Button>
            {isLoading && (
              <span className="text-sm text-surface-500">ATLAS está pensando localmente...</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
