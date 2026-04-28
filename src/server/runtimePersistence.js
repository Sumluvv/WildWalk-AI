import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  loadStateFromSqlite,
  loadStructuredStateFromSqlite,
  saveStateToSqlite,
  saveStructuredStateToSqlite
} from "./sqliteStore.js";

const defaultPath = process.env.RUNTIME_STORE_FILE || ".data/runtime-store.json";

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

export function loadRuntimeStore() {
  const structuredSnapshot = loadStructuredStateFromSqlite();
  if (structuredSnapshot) return structuredSnapshot;
  const sqliteSnapshot = loadStateFromSqlite();
  if (sqliteSnapshot) return sqliteSnapshot;
  try {
    const raw = readFileSync(defaultPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveRuntimeStore(payload) {
  saveStructuredStateToSqlite(payload);
  saveStateToSqlite(payload);
  try {
    ensureParent(defaultPath);
    writeFileSync(defaultPath, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // Best-effort persistence. Runtime should continue even if disk write fails.
  }
}
