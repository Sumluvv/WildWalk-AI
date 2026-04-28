const matches = new Map();

function createId() {
  return `match_${Math.random().toString(36).slice(2, 10)}`;
}

export function createMatch({ scenarioId }) {
  const matchId = createId();
  const match = {
    matchId,
    scenarioId,
    round: 1,
    status: "waiting",
    partyState: {
      players: [],
      sharedSupplies: {}
    },
    createdAt: new Date().toISOString()
  };
  matches.set(matchId, match);
  return match;
}

export function listMatches() {
  return Array.from(matches.values());
}

export function loadMatches(items = []) {
  matches.clear();
  for (const item of items) {
    if (item?.matchId) matches.set(item.matchId, item);
  }
}

export function getMatch(matchId) {
  return matches.get(matchId) || null;
}

export function joinMatch(matchId, player) {
  const match = matches.get(matchId);
  if (!match) return { error: "NOT_FOUND" };
  if (match.status !== "waiting") return { error: "MATCH_ALREADY_STARTED" };
  const playerId = player?.playerId;
  const nickname = player?.nickname || playerId;
  if (!playerId) return { error: "INVALID_PLAYER" };

  const exists = match.partyState.players.some((p) => p.playerId === playerId);
  if (exists) return { error: "PLAYER_ALREADY_JOINED" };

  match.partyState.players.push({
    playerId,
    nickname,
    isReady: false,
    joinedAt: new Date().toISOString()
  });
  return { match };
}

export function markReady(matchId, playerId, ready = true) {
  const match = matches.get(matchId);
  if (!match) return { error: "NOT_FOUND" };
  const player = match.partyState.players.find((p) => p.playerId === playerId);
  if (!player) return { error: "PLAYER_NOT_FOUND" };
  player.isReady = Boolean(ready);
  return { match };
}

export function startMatch(matchId) {
  const match = matches.get(matchId);
  if (!match) return { error: "NOT_FOUND" };
  if (match.status !== "waiting") return { error: "MATCH_ALREADY_STARTED" };
  if (match.partyState.players.length < 2) return { error: "NEED_MORE_PLAYERS" };
  const allReady = match.partyState.players.every((p) => p.isReady);
  if (!allReady) return { error: "PLAYERS_NOT_READY" };

  match.status = "in_progress";
  match.startedAt = new Date().toISOString();
  return { match };
}

export function applyTurnResult(matchId, payload = {}) {
  const match = matches.get(matchId);
  if (!match) return { error: "NOT_FOUND" };
  if (match.status !== "in_progress") return { error: "MATCH_NOT_IN_PROGRESS" };

  match.lastTurn = {
    round: match.round,
    resolvedAt: new Date().toISOString(),
    ...payload
  };
  match.round += 1;
  match.updatedAt = new Date().toISOString();
  return { match };
}

export function finishMatch(matchId, reason) {
  const match = matches.get(matchId);
  if (!match) return { error: "NOT_FOUND" };
  if (match.status === "finished") return { error: "MATCH_ALREADY_FINISHED" };

  const allowed = ["summit_success", "all_dead", "rescue_abort"];
  if (!allowed.includes(reason)) return { error: "INVALID_FINISH_REASON" };

  match.status = "finished";
  match.finishReason = reason;
  match.finishedAt = new Date().toISOString();
  return { match };
}
