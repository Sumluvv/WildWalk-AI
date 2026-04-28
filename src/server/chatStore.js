const matchChats = new Map();

function now() {
  return new Date().toISOString();
}

function ensureMatch(matchId) {
  if (!matchChats.has(matchId)) matchChats.set(matchId, []);
  return matchChats.get(matchId);
}

export function appendPublicChat(matchId, { playerId, message, round }) {
  const logs = ensureMatch(matchId);
  const item = {
    id: `chat_${Math.random().toString(36).slice(2, 10)}`,
    scope: "public",
    playerId,
    message,
    round: Number(round || 0),
    createdAt: now()
  };
  logs.push(item);
  return item;
}

export function appendPrivateChat(matchId, { fromPlayerId, toPlayerId, message, round }) {
  const logs = ensureMatch(matchId);
  const item = {
    id: `chat_${Math.random().toString(36).slice(2, 10)}`,
    scope: "private",
    fromPlayerId,
    toPlayerId,
    message,
    round: Number(round || 0),
    createdAt: now()
  };
  logs.push(item);
  return item;
}

export function getVisibleChats(matchId, viewerPlayerId) {
  const logs = matchChats.get(matchId) || [];
  return logs.filter((item) => {
    if (item.scope === "public") return true;
    if (!viewerPlayerId) return false;
    return item.fromPlayerId === viewerPlayerId || item.toPlayerId === viewerPlayerId;
  });
}

export function getVisibleChatsSince(matchId, viewerPlayerId, since) {
  const min = Date.parse(since || "");
  const visible = getVisibleChats(matchId, viewerPlayerId);
  if (!Number.isFinite(min)) return visible;
  return visible.filter((item) => Date.parse(item.createdAt || "") > min);
}

export function getAllChats(matchId) {
  return matchChats.get(matchId) || [];
}

export function dumpMatchChats() {
  return Object.fromEntries(matchChats.entries());
}

export function loadMatchChats(payload = {}) {
  matchChats.clear();
  for (const [matchId, logs] of Object.entries(payload)) {
    matchChats.set(matchId, Array.isArray(logs) ? logs : []);
  }
}

export function getChatContextForRound(matchId, currentRound, options = {}) {
  const maxMessages = Number(options.maxMessages || 12);
  const roundsBack = Number(options.roundsBack || 2);
  const minRound = Math.max(1, Number(currentRound || 1) - roundsBack);
  const logs = getAllChats(matchId).filter((item) => Number(item.round || 0) >= minRound);
  if (logs.length <= maxMessages) return logs;
  return logs.slice(logs.length - maxMessages);
}
