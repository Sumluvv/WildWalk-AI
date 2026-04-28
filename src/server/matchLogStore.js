const matchLogs = new Map();

export function appendMatchLog(matchId, entry) {
  if (!matchId) return;
  if (!matchLogs.has(matchId)) matchLogs.set(matchId, []);
  const logs = matchLogs.get(matchId);
  logs.push({
    timestamp: new Date().toISOString(),
    ...entry
  });
}

export function getMatchLogs(matchId) {
  return matchLogs.get(matchId) || [];
}

export function getMatchLogsSince(matchId, since) {
  const min = Date.parse(since || "");
  if (!Number.isFinite(min)) return getMatchLogs(matchId);
  return getMatchLogs(matchId).filter((item) => Date.parse(item.timestamp || "") > min);
}

export function dumpMatchLogs() {
  return Object.fromEntries(matchLogs.entries());
}

export function loadMatchLogs(payload = {}) {
  matchLogs.clear();
  for (const [matchId, logs] of Object.entries(payload)) {
    matchLogs.set(matchId, Array.isArray(logs) ? logs : []);
  }
}
