function sumApplied(items = []) {
  if (!Array.isArray(items)) return 0;
  return items.filter((x) => x?.status === "applied").length;
}

export function buildMatchBadge(matchId, logs = []) {
  const rounds = Array.isArray(logs) ? logs.length : 0;
  let cooperationCount = 0;
  let betrayalCount = 0;
  let trustChangeCount = 0;

  for (const log of logs || []) {
    cooperationCount += sumApplied(log?.keyChanges?.transferResults || []);
    betrayalCount += sumApplied(log?.keyChanges?.betrayalResults || []);
    trustChangeCount += Array.isArray(log?.keyChanges?.trustChanges)
      ? log.keyChanges.trustChanges.length
      : 0;
  }

  let level = "Bronze";
  if (rounds >= 8 || cooperationCount >= 5) level = "Silver";
  if (rounds >= 15 || cooperationCount >= 10) level = "Gold";

  let title = "谨慎徒步者";
  if (cooperationCount >= betrayalCount + 3) title = "风雨同路者";
  else if (betrayalCount >= cooperationCount + 2) title = "暗流策士";

  return {
    matchId,
    level,
    title,
    stats: {
      rounds,
      cooperationCount,
      betrayalCount,
      trustChangeCount
    }
  };
}
