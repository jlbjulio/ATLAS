import { File } from "expo-file-system";

import type { Extraction, LocalObservation } from "./types";

const CONNECT_TIMEOUT_MS = 8_000;
const REQUEST_TIMEOUT_MS = 45_000;

export type P2PProvider = {
  baseUrl: string;
  token: string;
  expiresAt: string;
};

type PairResponse = {
  token: string;
  expires_at: string;
  capabilities: string[];
};

type InviteConsumeResponse = {
  local_url: string;
  code: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.trim());
  } catch {
    throw new Error("Ingresa la URL local de la laptop, por ejemplo http://192.168.1.20:8000.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("La URL debe ser el origen HTTP(S) de la laptop, sin ruta ni credenciales.");
  }
  return parsed.origin;
}

async function timedFetch(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `El proveedor P2P no respondió en ${Math.round(timeoutMs / 1000)}s (${url}).`,
        { cause: error },
      );
    }
    throw new Error(
      `No se pudo conectar con ${url}. Verifica que el celular y la laptop estén en la misma red Wi-Fi.`,
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function pingProvider(baseUrl: string): Promise<void> {
  const response = await timedFetch(
    `${baseUrl}/api/health`,
    { method: "GET" },
    CONNECT_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`La laptop respondió pero no está lista (${baseUrl}).`);
  }
}

async function providerFetch(
  provider: P2PProvider,
  path: string,
  options: RequestInit,
): Promise<Response> {
  if (Date.parse(provider.expiresAt) <= Date.now()) {
    throw new Error("La sesión P2P expiró. Empareja el celular de nuevo.");
  }
  const response = await timedFetch(`${provider.baseUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      "X-ATLAS-P2P-Token": provider.token,
    },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "La sesión P2P fue rechazada. Empareja el celular de nuevo."
        : "El proveedor P2P no pudo completar la inferencia.",
    );
  }
  return response;
}

export async function consumeInvitation(
  inviteUrl: string,
): Promise<InviteConsumeResponse> {
  let parsed: URL;
  try {
    parsed = new URL(inviteUrl.trim());
  } catch {
    throw new Error("El enlace de invitación no es válido.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("El enlace debe ser HTTP o HTTPS.");
  }
  const origin = parsed.origin;
  const response = await timedFetch(
    `${origin}/api/p2p/invite/consume`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: parsed.pathname.split("/").pop() || "" }),
    },
    CONNECT_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error("La invitación no es válida, ya fue usada o expiró.");
  }
  return (await response.json()) as InviteConsumeResponse;
}

export async function pairWithProvider(
  baseUrl: string,
  code: string,
): Promise<P2PProvider> {
  const origin = normalizeBaseUrl(baseUrl);
  const response = await timedFetch(
    `${origin}/api/p2p/pair`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), device_name: "ATLAS Field" }),
    },
    CONNECT_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "El código de emparejamiento no es válido."
        : "La laptop no tiene el proveedor P2P habilitado.",
    );
  }
  const paired = (await response.json()) as PairResponse;
  if (!paired.capabilities.includes("extract") || !paired.capabilities.includes("transcribe")) {
    throw new Error("La laptop no ofrece las capacidades P2P requeridas.");
  }
  return { baseUrl: origin, token: paired.token, expiresAt: paired.expires_at };
}

export async function pairWithInvitation(
  inviteUrl: string,
): Promise<P2PProvider> {
  const invite = await consumeInvitation(inviteUrl);
  // Quick connectivity check before the full pair handshake.
  await pingProvider(invite.local_url);
  return pairWithProvider(invite.local_url, invite.code);
}

export async function delegateExtraction(
  provider: P2PProvider,
  text: string,
): Promise<Extraction> {
  const response = await providerFetch(provider, "/api/p2p/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const payload = (await response.json()) as {
    equipments: Extraction["equipments"];
    missing_fields: string[];
    next_question: string | null;
    confidence: number;
  };
  return {
    equipments: payload.equipments,
    missingFields: payload.missing_fields,
    nextQuestion: payload.next_question,
    confidence: payload.confidence,
  };
}

export async function delegateTranscription(
  provider: P2PProvider,
  uri: string,
): Promise<string> {
  const audio = new File(uri);
  const formData = new FormData();
  formData.append("file", audio, audio.name || "recording.m4a");
  const response = await providerFetch(provider, "/api/p2p/transcribe", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json()) as { text: string };
  return payload.text;
}

export type P2PSyncResult = {
  id: string;
  ok: boolean;
  error: string | null;
};

export type P2PSyncResponse = {
  synced: number;
  results: P2PSyncResult[];
  errors: string[];
};

export async function syncObservations(
  provider: P2PProvider,
  observations: LocalObservation[],
): Promise<P2PSyncResponse> {
  const payload = observations.map((obs) => ({
    id: obs.id,
    client: obs.client,
    city: obs.city,
    country: obs.country,
    raw_text: obs.rawText,
    audio_uri: obs.audioUri,
    photo_uri: obs.photoUri,
    extraction: obs.extraction,
    created_at: obs.createdAt,
  }));
  const response = await providerFetch(provider, "/api/p2p/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observations: payload }),
  });
  return response.json() as Promise<P2PSyncResponse>;
}
