import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@/components/common";
import { api, type DuplicateCandidate } from "@/services/api";

function describeAsset(
  modality: string | null,
  brand: string | null,
  model: string | null,
  quantity: number | null,
  ageYears: number | null,
): string {
  const parts = [
    modality ?? "Equipo",
    brand ?? undefined,
    model ?? undefined,
    quantity ? `×${quantity}` : undefined,
    ageYears ? `${ageYears} años` : undefined,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function DuplicatesCard() {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .duplicates()
      .then((data) => {
        if (mounted) setDuplicates(data);
      })
      .catch((err) => console.error("Duplicates error:", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Candidatos a duplicado</CardTitle>
        <CardDescription>
          Observaciones que podrían referirse al mismo equipo. ATLAS nunca
          fusiona registros automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-readable" />
          </div>
        ) : duplicates.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-success-soft-foreground/25 bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>
              No hay candidatos a duplicado pendientes. La base está consistente.
            </span>
          </div>
        ) : (
          <ul className="space-y-3">
            {duplicates.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warning">
                    Similitud {(item.score * 100).toFixed(0)}%
                  </Badge>
                  {item.conflicts.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-danger-soft-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {item.conflicts.length} conflicto
                      {item.conflicts.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Nueva observación
                    </p>
                    <p className="text-sm text-foreground">
                      {describeAsset(
                        item.incoming_modality,
                        item.incoming_brand,
                        item.incoming_model,
                        item.incoming_quantity,
                        item.incoming_age_years,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md bg-muted/60 p-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Registro existente
                    </p>
                    <p className="text-sm text-foreground">
                      {describeAsset(
                        item.existing_modality,
                        item.existing_brand,
                        item.existing_model,
                        item.existing_quantity,
                        item.existing_age_years,
                      )}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.customer_name}
                  {item.customer_city ? ` · ${item.customer_city}` : ""}
                  {item.customer_country ? `, ${item.customer_country}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
