import * as SQLite from "expo-sqlite";

import type { LocalObservation } from "./types";

let database: SQLite.SQLiteDatabase | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  database ??= await SQLite.openDatabaseAsync("atlas-field.db");
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY NOT NULL,
      client TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      audio_uri TEXT,
      photo_uri TEXT,
      extraction_json TEXT NOT NULL,
      sync_state TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return database;
}

export async function saveObservation(observation: LocalObservation): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO observations
      (id, client, city, country, raw_text, audio_uri, photo_uri, extraction_json, sync_state, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    observation.id,
    observation.client,
    observation.city,
    observation.country,
    observation.rawText,
    observation.audioUri,
    observation.photoUri,
    JSON.stringify(observation.extraction),
    observation.syncState,
    observation.createdAt,
  );
}

export async function listObservations(): Promise<LocalObservation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    client: string;
    city: string;
    country: string;
    raw_text: string;
    audio_uri: string | null;
    photo_uri: string | null;
    extraction_json: string;
    sync_state: "Local" | "Pendiente de enviar";
    created_at: string;
  }>("SELECT * FROM observations ORDER BY created_at DESC");

  return rows.map((row) => ({
    id: row.id,
    client: row.client,
    city: row.city,
    country: row.country,
    rawText: row.raw_text,
    audioUri: row.audio_uri,
    photoUri: row.photo_uri,
    extraction: JSON.parse(row.extraction_json) as LocalObservation["extraction"],
    syncState: row.sync_state,
    createdAt: row.created_at,
  }));
}
