import {
  INITIAL_STATS,
  SLOPE_COEFFICIENTS,
  STAT_MAX,
  STAT_MIN,
  WEATHER_COEFFICIENTS
} from "./coefficients.js";
import { applyActionEffects } from "./actions.js";
import { generateRoundEvents } from "./events.js";
import { filterVisibleEvents } from "./visibility.js";

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

function resolveSingleState({ state, action, weatherMul, slopeMul }) {
  let staminaLoss = 1.2 * weatherMul.staminaMul * slopeMul.staminaMul;
  if (state.water < 30) staminaLoss += 0.5;
  if (state.hunger < 30) staminaLoss += 0.5;
  if (state.cold < 30) staminaLoss += 0.8;

  let waterLoss = 1.0 * weatherMul.waterMul * slopeMul.waterMul;
  if (state.stamina < 20) waterLoss += 0.3;

  let hungerLoss = 0.7 * weatherMul.hungerMul * slopeMul.hungerMul;
  if (state.stamina < 30) hungerLoss += 0.2;

  let coldLoss = 0.8 * weatherMul.coldMul * slopeMul.coldMul;
  if (state.water < 20) coldLoss += 0.6;

  let stressGain = 0.6 * weatherMul.stressMul * slopeMul.stressMul;
  if (state.stamina < 30) stressGain += 0.6;
  if (state.water < 30) stressGain += 0.4;
  if (state.hunger < 30) stressGain += 0.3;
  if (state.cold < 30) stressGain += 0.7;

  const afterAction = applyActionEffects(
    { staminaLoss, waterLoss, hungerLoss, coldLoss, stressGain },
    action
  );

  const nextState = {
    stamina: clamp(state.stamina - afterAction.staminaLoss),
    water: clamp(state.water - afterAction.waterLoss),
    hunger: clamp(state.hunger - afterAction.hungerLoss),
    cold: clamp(state.cold - afterAction.coldLoss),
    stress: clamp(state.stress + afterAction.stressGain)
  };

  return {
    action: afterAction.action,
    nextState,
    numericDelta: {
      stamina: Number((nextState.stamina - state.stamina).toFixed(2)),
      water: Number((nextState.water - state.water).toFixed(2)),
      hunger: Number((nextState.hunger - state.hunger).toFixed(2)),
      cold: Number((nextState.cold - state.cold).toFixed(2)),
      stress: Number((nextState.stress - state.stress).toFixed(2))
    }
  };
}

export function resolveRound(input) {
  const state = { ...INITIAL_STATS, ...(input?.state || {}) };
  const weather = input?.environment?.weather || "cloudy";
  const slope = input?.environment?.slope || "flat";
  const seed = Number(input?.seed || 1);
  const round = Number(input?.round || 1);
  const players = Array.isArray(input?.players) ? input.players : [];
  const playerActions = Array.isArray(input?.playerActions) ? input.playerActions : [];
  const viewerPlayerId = input?.viewerPlayerId;
  const action = input?.action;
  const { weatherMul, slopeMul } = getMultipliers(weather, slope);
  const events = generateRoundEvents({ seed, round, players });
  const visibleEvents = filterVisibleEvents(events, viewerPlayerId);

  if (playerActions.length > 0) {
    const perPlayerResults = playerActions.map((entry) => {
      const playerId = entry?.playerId || "unknown";
      const playerState = { ...INITIAL_STATS, ...(entry?.state || {}) };
      const one = resolveSingleState({
        state: playerState,
        action: entry?.action,
        weatherMul,
        slopeMul
      });

      return {
        playerId,
        ...one,
        visibleEvents: filterVisibleEvents(events, playerId)
      };
    });

    return {
      events,
      visibleEvents,
      perPlayerResults
    };
  }

  const one = resolveSingleState({ state, action, weatherMul, slopeMul });
  return {
    numericDelta: one.numericDelta,
    action: one.action,
    nextState: one.nextState,
    events,
    visibleEvents
  };
}
