import { useState, type FormEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";
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
        <CardTitle>Consulta Inteligente de Base Instalada</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={placeholder}
              className="input pl-10 pr-12 py-3 text-base"
              disabled={isLoading}
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
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
                        <Search className="w-4 h-4 text-surface-400" />
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
              <Loader2 className="w-4 h-4" />
              Buscar
            </Button>
            {isLoading && (
              <span className="text-sm text-surface-500">Procesando...</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
