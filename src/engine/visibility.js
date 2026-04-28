export function filterVisibleEvents(events = [], playerId) {
  if (!playerId) {
    return events.filter((e) => e.visibility === "public");
  }

  return events.filter((e) => {
    if (e.visibility === "public") return true;
    if (e.visibility === "private") return e.targetPlayerId === playerId;
    return false;
  });
}
