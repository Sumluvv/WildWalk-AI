import {
  INITIAL_STATS,
  SLOPE_COEFFICIENTS,
  STAT_MAX,
  STAT_MIN,
  WEATHER_COEFFICIENTS
} from "./coefficients.js";
import { generateRoundEvents } from "./events.js";

function clamp(value, min = STAT_MIN, max = STAT_MAX) {
  return Math.max(min, Math.min(max, value));
}

function getMultipliers(weather, slope) {
  const weatherMul = WEATHER_COEFFICIENTS[weather];
  const slopeMul = SLOPE_COEFFICIENTS[slope];
  if (!weatherMul) throw new Error(`Unknown weather type: ${weather}`);
  if (!slopeMul) throw new Error(`Unknown slope type: ${slope}`);
  return { weatherMul, slopeMul };
}

export function resolveRound(input) {
  const state = { ...INITIAL_STATS, ...(input?.state || {}) };
  const weather = input?.environment?.weather || "cloudy";
  const slope = input?.environment?.slope || "flat";
  const seed = Number(input?.seed || 1);
  const round = Number(input?.round || 1);
  const players = Array.isArray(input?.players) ? input.players : [];
  const { weatherMul, slopeMul } = getMultipliers(weather, slope);

  let staminaLoss = 1.2 * weatherMul.staminaMul * slopeMul.staminaMul;
  if (state.water < 30) staminaLoss += 0.5;
  if (state.hunger < 30) staminaLoss += 0.5;
  if (state.cold < 30) staminaLoss += 0.8;
  const stamina = clamp(state.stamina - staminaLoss);

  let waterLoss = 1.0 * weatherMul.waterMul * slopeMul.waterMul;
  if (state.stamina < 20) waterLoss += 0.3;
  const water = clamp(state.water - waterLoss);

  let hungerLoss = 0.7 * weatherMul.hungerMul * slopeMul.hungerMul;
  if (state.stamina < 30) hungerLoss += 0.2;
  const hunger = clamp(state.hunger - hungerLoss);

  let coldLoss = 0.8 * weatherMul.coldMul * slopeMul.coldMul;
  if (state.water < 20) coldLoss += 0.6;
  const cold = clamp(state.cold - coldLoss);

  let stressGain = 0.6 * weatherMul.stressMul * slopeMul.stressMul;
  if (state.stamina < 30) stressGain += 0.6;
  if (state.water < 30) stressGain += 0.4;
  if (state.hunger < 30) stressGain += 0.3;
  if (state.cold < 30) stressGain += 0.7;
  const stress = clamp(state.stress + stressGain);

  const nextState = { stamina, water, hunger, cold, stress };
  const events = generateRoundEvents({ seed, round, players });
  return {
    numericDelta: {
      stamina: Number((nextState.stamina - state.stamina).toFixed(2)),
      water: Number((nextState.water - state.water).toFixed(2)),
      hunger: Number((nextState.hunger - state.hunger).toFixed(2)),
      cold: Number((nextState.cold - state.cold).toFixed(2)),
      stress: Number((nextState.stress - state.stress).toFixed(2))
    },
    nextState,
    events
  };
}
