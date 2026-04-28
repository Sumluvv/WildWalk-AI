export function buildMatchDiary(matchId, logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return `【WildWalk AI 徒步日记】\n对局 ${matchId} 还没有可用日志。`;
  }

  const lines = [`【WildWalk AI 徒步日记】`, `对局编号：${matchId}`, `回合数：${logs.length}`, ""];

  for (const log of logs) {
    const round = log?.round ?? "?";
    const narration = log?.narration || "这一回合没有记录到旁白。";
    const trustChangeCount = Array.isArray(log?.keyChanges?.trustChanges)
      ? log.keyChanges.trustChanges.length
      : 0;
    const betrayalCount = Array.isArray(log?.keyChanges?.betrayalResults)
      ? log.keyChanges.betrayalResults.filter((x) => x.status === "applied").length
      : 0;

    lines.push(`第 ${round} 回合：${narration}`);
    lines.push(`- 关系变化：${trustChangeCount} 处，背刺生效：${betrayalCount} 次`);
  }

  lines.push("");
  lines.push("—— 日记生成完成，愿你们下次在风雨中仍能同行。");
  return lines.join("\n");
}
