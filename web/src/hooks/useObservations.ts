import { useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/services/api';
import { toCoreDraft } from '@/lib/mappers';
import type { Observation, CaptureFormData, QVACExtractionResult } from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateObservationId(): string {
  return `obs-${generateId()}`;
}

function calculateOverallConfidence(equipments: QVACExtractionResult['equipments']): number {
  if (equipments.length === 0) return 0;
  return equipments.reduce((sum, e) => sum + e.confidence, 0) / equipments.length;
}

function determineStatus(confidence: number, hasConfirmation: boolean): Observation['status'] {
  if (hasConfirmation) return 'CONFIRMED';
  if (confidence > 0.85) return 'REPORTED';
  if (confidence > 0.6) return 'ESTIMATED';
  return 'UNKNOWN';
}

export function useObservations() {
  const { observations, addObservation, updateObservation, deleteObservation, clients, setClients } = useAppStore();

  const createObservation = useCallback(async (
    formData: CaptureFormData,
    extractionResult: QVACExtractionResult,
    observerId: string,
    observerName: string
  ): Promise<Observation> => {
    const now = new Date().toISOString();
    const observationId = generateObservationId();

    const equipments = extractionResult.equipments.map((eq, index) => ({
      id: `eq-${observationId}-${index}`,
      ...eq,
      modality: eq.modality as Observation['extractedEquipments'][0]['modality'],
      brand: eq.brand as Observation['extractedEquipments'][0]['brand'] | undefined,
      status: eq.status,
      location: {
        client: formData.clientName || 'Desconocido',
        city: formData.city || 'Desconocida',
        country: formData.country || 'Desconocido',
      },
      createdAt: now,
      updatedAt: now,
      sourceObservationId: observationId,
    }));

    const observation: Observation = {
      id: observationId,
      rawText: formData.rawText,
      transcribedText: formData.rawText,
      audioUri: formData.audioUri,
      imageUris: formData.imageUris,
      extractedEquipments: equipments,
      clientName: formData.clientName,
      city: formData.city,
      country: formData.country,
      observerId,
      observerName,
      status: determineStatus(extractionResult.confidence, false),
      confidence: calculateOverallConfidence(extractionResult.equipments),
      createdAt: now,
      updatedAt: now,
      synced: false,
    };

    addObservation(observation);

    if (formData.clientName) {
      updateClientInstalledBase(formData.clientName, formData.city, formData.country, equipments);
    }

    return observation;
  }, [addObservation]);

  const updateClientInstalledBase = useCallback((
    clientName: string,
    city: string | undefined,
    country: string | undefined,
    newEquipments: Observation['extractedEquipments']
  ) => {
    const existingClientIndex = clients.findIndex(c => c.clientName === clientName);
    const now = new Date().toISOString();

    if (existingClientIndex >= 0) {
      const updatedClients = [...clients];
      const client = { ...updatedClients[existingClientIndex] };
      client.equipments = [...client.equipments, ...newEquipments];
      client.totalEquipmentCount = client.equipments.length;
      client.lastVisit = now;
      client.renewalOpportunities = client.equipments.filter(e => e.ageYears && e.ageYears > 7).length;
      updatedClients[existingClientIndex] = client;
      setClients(updatedClients);
    } else {
      const newClient = {
        clientId: `CLI-${generateId()}`,
        clientName,
        city: city || 'Desconocida',
        country: country || 'Desconocido',
        equipments: newEquipments,
        lastVisit: now,
        totalEquipmentCount: newEquipments.length,
        renewalOpportunities: newEquipments.filter(e => e.ageYears && e.ageYears > 7).length,
      };
      setClients([...clients, newClient]);
    }
  }, [clients, setClients]);

  const confirmObservation = useCallback(async (id: string, formData?: CaptureFormData, extraction?: QVACExtractionResult) => {
    if (formData && extraction) {
      const draft = toCoreDraft(formData, extraction);
      try {
        await api.confirm(draft);
        updateObservation(id, { status: 'CONFIRMED', updatedAt: new Date().toISOString() });
      } catch (error) {
        console.error('Confirmation failed:', error);
        throw error;
      }
    }
    updateObservation(id, { status: 'CONFIRMED', updatedAt: new Date().toISOString() });
  }, [updateObservation]);

  const getObservationsByStatus = useCallback((status: Observation['status']) => {
    return observations.filter(o => o.status === status);
  }, [observations]);

  const getRecentObservations = useCallback((limit = 10) => {
    return [...observations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }, [observations]);

  return {
    observations,
    createObservation,
    updateObservation,
    deleteObservation,
    confirmObservation,
    getObservationsByStatus,
    getRecentObservations,
  };
}
