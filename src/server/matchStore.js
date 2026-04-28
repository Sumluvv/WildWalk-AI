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

export function getMatch(matchId) {
  return matches.get(matchId) || null;
}
