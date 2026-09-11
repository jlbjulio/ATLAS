import { useState } from "react";
import { Smartphone, QrCode, X, Loader2, AlertTriangle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  Button,
  Modal,
} from "@/components/common";
import { api } from "@/services/api";

function getBackendUrl(): string {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "";
  }
  return `http://${hostname}:8000`;
}

export function SharedPowerCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      setError(
        "Abre ATLAS usando la IP local de esta laptop (no localhost) para compartir la conexión.",
      );
      setIsOpen(true);
      return;
    }
    setIsOpen(true);
    setLoading(true);
    setError(null);
    try {
      const invite = await api.createP2PInvitation(backendUrl);
      setInviteUrl(invite.invite_url);
    } catch {
      setError(
        "No se pudo crear la invitación. Verifica que el backend esté activo en la red local.",
      );
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setInviteUrl(null);
    setError(null);
  };

  return (
    <>
      <Card className="border-primary-200 bg-primary-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-primary-900">
                Potencia compartida
              </h3>
              <p className="text-sm text-primary-700">
                Enlaza el móvil con esta laptop para que ATLAS use el procesador
                más potente automáticamente.
              </p>
            </div>
            <Button variant="primary" onClick={open}>
              <QrCode className="mr-2 h-4 w-4" />
              Compartir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isOpen} onClose={close} title="Enlazar móvil" size="sm">
        <div className="space-y-4 text-center">
          <p className="text-sm text-surface-600">
            Escanea este código desde ATLAS Field para enlazar los dispositivos.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          )}

          {inviteUrl && !loading && (
            <>
              <div className="flex justify-center rounded-xl border border-surface-200 bg-white p-4">
                <QRCodeSVG value={inviteUrl} size={200} level="H" />
              </div>
              <p className="text-xs text-surface-500">
                El código expira en 5 minutos.
              </p>
            </>
          )}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={close}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
