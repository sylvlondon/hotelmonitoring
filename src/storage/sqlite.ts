import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { SheetRecord } from '../types.js';

const DEFAULT_DB_PATH = process.env.SQLITE_DB_PATH ?? 'output/monitoring.db';

function openDb() {
  mkdirSync(dirname(DEFAULT_DB_PATH), { recursive: true });
  const db = new Database(DEFAULT_DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitoring_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT NOT NULL,
      run_ts_utc TEXT NOT NULL,
      run_ts_local TEXT NOT NULL,
      hotel_id TEXT NOT NULL,
      hotel_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      target_date TEXT NOT NULL,
      available_rooms_count INTEGER NOT NULL,
      total_rooms INTEGER NOT NULL,
      occupancy_ratio REAL NOT NULL,
      available_room_ids_or_categories TEXT NOT NULL,
      status TEXT NOT NULL,
      error_code TEXT NOT NULL,
      error_message TEXT NOT NULL,
      created_at_utc TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_monitoring_run_id ON monitoring_records(run_id);
    CREATE INDEX IF NOT EXISTS idx_monitoring_target_date ON monitoring_records(target_date);
    CREATE INDEX IF NOT EXISTS idx_monitoring_hotel_id ON monitoring_records(hotel_id);
  `);
}

export function insertRecords(records: SheetRecord[]): void {
  if (records.length === 0) {
    return;
  }

  const db = openDb();
  try {
    ensureSchema(db);

    const insert = db.prepare(`
      INSERT INTO monitoring_records (
        run_id,
        run_ts_utc,
        run_ts_local,
        hotel_id,
        hotel_name,
        provider,
        target_date,
        available_rooms_count,
        total_rooms,
        occupancy_ratio,
        available_room_ids_or_categories,
        status,
        error_code,
        error_message
      ) VALUES (
        @run_id,
        @run_ts_utc,
        @run_ts_local,
        @hotel_id,
        @hotel_name,
        @provider,
        @target_date,
        @available_rooms_count,
        @total_rooms,
        @occupancy_ratio,
        @available_room_ids_or_categories,
        @status,
        @error_code,
        @error_message
      )
    `);

    const tx = db.transaction((rows: SheetRecord[]) => {
      for (const row of rows) {
        insert.run(row);
      }
    });

    tx(records);
  } finally {
    db.close();
  }
}

export function getRecordsByRunId(runId: string): SheetRecord[] {
  const db = openDb();
  try {
    ensureSchema(db);
    const stmt = db.prepare(`
      SELECT
        run_id,
        run_ts_utc,
        run_ts_local,
        hotel_id,
        hotel_name,
        provider,
        target_date,
        available_rooms_count,
        total_rooms,
        occupancy_ratio,
        available_room_ids_or_categories,
        status,
        error_code,
        error_message
      FROM monitoring_records
      WHERE run_id = ?
      ORDER BY hotel_name ASC, target_date ASC
    `);

    return stmt.all(runId) as SheetRecord[];
  } finally {
    db.close();
  }
}
