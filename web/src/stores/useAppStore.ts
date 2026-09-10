import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Observation,
  ClientInstalledBase,
  NaturalLanguageQuery,
  AppState,
} from "@/types";

interface AppStore extends AppState {
  addObservation: (obs: Observation) => void;
  updateObservation: (id: string, data: Partial<Observation>) => void;
  deleteObservation: (id: string) => void;
  setClients: (clients: ClientInstalledBase[]) => void;
  setCurrentQuery: (query: NaturalLanguageQuery | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  getObservationsByClient: (clientId: string) => Observation[];
  getEquipmentByModality: (
    modality: string,
  ) => ClientInstalledBase["equipments"];
}

const mockClients: ClientInstalledBase[] = [
  {
    clientId: "CLI-001",
    clientName: "Hospital DemoCare Pacific",
    city: "Panamá",
    country: "Panamá",
    equipments: [
      {
        id: "eq-1",
        modality: "CT",
        brand: "PHILIPS",
        model: "Ingenuity Core 128",
        ageYears: 8,
        quantity: 1,
        confidence: 0.85,
        status: "REPORTED",
        location: {
          client: "Hospital DemoCare Pacific",
          city: "Panamá",
          country: "Panamá",
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        sourceObservationId: "obs-1",
      },
      {
        id: "eq-2",
        modality: "MRI",
        brand: "SIEMENS",
        model: "MAGNETOM Essenza 1.5T",
        ageYears: 6,
        quantity: 1,
        confidence: 0.78,
        status: "ESTIMATED",
        location: {
          client: "Hospital DemoCare Pacific",
          city: "Panamá",
          country: "Panamá",
        },
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
        sourceObservationId: "obs-1",
      },
    ],
    lastVisit: "2024-01-15T10:00:00Z",
    totalEquipmentCount: 2,
    renewalOpportunities: 1,
  },
  {
    clientId: "CLI-002",
    clientName: "Clínica San José",
    city: "Bogotá",
    country: "Colombia",
    equipments: [
      {
        id: "eq-3",
        modality: "ULTRASOUND",
        brand: "GE",
        model: "Voluson E10",
        ageYears: 3,
        quantity: 2,
        confidence: 0.92,
        status: "CONFIRMED",
        location: {
          client: "Clínica San José",
          city: "Bogotá",
          country: "Colombia",
        },
        createdAt: "2024-02-20T14:30:00Z",
        updatedAt: "2024-02-20T14:30:00Z",
        sourceObservationId: "obs-2",
      },
    ],
    lastVisit: "2024-02-20T14:30:00Z",
    totalEquipmentCount: 2,
    renewalOpportunities: 0,
  },
  {
    clientId: "CLI-003",
    clientName: "Hospital Nacional",
    city: "Lima",
    country: "Perú",
    equipments: [
      {
        id: "eq-4",
        modality: "XRAY",
        brand: "CANON",
        model: "CXDI-710C",
        ageYears: 10,
        quantity: 3,
        confidence: 0.88,
        status: "REPORTED",
        location: {
          client: "Hospital Nacional",
          city: "Lima",
          country: "Perú",
        },
        createdAt: "2024-03-10T09:15:00Z",
        updatedAt: "2024-03-10T09:15:00Z",
        sourceObservationId: "obs-3",
      },
      {
        id: "eq-5",
        modality: "CT",
        brand: "PHILIPS",
        model: "Brilliance 64",
        ageYears: 12,
        quantity: 1,
        confidence: 0.95,
        status: "CONFIRMED",
        location: {
          client: "Hospital Nacional",
          city: "Lima",
          country: "Perú",
        },
        createdAt: "2024-03-10T09:15:00Z",
        updatedAt: "2024-03-10T09:15:00Z",
        sourceObservationId: "obs-3",
      },
    ],
    lastVisit: "2024-03-10T09:15:00Z",
    totalEquipmentCount: 4,
    renewalOpportunities: 2,
  },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      observations: [],
      clients: mockClients,
      currentQuery: null,
      isLoading: false,
      error: null,

      addObservation: (obs) =>
        set((state) => ({ observations: [obs, ...state.observations] })),
      updateObservation: (id, data) =>
        set((state) => ({
          observations: state.observations.map((o) =>
            o.id === id ? { ...o, ...data } : o,
          ),
        })),
      deleteObservation: (id) =>
        set((state) => ({
          observations: state.observations.filter((o) => o.id !== id),
        })),
      setClients: (clients) => set({ clients }),
      setCurrentQuery: (query) => set({ currentQuery: query }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      getObservationsByClient: (clientId) => {
        const client = get().clients.find((c) => c.clientId === clientId);
        if (!client) return [];
        return get().observations.filter((o) =>
          o.extractedEquipments.some(
            (e) => e.location?.client === client.clientName,
          ),
        );
      },

      getEquipmentByModality: (modality) => {
        return get().clients.flatMap((c) =>
          c.equipments.filter((e) => e.modality === modality),
        );
      },
    }),
    {
      name: "atlas-app-storage",
      partialize: (state) => ({
        observations: state.observations,
        clients: state.clients,
      }),
    },
  ),
);
