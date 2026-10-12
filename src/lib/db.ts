import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "calculator.db");

// Singleton connection for Next.js hot-reload development
declare global {
  // eslint-disable-next-line no-var
  var __sqlite_db: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (process.env.NODE_ENV === "production") {
    const db = new Database(dbPath);
    initSchema(db);
    return db;
  }

  if (!global.__sqlite_db) {
    global.__sqlite_db = new Database(dbPath);
    initSchema(global.__sqlite_db);
  }

  return global.__sqlite_db;
}

function initSchema(db: Database.Database) {
  // Enable WAL mode for high performance
  db.pragma("journal_mode = WAL");

  // Create calculation history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expression TEXT NOT NULL,
      result TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'standard',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON calculations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_calculations_favorite ON calculations(is_favorite);

    CREATE TABLE IF NOT EXISTS memory_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_key TEXT UNIQUE NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO memory_slots (slot_key, value) VALUES ('M', 0);
  `);
}

export const db = getDatabase();

export interface CalculationRecord {
  id: number;
  expression: string;
  result: string;
  mode: "standard" | "scientific";
  is_favorite: number;
  note: string;
  created_at: string;
}

export function getAllCalculations(filter?: {
  favoriteOnly?: boolean;
  mode?: string;
  search?: string;
}): CalculationRecord[] {
  let query = `SELECT id, expression, result, mode, is_favorite, note, created_at FROM calculations WHERE 1=1`;
  const params: (string | number)[] = [];

  if (filter?.favoriteOnly) {
    query += ` AND is_favorite = 1`;
  }

  if (filter?.mode && filter.mode !== "all") {
    query += ` AND mode = ?`;
    params.push(filter.mode);
  }

  if (filter?.search && filter.search.trim() !== "") {
    query += ` AND (expression LIKE ? OR result LIKE ? OR note LIKE ?)`;
    const term = `%${filter.search.trim()}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY created_at DESC, id DESC LIMIT 100`;

  return db.prepare(query).all(...params) as CalculationRecord[];
}

export function insertCalculation(
  expression: string,
  result: string,
  mode: "standard" | "scientific" = "standard",
  note: string = ""
): CalculationRecord {
  const stmt = db.prepare(`
    INSERT INTO calculations (expression, result, mode, note)
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(expression, result, mode, note);

  return db
    .prepare(
      `SELECT id, expression, result, mode, is_favorite, note, created_at FROM calculations WHERE id = ?`
    )
    .get(info.lastInsertRowid) as CalculationRecord;
}

export function toggleFavorite(id: number): CalculationRecord | null {
  const current = db
    .prepare(`SELECT is_favorite FROM calculations WHERE id = ?`)
    .get(id) as { is_favorite: number } | undefined;

  if (!current) return null;

  const newFav = current.is_favorite ? 0 : 1;
  db.prepare(`UPDATE calculations SET is_favorite = ? WHERE id = ?`).run(
    newFav,
    id
  );

  return db
    .prepare(
      `SELECT id, expression, result, mode, is_favorite, note, created_at FROM calculations WHERE id = ?`
    )
    .get(id) as CalculationRecord;
}

export function updateNote(id: number, note: string): CalculationRecord | null {
  db.prepare(`UPDATE calculations SET note = ? WHERE id = ?`).run(note, id);
  return db
    .prepare(
      `SELECT id, expression, result, mode, is_favorite, note, created_at FROM calculations WHERE id = ?`
    )
    .get(id) as CalculationRecord;
}

export function deleteCalculation(id: number): boolean {
  const info = db.prepare(`DELETE FROM calculations WHERE id = ?`).run(id);
  return info.changes > 0;
}

export function clearAllCalculations(): void {
  db.prepare(`DELETE FROM calculations`).run();
}

export function getStats(): {
  total: number;
  favorites: number;
  standardCount: number;
  scientificCount: number;
} {
  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM calculations`).get() as {
      count: number;
    }
  ).count;
  const favorites = (
    db
      .prepare(`SELECT COUNT(*) as count FROM calculations WHERE is_favorite = 1`)
      .get() as { count: number }
  ).count;
  const standardCount = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM calculations WHERE mode = 'standard'`
      )
      .get() as { count: number }
  ).count;
  const scientificCount = (
    db
      .prepare(
        `SELECT COUNT(*) as count FROM calculations WHERE mode = 'scientific'`
      )
      .get() as { count: number }
  ).count;

  return { total, favorites, standardCount, scientificCount };
}

export function getMemory(key: string = "M"): number {
  const row = db
    .prepare(`SELECT value FROM memory_slots WHERE slot_key = ?`)
    .get(key) as { value: number } | undefined;
  return row ? row.value : 0;
}

export function setMemory(key: string = "M", value: number): void {
  db.prepare(
    `INSERT INTO memory_slots (slot_key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(slot_key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  ).run(key, value);
}
