import path from "path";
import fs from "fs";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "calculator_data.json");

export interface CalculationRecord {
  id: number;
  expression: string;
  result: string;
  mode: "standard" | "scientific";
  is_favorite: number;
  note: string;
  created_at: string;
}

interface DbSchema {
  calculations: CalculationRecord[];
  memorySlots: Record<string, number>;
  nextId: number;
}

function loadData(): DbSchema {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read JSON DB:", err);
  }
  return {
    calculations: [],
    memorySlots: { M: 0 },
    nextId: 1,
  };
}

function saveData(data: DbSchema): void {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save JSON DB:", err);
  }
}

let dbState = loadData();

export function getAllCalculations(filter?: {
  favoriteOnly?: boolean;
  mode?: string;
  search?: string;
}): CalculationRecord[] {
  let list = [...dbState.calculations];

  if (filter?.favoriteOnly) {
    list = list.filter((c) => c.is_favorite === 1);
  }

  if (filter?.mode && filter.mode !== "all") {
    list = list.filter((c) => c.mode === filter.mode);
  }

  if (filter?.search && filter.search.trim() !== "") {
    const term = filter.search.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.expression.toLowerCase().includes(term) ||
        c.result.toLowerCase().includes(term) ||
        (c.note && c.note.toLowerCase().includes(term))
    );
  }

  // Sort descending by id/created_at
  return list.sort((a, b) => b.id - a.id).slice(0, 100);
}

export function insertCalculation(
  expression: string,
  result: string,
  mode: "standard" | "scientific" = "standard",
  note: string = ""
): CalculationRecord {
  const record: CalculationRecord = {
    id: dbState.nextId++,
    expression,
    result,
    mode,
    is_favorite: 0,
    note,
    created_at: new Date().toISOString(),
  };

  dbState.calculations.unshift(record);
  saveData(dbState);
  return record;
}

export function toggleFavorite(id: number): CalculationRecord | null {
  const item = dbState.calculations.find((c) => c.id === id);
  if (!item) return null;

  item.is_favorite = item.is_favorite ? 0 : 1;
  saveData(dbState);
  return item;
}

export function updateNote(id: number, note: string): CalculationRecord | null {
  const item = dbState.calculations.find((c) => c.id === id);
  if (!item) return null;

  item.note = note;
  saveData(dbState);
  return item;
}

export function deleteCalculation(id: number): boolean {
  const initialLen = dbState.calculations.length;
  dbState.calculations = dbState.calculations.filter((c) => c.id !== id);
  const changed = dbState.calculations.length < initialLen;
  if (changed) {
    saveData(dbState);
  }
  return changed;
}

export function clearAllCalculations(): void {
  dbState.calculations = [];
  saveData(dbState);
}

export function getStats(): {
  total: number;
  favorites: number;
  standardCount: number;
  scientificCount: number;
} {
  const total = dbState.calculations.length;
  const favorites = dbState.calculations.filter((c) => c.is_favorite === 1).length;
  const standardCount = dbState.calculations.filter((c) => c.mode === "standard").length;
  const scientificCount = dbState.calculations.filter((c) => c.mode === "scientific").length;

  return { total, favorites, standardCount, scientificCount };
}

export function getMemory(key: string = "M"): number {
  return dbState.memorySlots[key] ?? 0;
}

export function setMemory(key: string = "M", value: number): void {
  dbState.memorySlots[key] = value;
  saveData(dbState);
}
