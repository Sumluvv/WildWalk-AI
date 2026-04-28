const ACTION_KEYWORDS = [
  { action: "camp", words: ["扎营", "休息", "原地", "停下", "camp", "rest"] },
  { action: "hydrate", words: ["补水", "喝水", "找水", "取水", "hydrate", "water"] },
  { action: "check", words: ["检查", "整理", "装备", "观测", "check", "inspect"] },
  { action: "move", words: ["前进", "移动", "赶路", "上山", "follow", "move", "go"] }
];

const PLAYER_ID_PATTERN = /\b(P\d+)\b/i;

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

export function parseIntentAction(rawAction, intentText, fallbackAction = "check") {
  if (typeof rawAction === "string" && rawAction) return rawAction;
  const normalized = normalizeText(intentText);
  if (!normalized) return fallbackAction;
  for (const item of ACTION_KEYWORDS) {
    if (item.words.some((word) => normalized.includes(word))) {
      return item.action;
    }
  }
  return fallbackAction;
}

function parsePlayerId(text) {
  const found = String(text || "").match(PLAYER_ID_PATTERN);
  return found?.[1]?.toUpperCase() || null;
}

export function parseIntentDirectives({ playerId, intentText, followupIntent }) {
  const directives = {
    transfers: [],
    betrayalActions: []
  };
  const combined = `${intentText || ""} ${followupIntent || ""}`;
  const normalized = normalizeText(combined);
  const target = parsePlayerId(combined);

  if (target && target !== playerId) {
    const waterMatch = normalized.match(/(水|water).{0,6}(\d{1,2})/);
    if (waterMatch) {
      directives.transfers.push({
        fromPlayerId: playerId,
        toPlayerId: target,
        resource: "water",
        amount: Number(waterMatch[2] || 8)
      });
    }

    const foodMatch = normalized.match(/(食物|巧克力|能量|hunger|food).{0,6}(\d{1,2})/);
    if (foodMatch) {
      directives.transfers.push({
        fromPlayerId: playerId,
        toPlayerId: target,
        resource: "hunger",
        amount: Number(foodMatch[2] || 8)
      });
    }

    if (normalized.includes("藏") || normalized.includes("隐瞒")) {
      directives.betrayalActions.push({
        actorPlayerId: playerId,
        targetPlayerId: target,
        type: "hide_supply"
      });
    } else if (normalized.includes("拒绝")) {
      directives.betrayalActions.push({
        actorPlayerId: playerId,
        targetPlayerId: target,
        type: "refuse_share"
      });
    } else if (normalized.includes("骗") || normalized.includes("假信息")) {
      directives.betrayalActions.push({
        actorPlayerId: playerId,
        targetPlayerId: target,
        type: "fake_info"
      });
    }
  }

  return directives;
}
