import { readFile } from "node:fs/promises";
import { arch, platform } from "node:os";
import { resolve } from "node:path";

import { completion, loadModel, unloadModel } from "@qvac/sdk";

import { writePerformanceRecord } from "./metrics.js";
import { normalizeInventoryFilters } from "./query-normalize.js";
import { queryModel } from "./query-model.js";
import type { PerformanceRecord } from "./types.js";

const root = resolve(import.meta.dirname, "../..");
const schema = JSON.parse(
  await readFile(resolve(root, "schemas/inventory-query.schema.json"), "utf8"),
) as Record<string, unknown>;

const INSTRUCTIONS = `Eres el generador de filtros de ATLAS. Convierte la pregunta del usuario en filtros de inventario. Nunca generes SQL.

Reglas:
- Usa null en cualquier filtro que la pregunta no mencione. No inventes valores.
- modality: solo CT, MR, Ultrasound, X-Ray, Patient Monitoring o Image Guided Therapy. Sinónimos: tomógrafo→CT, resonador/resonancia→MR, ecógrafo/ultrasonido→Ultrasound.
- country: nombre en inglés del dataset: Panama, Colombia, Brazil, Mexico, Peru, Chile, Argentina, Ecuador, Costa Rica o Dominican Republic.
- brand: solo NovaMed, Aurelia Health, BluePeak Medical, Orion Imaging, HelixCare o Zenith MedTech.
- "más de N años" o "mayor a N años" → minimum_age_years N. "menos de N años" → maximum_age_years N.
- "oportunidades de renovación" o "para renovar" → minimum_age_years 7.
- "sin confirmar", "pendientes" o "por confirmar" → exclude_confirmed true y status null.
- "confianza menor al N%" → maximum_confidence N/100.
- "instalados después de AAAA" → installation_year_min AAAA+1. "desde AAAA" → installation_year_min AAAA.
- status: "confirmados"→Confirmado, "reportados"→Reportado, "estimados"→Estimado, "desconocidos"→Desconocido.
- "sin verificar hace más de un año" → stale_only true.
- limit siempre 100.

Ejemplos:
"cuántos equipos hay" → todos null, exclude_confirmed false, stale_only false.
"oportunidades de renovación en Colombia" → country "Colombia", minimum_age_years 7.
"clientes en Brasil con resonadores de más de siete años" → country "Brazil", modality "MR", minimum_age_years 7.
"tomógrafos NovaMed con más de 10 años" → modality "CT", brand "NovaMed", minimum_age_years 10.
"equipos con confianza menor al 70%" → maximum_confidence 0.7.
"resonadores instalados después de 2020" → modality "MR", installation_year_min 2021.
"equipos reportados sin confirmar" → exclude_confirmed true, status null.
"base instalada por país" → todos null.`;

const ANSWER_PROMPT = `Eres ATLAS, un asistente de base instalada de equipos médicos.
Respondes en 1 o 2 frases, en español latinoamericano neutro.
Usas solo los datos verificados; no inventes cifras, clientes ni equipos.
Menciona las cifras y el criterio relevante: país, modalidad, marca, antigüedad o estado.
Si la pregunta trata de oportunidades de renovación, aclara que son candidatos a revisión de renovación.
Si la pregunta pide un conteo, empieza con la cifra total.
Ejemplos:
- Pregunta: "¿Cuántos equipos hay?" Datos: equipos 20, clientes 13 → "Hay 20 equipos registrados en 13 clientes."
- Pregunta: "Oportunidades de renovación en Colombia" Datos: equipos 3, clientes 2, país Colombia, antigüedad mínima 7 años → "Encontré 3 equipos con más de 7 años en 2 clientes en Colombia; son candidatos a revisión de renovación."
- Sin resultados: "No encontré equipos con ese criterio; prueba con otra modalidad, país o marca."
No menciones JSON, filtros ni términos técnicos.`;

export type Summary = {
  total_equipos?: number;
  total_clientes?: number;
  por_modalidad?: Record<string, number>;
  por_estado?: Record<string, number>;
  filtros_aplicados?: Record<string, unknown>;
  muestra?: Array<Record<string, unknown>>;
};

function baseMetric(task: string, prompt: string, label: string): PerformanceRecord {
  return {
    timestamp: new Date().toISOString(),
    hardware: `${platform()}-${arch()}`,
    model: label,
    quantization: "Q4",
    task,
    prompt,
    input_tokens: 0,
    output_tokens: 0,
    model_load_ms: 0,
    ttft_ms: 0,
    total_inference_ms: 0,
    tokens_per_second: 0,
    success: false,
    error: null,
  };
}

function summaryLines(summary: Summary): string {
  const lines: string[] = [];
  if (typeof summary.total_equipos === "number") {
    lines.push(`- Equipos: ${summary.total_equipos}`);
  }
  if (typeof summary.total_clientes === "number") {
    lines.push(`- Clientes: ${summary.total_clientes}`);
  }
  const filters = summary.filtros_aplicados ?? {};
  if (filters.country) lines.push(`- País: ${filters.country}`);
  if (filters.city) lines.push(`- Ciudad: ${filters.city}`);
  if (filters.customer) lines.push(`- Cliente: ${filters.customer}`);
  if (filters.modality) lines.push(`- Modalidad: ${filters.modality}`);
  if (filters.brand) lines.push(`- Marca: ${filters.brand}`);
  if (filters.minimum_age_years) {
    lines.push(`- Antigüedad mínima: ${filters.minimum_age_years} años`);
  }
  if (filters.maximum_age_years) {
    lines.push(`- Antigüedad máxima: ${filters.maximum_age_years} años`);
  }
  if (filters.maximum_confidence) {
    lines.push(
      `- Confianza máxima: ${Math.round(Number(filters.maximum_confidence) * 100)}%`,
    );
  }
  if (filters.installation_year_min) {
    lines.push(`- Instalados desde: ${filters.installation_year_min}`);
  }
  if (filters.exclude_confirmed) lines.push("- Sin confirmar: sí");
  if (filters.stale_only) lines.push("- Sin verificar recientemente: sí");
  if (summary.por_modalidad && Object.keys(summary.por_modalidad).length > 0) {
    const modalities = Object.entries(summary.por_modalidad)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    lines.push(`- Por modalidad: ${modalities}`);
  }
  if (summary.por_estado && Object.keys(summary.por_estado).length > 0) {
    const states = Object.entries(summary.por_estado)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
    lines.push(`- Por estado: ${states}`);
  }
  if (summary.muestra && summary.muestra.length > 0) {
    const samples = summary.muestra
      .map((item) =>
        [
          item.modalidad ?? "Equipo",
          item.marca ?? undefined,
          item.modelo ?? undefined,
          item.edad ? `${item.edad} años` : undefined,
          item.cliente ?? undefined,
          item.ciudad ?? undefined,
          item.pais ?? undefined,
        ]
          .filter(Boolean)
          .join(" "),
      )
      .join("; ");
    lines.push(`- Ejemplos: ${samples}`);
  }
  return lines.join("\n");
}

/**
 * Keeps the QVAC model loaded so the CLI and the persistent worker share the
 * same parsing and answer logic.
 */
export class QuerySession {
  private modelId: string | null = null;
  private label = "";
  private loading: Promise<string> | null = null;

  async ensureModel(): Promise<string> {
    if (this.modelId) return this.modelId;
    this.loading ??= this.loadModelOnce();
    try {
      return await this.loading;
    } catch (error) {
      this.loading = null;
      throw error;
    }
  }

  private async loadModelOnce(): Promise<string> {
    const { src, label } = await queryModel();
    const loadStarted = performance.now();
    const modelId =
      typeof src === "string"
        ? await loadModel({
            modelSrc: src,
            modelType: "llamacpp-completion",
            modelConfig: { ctx_size: 2048 },
          })
        : await loadModel({
            modelSrc: src,
            modelConfig: { ctx_size: 2048 },
          });
    this.modelId = modelId;
    this.label = label;
    this.loadMs = performance.now() - loadStarted;
    return modelId;
  }

  private loadMs = 0;

  get modelLoaded(): boolean {
    return this.modelId !== null;
  }

  get modelLabel(): string {
    return this.label;
  }

  async parse(question: string): Promise<object> {
    const prompt = `/no_think\n${INSTRUCTIONS}\n\nPregunta: ${question}`;
    const modelId = await this.ensureModel();
    const metric = baseMetric("inventory-query-parsing", prompt, this.label);
    metric.model_load_ms = this.loadMs;
    const inferenceStarted = performance.now();
    try {
      const run = completion({
        modelId,
        history: [{ role: "user", content: prompt }],
        stream: true,
        captureThinking: true,
        generationParams: {
          temp: 0,
          predict: 300,
          seed: 42,
          reasoning_budget: 0,
          remove_thinking_from_context: true,
        },
        responseFormat: {
          type: "json_schema",
          json_schema: { name: "inventory_filters", schema, strict: true },
        },
      });
      const final = await run.final;
      metric.total_inference_ms = performance.now() - inferenceStarted;
      metric.input_tokens = final.stats?.promptTokens ?? 0;
      metric.output_tokens = final.stats?.generatedTokens ?? 0;
      metric.ttft_ms = final.stats?.timeToFirstToken ?? 0;
      metric.tokens_per_second = final.stats?.tokensPerSecond ?? 0;
      const output = final.contentText.trim() || final.raw.fullText.trim();
      if (!output) throw new Error("QVAC returned empty inventory filters");
      const parsed = normalizeInventoryFilters(
        JSON.parse(output) as Record<string, unknown>,
        question,
      );
      metric.success = true;
      return parsed;
    } catch (error) {
      metric.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await writePerformanceRecord(metric);
    }
  }

  async answer(question: string, summary: Summary): Promise<string> {
    const userContent = `Pregunta: ${question}\nDatos verificados:\n${summaryLines(summary)}`;
    const modelId = await this.ensureModel();
    const metric = baseMetric("inventory-answer", userContent, this.label);
    metric.model_load_ms = this.loadMs;
    const inferenceStarted = performance.now();
    try {
      const run = completion({
        modelId,
        history: [
          { role: "system", content: ANSWER_PROMPT },
          { role: "user", content: userContent },
        ],
        stream: true,
        captureThinking: true,
        generationParams: {
          temp: 0.2,
          predict: 160,
          seed: 42,
          reasoning_budget: 0,
          remove_thinking_from_context: true,
        },
      });
      const final = await run.final;
      metric.total_inference_ms = performance.now() - inferenceStarted;
      metric.input_tokens = final.stats?.promptTokens ?? 0;
      metric.output_tokens = final.stats?.generatedTokens ?? 0;
      metric.ttft_ms = final.stats?.timeToFirstToken ?? 0;
      metric.tokens_per_second = final.stats?.tokensPerSecond ?? 0;
      const text = (final.contentText || final.raw.fullText || "").trim();
      if (!text) throw new Error("QVAC returned an empty inventory answer");
      metric.success = true;
      return text;
    } catch (error) {
      metric.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      await writePerformanceRecord(metric);
    }
  }

  async close(): Promise<void> {
    if (this.modelId) {
      await unloadModel({ modelId: this.modelId, clearStorage: false });
      this.modelId = null;
    }
  }
}
