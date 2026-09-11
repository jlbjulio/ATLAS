import { useEffect, useState } from "react";
import { Smartphone, Trash2, Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  Button,
} from "@/components/common";
import { api, type P2PSession } from "@/services/api";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5) return "ahora";
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    return `hace ${Math.floor(diff / 3600)}h`;
  } catch {
    return "";
  }
}

export function P2PSessionsCard() {
  const [sessions, setSessions] = useState<P2PSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.listP2PSessions();
      setSessions(data.sessions);
    } catch (err) {
      console.error("P2P sessions error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const revoke = async (token: string) => {
    setRevoking(token);
    try {
      await api.revokeP2PSession(token);
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch (err) {
      console.error("Revoke P2P session error:", err);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                Dispositivos enlazados
              </h3>
              <p className="text-sm text-muted-foreground">
                {sessions.length === 0
                  ? "Ningún celular conectado"
                  : `${sessions.length} ${sessions.length === 1 ? "celular" : "celulares"} conectado${sessions.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary-readable" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            Escanea el código QR desde ATLAS Field para ver el primer
            dispositivo aquí.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((session) => (
              <li
                key={session.token}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {session.device_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enlazado a las {formatTime(session.paired_at)} · Última
                    actividad {timeAgo(session.last_seen)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => revoke(session.token)}
                  disabled={revoking === session.token}
                >
                  {revoking === session.token ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
