import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

const dbPath = process.env.DB_FILE || ".data/wildwalk.sqlite";

function ensureDir() {
  mkdirSync(dirname(dbPath), { recursive: true });
}

let db = null;

function getDb() {
  if (db) return db;
  ensureDir();
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      match_id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS match_logs (
      match_id TEXT NOT NULL,
      log_index INTEGER NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (match_id, log_index)
    );
    CREATE TABLE IF NOT EXISTS match_chats (
      match_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (match_id, chat_id)
    );
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function loadStateFromSqlite() {
  try {
    const row = getDb().prepare("SELECT payload FROM app_state WHERE id = 1").get();
    if (!row?.payload) return null;
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
}

export function saveStateToSqlite(payload) {
  try {
    const serialized = JSON.stringify(payload || {});
    const updatedAt = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO app_state (id, payload, updated_at)
         VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
      )
      .run(serialized, updatedAt);
  } catch {
    // Keep app functional even if persistence fails.
  }
}

export function loadStructuredStateFromSqlite() {
  try {
    const database = getDb();
    const matchesRows = database.prepare("SELECT payload FROM matches ORDER BY match_id").all();
    if (!matchesRows.length) return null;

    const logsRows = database.prepare("SELECT match_id, payload FROM match_logs ORDER BY match_id, log_index").all();
    const chatsRows = database.prepare("SELECT match_id, payload FROM match_chats ORDER BY match_id, rowid").all();

    const matchLogs = {};
    const matchChats = {};
    for (const row of logsRows) {
      if (!matchLogs[row.match_id]) matchLogs[row.match_id] = [];
      matchLogs[row.match_id].push(JSON.parse(row.payload));
    }
    for (const row of chatsRows) {
      if (!matchChats[row.match_id]) matchChats[row.match_id] = [];
      matchChats[row.match_id].push(JSON.parse(row.payload));
    }

    return {
      savedAt: new Date().toISOString(),
      matches: matchesRows.map((row) => JSON.parse(row.payload)),
      matchLogs,
      matchChats
    };
  } catch {
    return null;
  }
}

export function saveStructuredStateToSqlite(payload) {
  try {
    const database = getDb();
    const now = new Date().toISOString();
    const matches = Array.isArray(payload?.matches) ? payload.matches : [];
    const matchLogs = payload?.matchLogs || {};
    const matchChats = payload?.matchChats || {};

    const tx = database.transaction(() => {
      database.prepare("DELETE FROM matches").run();
      database.prepare("DELETE FROM match_logs").run();
      database.prepare("DELETE FROM match_chats").run();

      const insertMatch = database.prepare(
        "INSERT INTO matches (match_id, payload, updated_at) VALUES (?, ?, ?)"
      );
      const insertLog = database.prepare(
        "INSERT INTO match_logs (match_id, log_index, payload, updated_at) VALUES (?, ?, ?, ?)"
      );
      const insertChat = database.prepare(
        "INSERT INTO match_chats (match_id, chat_id, payload, updated_at) VALUES (?, ?, ?, ?)"
      );

      for (const item of matches) {
        if (!item?.matchId) continue;
        insertMatch.run(item.matchId, JSON.stringify(item), now);
      }
      for (const [matchId, logs] of Object.entries(matchLogs)) {
        if (!Array.isArray(logs)) continue;
        logs.forEach((entry, index) => {
          insertLog.run(matchId, index, JSON.stringify(entry), now);
        });
      }
      for (const [matchId, chats] of Object.entries(matchChats)) {
        if (!Array.isArray(chats)) continue;
        chats.forEach((entry, index) => {
          const chatId = entry?.id || `chat_idx_${index}`;
          insertChat.run(matchId, chatId, JSON.stringify(entry), now);
        });
      }
    });
    tx();
  } catch {
    // Keep app functional even if persistence fails.
  }
}

export function checkSqliteHealth() {
  try {
    const database = getDb();
    database.prepare("SELECT 1 AS ok").get();
    return { ok: true, path: dbPath };
  } catch (error) {
    return {
      ok: false,
      path: dbPath,
      error: error instanceof Error ? error.message : "sqlite check failed"
    };
  }
}
