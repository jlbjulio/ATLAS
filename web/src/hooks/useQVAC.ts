import { useState, useCallback } from "react";
import { api } from "@/services/api";
import {
  mapHealth,
  mapExtractionResponse,
  mapTranscribeResponse,
} from "@/lib/mappers";
import type { QVACExtractionResult, CaptureFormData } from "@/types";

export function useQVAC() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionMode, setExtractionMode] = useState<
    "base" | "adapter" | null
  >(null);

  const initialize = useCallback(async () => {
    if (isInitialized || isInitializing) return;

    setIsInitializing(true);
    setInitError(null);

    try {
      const response = await api.health();
      const health = mapHealth(response);
      if (!health.available) {
        throw new Error("Los modelos QVAC no están disponibles. Descarga los modelos primero.");
      }
      setExtractionMode(health.extractionMode);
      setIsInitialized(true);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error al inicializar QVAC";
      setInitError(msg);
      console.error("QVAC init error:", error);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  const transcribe = useCallback(async (audioFile: File): Promise<string> => {
    setIsProcessing(true);
    try {
      const response = await api.transcribe(audioFile);
      return mapTranscribeResponse(response);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const extract = useCallback(
    async (formData: CaptureFormData): Promise<QVACExtractionResult> => {
      setIsProcessing(true);
      try {
        const response = formData.photo
          ? await api.analyzePhoto(formData.photo, {
              text: formData.rawText,
              client: formData.clientName,
              city: formData.city,
              country: formData.country,
              photoAuthorized: Boolean(formData.photoAuthorized),
            })
          : await api.extract({
              text: formData.rawText,
              client: formData.clientName,
              city: formData.city,
              country: formData.country,
            });
        return mapExtractionResponse(response);
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  const cleanup = useCallback(async () => {
    setIsInitialized(false);
  }, []);

  return {
    isInitialized,
    isInitializing,
    initError,
    isProcessing,
    extractionMode,
    initialize,
    transcribe,
    extract,
    cleanup,
    available: true,
  };
}
