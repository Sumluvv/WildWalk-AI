const ACTION_DEFAULT = "move";

export function normalizeAction(action) {
  if (!action || typeof action !== "string") return ACTION_DEFAULT;
  const lowered = action.toLowerCase();
  if (["move", "camp", "hydrate", "check"].includes(lowered)) return lowered;
  return ACTION_DEFAULT;
}

export function applyActionEffects(base, action) {
  const current = { ...base };
  const picked = normalizeAction(action);

  // Keep action effects simple for MVP and easy balancing later.
  if (picked === "move") {
    current.staminaLoss += 0.7;
    current.waterLoss += 0.4;
    current.stressGain += 0.1;
  } else if (picked === "camp") {
    current.staminaLoss -= 0.6;
    current.coldLoss -= 0.5;
    current.stressGain -= 0.2;
  } else if (picked === "hydrate") {
    current.waterLoss -= 1.2;
    current.staminaLoss -= 0.2;
  } else if (picked === "check") {
    current.stressGain -= 0.3;
  }

  return {
    action: picked,
    staminaLoss: Math.max(0, current.staminaLoss),
    waterLoss: Math.max(0, current.waterLoss),
    hungerLoss: Math.max(0, current.hungerLoss),
    coldLoss: Math.max(0, current.coldLoss),
    stressGain: Math.max(0, current.stressGain)
  };
}
