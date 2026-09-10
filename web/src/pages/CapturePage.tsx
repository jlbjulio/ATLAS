import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, Cpu, FileText, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Button,
  Badge,
  Modal,
  StatusBadge,
} from "@/components/common";
import { ObservationForm } from "@/components/forms";
import { useObservations } from "@/hooks/useObservations";
import { useQVAC } from "@/hooks/useQVAC";
import type { QVACExtractionResult, CaptureFormData } from "@/types";

export function CapturePage() {
  const navigate = useNavigate();
  const { createObservation, confirmObservation } = useObservations();
  const { initialize, extract, transcribe, isInitialized, initError } = useQVAC();
  const [extractionResult, setExtractionResult] = useState<QVACExtractionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [formInstance, setFormInstance] = useState(0);
  const [lastFormData, setLastFormData] = useState<CaptureFormData | null>(null);
  const [lastExtraction, setLastExtraction] = useState<QVACExtractionResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleExtract = async (formData: CaptureFormData): Promise<QVACExtractionResult> => {
    setActionError(null);
    if (!isInitialized) {
      await initialize();
    }
    const result = await extract(formData);
    setExtractionResult(result);
    setLastFormData(formData);
    setLastExtraction(result);
    return result;
  };

  const handleSubmit = async (formData: CaptureFormData, extraction: QVACExtractionResult) => {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await createObservation(formData, extraction, 'user-demo', 'Usuario Demo');
      setLastFormData(formData);
      setLastExtraction(extraction);
      setDraftSaved(true);
    } catch (error) {
      console.error('Error al guardar la observación:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!lastFormData || !lastExtraction) return;
    setActionError(null);
    if (lastFormData.imageUris?.length) {
      setActionError('Revisa o retira las fotos antes de confirmar. No se admiten pacientes, expedientes, gafetes ni rostros.');
      return;
    }
    setIsConfirming(true);
    try {
      await confirmObservation('temp', lastFormData, lastExtraction);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error confirming observation:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setExtractionResult(null);
    setLastFormData(null);
    setLastExtraction(null);
    setDraftSaved(false);
    setShowSuccess(false);
    setFormInstance((instance) => instance + 1);
  };

  const handleNewCapture = () => {
    handleReset();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-xl bg-[#071a26] px-6 py-7 text-white shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-cyan-400/20 bg-cyan-400/5 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Smart capture · operación local</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">De la evidencia del campo a una decisión.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Captura una nota, voz o placa autorizada. ATLAS estructura la observación para que puedas revisarla antes de incorporarla a la base instalada.
          </p>
          <div className="mt-6 grid max-w-xl grid-cols-4 gap-2 sm:gap-5">
            {[
              [Camera, "Captura"],
              [Cpu, "Comprensión"],
              [FileText, "Estructura"],
              [ShieldCheck, "Decisión"],
            ].map(([Icon, label]) => (
              <div key={label as string} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="hidden sm:inline">{label as string}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {initError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Error al inicializar QVAC</p>
                <p className="text-sm text-red-700">{initError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isInitialized && !initError && (
        <div className="flex items-center gap-3 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800" role="status">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent-700" />
          <div>
            <p className="font-medium">Procesamiento local disponible</p>
            <p className="text-accent-700">La verificación de QVAC se realizará al analizar la observación.</p>
          </div>
        </div>
      )}

      {isInitialized && (
        <div className="flex items-center gap-3 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-800" role="status">
          <ShieldCheck className="h-5 w-5 shrink-0 text-accent-700" />
          <div>
            <p className="font-medium">QVAC local verificado</p>
            <p className="text-accent-700">La inferencia de esta captura se ejecutará en el dispositivo.</p>
          </div>
        </div>
      )}

      <ol className="grid grid-cols-3 gap-2" aria-label="Flujo de captura">
        {["Observar", "Revisar extracción", "Confirmar"].map((step, index) => {
          const active = index === 0 || (index === 1 && extractionResult) || (index === 2 && draftSaved);
          return (
            <li key={step} className={`border-t-2 pt-2 text-xs font-medium ${active ? "border-primary-500 text-primary-700" : "border-surface-200 text-surface-400"}`}>
              <span className="mr-1 text-[10px]">0{index + 1}</span>{step}
            </li>
          );
        })}
      </ol>

      {draftSaved && !showSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800" role="status">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Borrador guardado localmente. Revisa los cambios y confirma para incorporarlo a la base instalada.
        </div>
      )}

      {actionError && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p>{actionError}</p>
        </div>
      )}

      <ObservationForm
        key={formInstance}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        extractionResult={extractionResult}
        onExtract={handleExtract}
        onTranscribe={transcribe}
        onCancel={handleNewCapture}
        onExtractionChange={(result) => {
          setExtractionResult(result);
          setLastExtraction(result);
        }}
      />

      {extractionResult && extractionResult.equipments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resumen de Extracción</CardTitle>
                <CardDescription>
                  Confianza global: {(extractionResult.confidence * 100).toFixed(0)}%
                </CardDescription>
              </div>
              <Badge
                variant={
                  extractionResult.confidence > 0.8
                    ? 'success'
                    : extractionResult.confidence > 0.6
                      ? 'warning'
                      : 'danger'
                }
              >
                {extractionResult.confidence > 0.8
                  ? 'Alta'
                  : extractionResult.confidence > 0.6
                    ? 'Media'
                    : 'Baja'} Confianza
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {extractionResult.equipments.map((eq, i) => (
                <div key={i} className="p-3 bg-surface-50 rounded-lg border border-surface-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" size="sm">{eq.modality}</Badge>
                    {eq.brand && <Badge variant="default" size="sm">{eq.brand}</Badge>}
                    <StatusBadge status={eq.status} size="sm" />
                  </div>
                  <p className="text-sm text-surface-600">{eq.model || 'Modelo no detectado'}</p>
                  <div className="flex items-center gap-3 text-xs text-surface-500 mt-1">
                    {eq.ageYears && <span>{eq.ageYears} años</span>}
                    <span>×{eq.quantity}</span>
                    <span>Conf: {(eq.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="primary" onClick={handleConfirm} loading={isConfirming}>
                Confirmar y Guardar
              </Button>
              <Button variant="secondary" onClick={handleNewCapture}>
                Nueva Captura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showSuccess && (
        <Modal
          isOpen={showSuccess}
          onClose={handleNewCapture}
          title="Observación confirmada"
          size="sm"
        >
          <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-surface-900 mb-2">
              Observación registrada correctamente
            </h3>
            <p className="text-surface-500 mb-6">
              La información fue confirmada y está disponible en la base instalada.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" onClick={handleNewCapture}>Nueva Captura</Button>
              <Button variant="secondary" onClick={() => navigate('/installed-base')}>
                Ver Base Instalada
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
