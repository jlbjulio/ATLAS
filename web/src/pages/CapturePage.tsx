import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Camera,
  CheckCircle,
  Cpu,
  FileText,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
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
  Stepper,
  ConfidenceMeter,
  EvidenceOrigin,
} from "@/components/common"
import { ObservationForm } from "@/components/forms"
import { useObservations } from "@/hooks/useObservations"
import { useQVAC } from "@/hooks/useQVAC"
import type { QVACExtractionResult, CaptureFormData } from "@/types"

export function CapturePage() {
  const navigate = useNavigate()
  const { createObservation, confirmObservation } = useObservations()
  const { initialize, extract, transcribe, isInitialized, initError } =
    useQVAC()
  const [extractionResult, setExtractionResult] =
    useState<QVACExtractionResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [formInstance, setFormInstance] = useState(0)
  const [lastFormData, setLastFormData] = useState<CaptureFormData | null>(
    null
  )
  const [lastExtraction, setLastExtraction] =
    useState<QVACExtractionResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const currentStep = draftSaved ? 2 : extractionResult ? 1 : 0

  const handleExtract = async (
    formData: CaptureFormData
  ): Promise<QVACExtractionResult> => {
    setActionError(null)
    if (!isInitialized) {
      await initialize()
    }
    const result = await extract(formData)
    setExtractionResult(result)
    setLastFormData(formData)
    setLastExtraction(result)
    return result
  }

  const handleSubmit = async (
    formData: CaptureFormData,
    extraction: QVACExtractionResult
  ) => {
    setActionError(null)
    setIsSubmitting(true)
    try {
      await createObservation(
        formData,
        extraction,
        "user-demo",
        "Usuario Demo"
      )
      setLastFormData(formData)
      setLastExtraction(extraction)
      setDraftSaved(true)
    } catch (error) {
      console.error("Error al guardar la observación:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!lastFormData || !lastExtraction) return
    setActionError(null)
    if (lastFormData.imageUris?.length) {
      setActionError(
        "Revisa o retira las fotos antes de confirmar. No se admiten pacientes, expedientes, gafetes ni rostros."
      )
      return
    }
    setIsConfirming(true)
    try {
      await confirmObservation("temp", lastFormData, lastExtraction)
      setShowSuccess(true)
    } catch (error) {
      console.error("Error confirming observation:", error)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleReset = () => {
    setExtractionResult(null)
    setLastFormData(null)
    setLastExtraction(null)
    setDraftSaved(false)
    setShowSuccess(false)
    setFormInstance((instance) => instance + 1)
  }

  const handleNewCapture = () => {
    handleReset()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-xl border border-sidebar-border bg-sidebar px-6 py-7 text-sidebar-foreground shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-cyan-400/20 bg-cyan-400/5 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Captura inteligente · operación local
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-sidebar-foreground sm:text-3xl">
            De la evidencia del campo a una decisión.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-sidebar-foreground/80">
            Captura una nota, voz o placa autorizada. ATLAS estructura la
            observación para que puedas revisarla antes de incorporarla a la
            base instalada.
          </p>
          <div className="mt-6 grid max-w-xl grid-cols-4 gap-2 sm:gap-5">
            {[
              [Camera, "Captura"],
              [Cpu, "Comprensión"],
              [FileText, "Estructura"],
              [ShieldCheck, "Decisión"],
            ].map(([Icon, label]) => (
              <div
                key={label as string}
                className="flex items-center gap-2 text-xs text-sidebar-foreground/80"
              >
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
        <div
          className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
          <div>
            <p className="font-medium">Error al inicializar QVAC</p>
            <p className="text-red-200/80">{initError}</p>
          </div>
        </div>
      )}

      <div
        className="flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        role="status"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <div>
          <p className="font-medium">
            {isInitialized
              ? "QVAC local verificado"
              : "Procesamiento local disponible"}
          </p>
          <p className="text-emerald-200/80">
            {isInitialized
              ? "La inferencia de esta captura se ejecutará en el dispositivo."
              : "La verificación de QVAC se realizará al analizar la observación."}
          </p>
        </div>
      </div>

      <Stepper
        steps={["Observar", "Revisar y editar", "Confirmar"]}
        current={currentStep}
      />

      {draftSaved && !showSuccess && (
        <div
          className="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" />
          Borrador guardado localmente. Revisa los cambios y confirma para
          incorporarlo a la base instalada.
        </div>
      )}

      {actionError && (
        <div
          className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-300" />
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
          setExtractionResult(result)
          setLastExtraction(result)
        }}
      />

      {extractionResult && extractionResult.equipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisión y confirmación</CardTitle>
            <CardDescription>
              ATLAS propone {extractionResult.equipments.length}{" "}
              {extractionResult.equipments.length === 1
                ? "registro"
                : "registros"}
              . Confirma solo cuando lo revisado sea correcto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ConfidenceMeter
              value={extractionResult.confidence}
              description="Puntaje según completitud del registro y evidencia disponible."
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {extractionResult.equipments.map((eq, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant="default" size="sm">
                      {eq.modality}
                    </Badge>
                    {eq.brand && (
                      <Badge variant="default" size="sm">
                        {eq.brand}
                      </Badge>
                    )}
                    <StatusBadge status={eq.status} size="sm" showLabel />
                  </div>
                  <p className="text-sm text-foreground">
                    {eq.model || "Modelo no detectado"}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {eq.ageYears && <span>{eq.ageYears} años</span>}
                    <span>×{eq.quantity}</span>
                    <span>Conf: {(eq.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>

            <EvidenceOrigin
              observerName="Usuario Demo"
              imageCount={lastFormData?.imageUris?.length ?? 0}
              hasAudio={Boolean(lastFormData?.audioUri)}
              synced={false}
            />

            <div className="flex flex-wrap gap-3 border-t border-border pt-4">
              <Button
                variant="primary"
                onClick={handleConfirm}
                loading={isConfirming}
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar e incorporar
              </Button>
              <Button variant="secondary" onClick={handleNewCapture}>
                Nueva captura
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle className="h-8 w-8 text-emerald-300" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">
              Observación registrada correctamente
            </h3>
            <p className="mb-6 text-muted-foreground">
              La información fue confirmada y está disponible en la base
              instalada. Cada cambio deja evidencia de auditoría en el
              dispositivo.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="primary" onClick={handleNewCapture}>
                Nueva captura
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/installed-base")}
              >
                Ver base instalada
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
