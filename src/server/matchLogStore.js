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
