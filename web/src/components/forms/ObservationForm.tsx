import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Mic, Loader2, Sparkles, X } from "lucide-react";
import {
  Button,
  Textarea,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/common";
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
  const [errors, setErrors] = useState<Partial<CaptureFormData>>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
  const [editableExtraction, setEditableExtraction] =
    useState<QVACExtractionResult | null>(extractionResult ?? null);

  useEffect(() => {
    setEditableExtraction(extractionResult ?? null);
  }, [extractionResult]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CaptureFormData> = {};
    if (!formData.rawText.trim()) {
      newErrors.rawText = "La observación es requerida";
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
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editableExtraction) {
      await onSubmit(formData, editableExtraction);
    }
  };

  const handleExtract = async () => {
    if (!formData.rawText.trim()) {
      setErrors({ rawText: "Escribe una observación primero" });
      return;
    }

    setIsExtracting(true);
    try {
      const result = await onExtract(formData);
      return result;
    } catch (error) {
      console.error("Extraction failed:", error);
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
      equipments: editableExtraction.equipments.map((equipment, equipmentIndex) =>
        equipmentIndex === index ? { ...equipment, ...changes } : equipment,
      ),
    };
    setEditableExtraction(updatedExtraction);
    onExtractionChange?.(updatedExtraction);
  };

  const handleRecordAudio = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const audioFile = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });

        if (onTranscribe) {
          try {
            const transcribed = await onTranscribe(audioFile);
            setFormData((prev) => ({
              ...prev,
              rawText: prev.rawText
                ? `${prev.rawText} ${transcribed}`
                : transcribed,
            }));
          } catch (err) {
            console.error("Transcription failed:", err);
          }
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone access failed:", error);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "imageUris",
  ) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map((file) => URL.createObjectURL(file));
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), ...urls],
    }));
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      imageUris: prev.imageUris?.filter((_, i) => i !== index) || [],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Observación de Campo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="label">Observación (voz o texto)</label>
            <div className="relative">
              <Textarea
                value={formData.rawText}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rawText: e.target.value }))
                }
                error={errors.rawText}
                placeholder="Describe lo que observaste: 'Estoy en Hospital DemoCare Pacific, en Panamá. Un tomógrafo Philips de unos 8 años. Uno de los resonadores parece de unos ocho años.'"
                rows={4}
              />
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  type="button"
                  variant={isRecording ? "danger" : "ghost"}
                  size="sm"
                  onClick={handleRecordAudio}
                  disabled={isExtracting}
                  aria-label={
                    isRecording
                      ? "Detener grabación"
                      : "Iniciar grabación por voz"
                  }
                >
                  <Mic
                    className={`w-4 h-4 ${isRecording ? "animate-pulse text-red-500" : ""}`}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExtract}
                  disabled={isExtracting || !formData.rawText.trim()}
                  aria-label="Extraer información con IA"
                >
                  {isExtracting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Extraer
                    </>
                  )}
                </Button>
              </div>
            </div>
            {errors.rawText && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.rawText}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              Fotos de placas/etiquetas (opcional)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e, "imageUris")}
              className="input cursor-pointer"
            />
            {formData.imageUris && formData.imageUris.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.imageUris.map((uri, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={uri}
                      alt={`Foto ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-surface-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Eliminar foto ${index + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editableExtraction && editableExtraction.equipments.length > 0 && (
            <div className="border-t border-surface-200 pt-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">
                Equipos extraídos (revisa antes de guardar)
              </h3>
              <div className="space-y-3">
                {editableExtraction.equipments.map((eq, index) => (
                  <div
                    key={index}
                    className="p-4 bg-surface-50 rounded-lg border border-surface-200"
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

              {(editableExtraction.missingFields.length > 0 ||
                editableExtraction.followUpQuestions.length > 0) && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Campos faltantes / Preguntas de seguimiento
                    </span>
                  </h4>
                  {editableExtraction.missingFields.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                      {editableExtraction.missingFields.map((field, i) => (
                        <li key={i}>{field}</li>
                      ))}
                    </ul>
                  )}
                  {editableExtraction.followUpQuestions.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1 mt-2">
                      {editableExtraction.followUpQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-surface-200 pt-6">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading} disabled={isExtracting}>
              Guardar borrador local
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
