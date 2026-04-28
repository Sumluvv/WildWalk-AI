function safeNum(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function renderNarrationPreview(packet = {}) {
  const round = packet?.round ?? "?";
  const weather = packet?.environment?.weather || "未知天气";
  const slope = packet?.environment?.slope || "未知坡度";
  const summary = packet?.summary || {};

  const publicEventCount = safeNum(summary.publicEventCount);
  const privateEventCount = safeNum(summary.privateEventCount);
  const sharedIntelCount = safeNum(summary.sharedIntelCount);
  const appliedTransfers = safeNum(summary.appliedTransfers);
  const appliedBetrayals = safeNum(summary.appliedBetrayals);
  const trustChangeCount = safeNum(summary.trustChangeCount);

  const mood =
    appliedBetrayals > appliedTransfers
      ? "队伍气氛明显紧张"
      : appliedTransfers > 0
        ? "互助让队伍暂时稳定"
        : "队伍在谨慎观望中推进";

  return [
    `第 ${round} 回合，天气为${weather}，地形坡度${slope}。`,
    `本回合公开事件 ${publicEventCount} 条，私有事件 ${privateEventCount} 条，其中共享情报 ${sharedIntelCount} 条。`,
    `资源互助成功 ${appliedTransfers} 次，背刺行为生效 ${appliedBetrayals} 次，关系波动 ${trustChangeCount} 处。`,
    `${mood}。`
  ].join("");
}
