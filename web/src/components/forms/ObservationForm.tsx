import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Mic, Sparkles, X, Square, Info } from "lucide-react";
import {
  Button,
  Textarea,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  NextBestQuestion,
} from "@/components/common"
import { InlineProgress } from "@/components/common/TypingDots";
import type {
  CaptureFormData,
  QVACExtractionResult,
  EquipmentModality,
  EquipmentBrand,
} from "@/types";

interface ObservationFormProps {
  onSubmit: (
    data: CaptureFormData,
    extraction: QVACExtractionResult,
  ) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<CaptureFormData>;
  extractionResult?: QVACExtractionResult | null;
  onExtract: (data: CaptureFormData) => Promise<QVACExtractionResult>;
  onTranscribe?: (audioFile: File) => Promise<string>;
  onExtractionChange?: (result: QVACExtractionResult) => void;
  onCancel?: () => void;
}

const MODALITY_OPTIONS: Array<{ value: EquipmentModality; label: string }> = [
  { value: "MRI", label: "Resonancia Magnética (MRI)" },
  { value: "CT", label: "Tomografía Computarizada (CT)" },
  { value: "XRAY", label: "Rayos X (X-Ray)" },
  { value: "ULTRASOUND", label: "Ecografía / Ultrasonido" },
  { value: "PET", label: "Tomografía por Emisión de Positrones (PET)" },
  { value: "SPECT", label: "Tomografía por Emisión de Fotón Simple (SPECT)" },
  { value: "MAMMOGRAPHY", label: "Mamografía" },
  { value: "FLUOROSCOPY", label: "Fluoroscopía" },
  { value: "OTHER", label: "Otro" },
];

const BRAND_OPTIONS: Array<{ value: EquipmentBrand; label: string }> = [
  { value: "PHILIPS", label: "Philips" },
  { value: "SIEMENS", label: "Siemens Healthineers" },
  { value: "GE", label: "GE HealthCare" },
  { value: "CANON", label: "Canon Medical" },
  { value: "HITACHI", label: "Hitachi" },
  { value: "FUJIFILM", label: "Fujifilm Healthcare" },
  { value: "SAMSUNG", label: "Samsung Medison" },
  { value: "MINDRAY", label: "Mindray" },
  { value: "OTHER", label: "Otra" },
];

const COUNTRY_OPTIONS = [
  { value: "Panamá", label: "Panamá" },
  { value: "Colombia", label: "Colombia" },
  { value: "Perú", label: "Perú" },
  { value: "México", label: "México" },
  { value: "Chile", label: "Chile" },
  { value: "Argentina", label: "Argentina" },
  { value: "Brasil", label: "Brasil" },
  { value: "Ecuador", label: "Ecuador" },
  { value: "Costa Rica", label: "Costa Rica" },
  { value: "Otro", label: "Otro" },
];

const STATUS_OPTIONS = [
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "REPORTED", label: "Reportado" },
  { value: "ESTIMATED", label: "Estimado" },
  { value: "UNKNOWN", label: "Desconocido" },
];

const FIELD_LABELS: Partial<Record<keyof CaptureFormData, string>> = {
  clientName: "Cliente",
  city: "Ciudad",
  country: "País",
  rawText: "Observación",
};

const CLIENT_KEYWORDS = "(?:cliente)"
const FACILITY_KEYWORDS = "(?:hospital|clínica|clinica|centro)"
const CITY_KEYWORDS = "(?:ciudad|ubicación|ubicacion)"
const COUNTRY_KEYWORDS = "(?:país|pais)"
const NOTE_KEYWORDS =
  "(?:observación|observacion|nota|evidencia|detalle|descripción|descripcion)"
const ALL_KEYWORDS = [
  "cliente",
  "hospital",
  "clínica",
  "clinica",
  "centro",
  "ciudad",
  "ubicación",
  "ubicacion",
  "país",
  "pais",
  "observación",
  "observacion",
  "nota",
  "evidencia",
  "detalle",
  "descripción",
  "descripcion",
].join("|")

function matchBlock(text: string, keyword: string): RegExpMatchArray | null {
  return text.match(
    new RegExp(
      `${keyword}\\s*[,:]?\\s*(.+?)(?=\\s*(?:${ALL_KEYWORDS}|[,;.]|$))`,
      "i",
    ),
  )
}

function parseVoiceCommands(text: string): Partial<CaptureFormData> {
  const updates: Partial<CaptureFormData> = {}

  const explicitClient = matchBlock(text, CLIENT_KEYWORDS)
  if (explicitClient?.[1]) {
    updates.clientName = explicitClient[1].trim()
  } else {
    // "Hospital San Juan" without the "Cliente" command keeps the full name.
    const facilityClient = text.match(
      new RegExp(
        `^\\s*${FACILITY_KEYWORDS}\\s*(.+?)(?=\\s*(?:${ALL_KEYWORDS}|[,;.]|$))`,
        "i",
      ),
    )
    if (facilityClient?.[0]) {
      updates.clientName = facilityClient[0].trim()
    }
  }

  const cityMatch = matchBlock(text, CITY_KEYWORDS)
  if (cityMatch?.[1]) {
    updates.city = cityMatch[1].trim()
  }

  const countryMatch = matchBlock(text, COUNTRY_KEYWORDS)
  if (countryMatch?.[1]) {
    updates.country = countryMatch[1].trim()
  }

  const noteMatch = text.match(
    new RegExp(`${NOTE_KEYWORDS}\\s*[,:]?\\s*(.+)`, "is"),
  )
  if (noteMatch?.[1]) {
    updates.rawText = noteMatch[1].trim()
  }

  return updates
}

export function ObservationForm({
  onSubmit,
  isLoading = false,
  initialData = {},
  extractionResult,
  onExtract,
  onTranscribe,
  onExtractionChange,
  onCancel,
}: ObservationFormProps) {
  const [formData, setFormData] = useState<CaptureFormData>({
    rawText: "",
    clientName: "",
    city: "",
    country: "",
    ...initialData,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CaptureFormData, string>>
  >({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [extractError, setExtractError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [editableExtraction, setEditableExtraction] =
    useState<QVACExtractionResult | null>(extractionResult ?? null);

  useEffect(() => {
    setEditableExtraction(extractionResult ?? null);
  }, [extractionResult]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
    };
  }, [formData.photoPreview]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CaptureFormData, string>> = {};
    if (!formData.rawText.trim() && !formData.photo) {
      newErrors.rawText = "Agrega una observación o una foto autorizada";
    }
    if (!formData.clientName?.trim()) {
      newErrors.clientName = "El nombre del cliente es requerido";
    }
    if (!formData.city?.trim()) {
      newErrors.city = "La ciudad es requerida";
    }
    if (!formData.country?.trim()) {
      newErrors.country = "El país es requerido";
    }
    setErrors(newErrors);
    const missing = (
      Object.keys(newErrors) as Array<keyof CaptureFormData>
    ).map((field) => FIELD_LABELS[field] ?? field);
    setValidationMessage(
      missing.length > 0
        ? `Faltan campos obligatorios: ${missing.join(", ")}.`
        : null,
    );
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setExtractError(null);
    if (!validateForm()) return;

    if (!editableExtraction) {
      setValidationMessage(
        "Primero analiza la observación con ATLAS para generar los registros.",
      );
      return;
    }
    await onSubmit(formData, editableExtraction);
  };

  const handleExtract = async () => {
    if (!formData.rawText.trim() && !formData.photo) {
      setErrors({ rawText: "Agrega una observación o una foto autorizada" });
      return;
    }
    if (formData.photo && !formData.photoAuthorized) {
      setErrors({ photoAuthorized: "Confirma que la foto está autorizada" });
      return;
    }

    setExtractError(null);
    setIsExtracting(true);
    try {
      const result = await onExtract(formData);
      return result;
    } catch (error) {
      console.error("Extraction failed:", error);
      setExtractError(
        error instanceof Error && error.message
          ? error.message
          : "La extracción local falló. Inténtalo de nuevo.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const updateEquipment = (
    index: number,
    changes: Partial<QVACExtractionResult["equipments"][number]>,
  ) => {
    if (!editableExtraction) return;
    const updatedExtraction = {
      ...editableExtraction,
      equipments: editableExtraction.equipments.map(
        (equipment, equipmentIndex) =>
          equipmentIndex === index ? { ...equipment, ...changes } : equipment,
      ),
    };
    setEditableExtraction(updatedExtraction);
    onExtractionChange?.(updatedExtraction);
  };

  const handleRecordAudio = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsRecording(false);
        mediaRecorderRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        try {
          if (onTranscribe && chunks.length > 0) {
            setIsTranscribing(true);
            const blob = new Blob(chunks, { type: "audio/webm" });
            const audioFile = new File([blob], `recording-${Date.now()}.webm`, {
              type: "audio/webm",
            });
            const transcribed = await onTranscribe(audioFile);
            const commands = parseVoiceCommands(transcribed);
            setFormData((prev) => ({
              ...prev,
              ...commands,
              rawText:
                commands.rawText ??
                (prev.rawText ? `${prev.rawText} ${transcribed}` : transcribed),
            }));
          }
        } catch (err) {
          console.error("Transcription failed:", err);
          setVoiceError("No se pudo transcribir el audio. Intenta de nuevo.");
        } finally {
          setIsTranscribing(false);
          mediaRecorderRef.current = null;
          streamRef.current = null;
          setIsRecording(false);
        }
      };

      recorder.onerror = () => {
        setVoiceError(
          "La grabación se interrumpió. Revisa el permiso del micrófono.",
        );
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access failed:", error);
      setVoiceError(
        "No se pudo activar el micrófono. Revisa los permisos del navegador.",
      );
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
    }
  };

  const voiceStatus = isRecording
    ? "Grabando... presiona para detener"
    : isTranscribing
      ? "Transcribiendo localmente..."
      : (voiceError ?? "Dicta una observación y ATLAS la convertirá en texto");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
    setFormData((prev) => ({
      ...prev,
      photo: file,
      photoPreview: URL.createObjectURL(file),
      photoAuthorized: false,
    }));
  };

  const removeImage = () => {
    if (formData.photoPreview) URL.revokeObjectURL(formData.photoPreview);
    setFormData((prev) => ({
      ...prev,
      photo: undefined,
      photoPreview: undefined,
      photoAuthorized: false,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Observación de Campo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary-readable" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Dicta el formulario completo
                </p>
                <p className="text-xs text-muted-foreground">
                  Di: <strong>Cliente</strong> Hospital San Juan,{" "}
                  <strong>Ciudad</strong> Panamá, <strong>País</strong> Panamá,{" "}
                  <strong>Observación</strong> (o <strong>Evidencia</strong>) vi
                  un tomógrafo Philips de 8 años...
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Cliente / Hospital"
              value={formData.clientName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clientName: e.target.value }))
              }
              error={errors.clientName}
              placeholder="Ej. Hospital DemoCare Pacific"
            />
            <Select
              label="País"
              options={COUNTRY_OPTIONS}
              value={formData.country}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, country: e.target.value }))
              }
              error={errors.country}
              placeholder="Seleccionar país"
            />
          </div>

          <Input
            label="Ciudad"
            value={formData.city}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, city: e.target.value }))
            }
            error={errors.city}
            placeholder="Ej. Panamá, Bogotá, Lima"
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Observación
            </label>
            <div className="relative">
              <Textarea
                value={formData.rawText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rawText: e.target.value }))
                }
                error={errors.rawText}
                placeholder="Escribe o dicta lo que observaste. Usa el micrófono para llenar cliente, ciudad, país y observación por voz."
                rows={4}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  type="button"
                  variant={isRecording ? "danger" : "ghost"}
                  size="sm"
                  onClick={handleRecordAudio}
                  disabled={isExtracting || isTranscribing}
                  title="Dictar voz a texto"
                  aria-label={
                    isRecording
                      ? "Detener grabación"
                      : "Iniciar grabación por voz"
                  }
                >
                  {isRecording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="mt-2">
              {isTranscribing ? (
                <InlineProgress label="Transcribiendo localmente..." />
              ) : (
                <p
                  className={`text-xs ${voiceError ? "text-danger-soft-foreground" : "text-muted-foreground"}`}
                  role={voiceError ? "alert" : "status"}
                >
                  {voiceStatus}
                </p>
              )}
            </div>
            {errors.rawText && (
              <p className="mt-1 text-sm text-danger-soft-foreground" role="alert">
                {errors.rawText}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleExtract}
              loading={isExtracting}
              disabled={!formData.rawText.trim() && !formData.photo}
              className="w-full sm:w-auto"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Analizar con ATLAS
            </Button>
            {isExtracting && (
              <InlineProgress label="ATLAS está analizando la evidencia..." />
            )}
            {extractError && !isExtracting && (
              <div
                className="flex w-full items-start gap-2 rounded-lg border border-danger-soft-foreground/25 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{extractError}</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Fotos de placas/etiquetas (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              No se admiten pacientes, expedientes, gafetes ni rostros. La foto
              permanece en el dispositivo.
            </p>
            {formData.photoPreview && (
              <div className="mt-2 flex flex-wrap gap-2">
                <div className="relative group">
                  <img
                    src={formData.photoPreview}
                    alt="Foto autorizada para análisis local"
                    className="h-16 w-16 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Eliminar foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            {formData.photo && (
              <label className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(formData.photoAuthorized)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      photoAuthorized: e.target.checked,
                    }))
                  }
                  className="mt-1 rounded border-input text-primary focus:ring-primary"
                />
                Confirmo que la foto está autorizada y no contiene pacientes,
                expedientes, gafetes ni rostros.
              </label>
            )}
            {errors.photoAuthorized && (
              <p className="mt-1 text-sm text-danger-soft-foreground" role="alert">
                {errors.photoAuthorized}
              </p>
            )}
          </div>

          {editableExtraction && editableExtraction.equipments.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-medium text-foreground">
                Equipos extraídos (revisa antes de guardar)
              </h3>
              <div className="space-y-3">
                {editableExtraction.equipments.map((eq, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border bg-muted/50 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <Select
                        label="Modalidad"
                        options={MODALITY_OPTIONS}
                        value={eq.modality}
                        onChange={(e) => {
                          updateEquipment(index, {
                            modality: e.target.value as EquipmentModality,
                          });
                        }}
                      />
                      <Select
                        label="Marca"
                        options={BRAND_OPTIONS}
                        value={eq.brand || "OTHER"}
                        onChange={(e) => {
                          updateEquipment(index, {
                            brand: e.target.value as EquipmentBrand,
                          });
                        }}
                      />
                      <Input
                        label="Modelo"
                        value={eq.model || ""}
                        onChange={(e) => {
                          updateEquipment(index, { model: e.target.value });
                        }}
                        placeholder="Ej. Ingenuity Core 128"
                      />
                      <Input
                        type="number"
                        label="Edad (años)"
                        value={eq.ageYears?.toString() || ""}
                        onChange={(e) => {
                          updateEquipment(index, {
                            ageYears: parseInt(e.target.value) || undefined,
                          });
                        }}
                        placeholder="8"
                      />
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <Input
                        type="number"
                        label="Cantidad"
                        value={eq.quantity.toString()}
                        onChange={(e) => {
                          updateEquipment(index, {
                            quantity: parseInt(e.target.value) || 1,
                          });
                        }}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        label="Confianza"
                        value={eq.confidence.toString()}
                        onChange={(e) => {
                          updateEquipment(index, {
                            confidence: parseFloat(e.target.value),
                          });
                        }}
                      />
                      <Select
                        label="Estado"
                        options={STATUS_OPTIONS}
                        value={eq.status}
                        onChange={(e) => {
                          updateEquipment(index, {
                            status: e.target.value as
                              | "CONFIRMED"
                              | "REPORTED"
                              | "ESTIMATED"
                              | "UNKNOWN",
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {editableExtraction.draft.privacy_flags.length > 0 && (
                <div
                  className="mt-4 rounded-lg border border-danger-soft-foreground/25 bg-danger-soft p-4 text-sm text-danger-soft-foreground"
                  role="alert"
                >
                  Se detectó contenido sensible:{" "}
                  {editableExtraction.draft.privacy_flags.join(", ")}. Retira o
                  redacta la foto antes de confirmar.
                </div>
              )}
              <NextBestQuestion
                missingFields={editableExtraction.missingFields}
                followUpQuestions={editableExtraction.followUpQuestions}
                className="mt-4"
              />
            </div>
          )}

          {validationMessage && (
            <div
              className="flex items-center gap-2 rounded-lg border border-danger-soft-foreground/25 bg-danger-soft px-4 py-3 text-sm text-danger-soft-foreground"
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{validationMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              disabled={
                isExtracting ||
                Boolean(editableExtraction?.draft.privacy_flags.length)
              }
            >
              Confirmar y guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
