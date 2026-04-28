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

function recalculateDelta(baseState, nextState) {
  return {
    stamina: Number((nextState.stamina - baseState.stamina).toFixed(2)),
    water: Number((nextState.water - baseState.water).toFixed(2)),
    hunger: Number((nextState.hunger - baseState.hunger).toFixed(2)),
    cold: Number((nextState.cold - baseState.cold).toFixed(2)),
    stress: Number((nextState.stress - baseState.stress).toFixed(2))
  };
}

function setTrustValue(trustMap, fromId, toId, value) {
  trustMap.set(`${fromId}->${toId}`, clamp(value));
}

function buildTrustMap(trustMatrix = []) {
  const trustMap = new Map();
  for (const item of trustMatrix) {
    const fromId = item?.fromPlayerId;
    const toId = item?.toPlayerId;
    if (!fromId || !toId) continue;
    setTrustValue(trustMap, fromId, toId, Number(item?.value || 0));
  }
  return trustMap;
}

function trustMatrixFromMap(trustMap) {
  const result = [];
  for (const [key, value] of trustMap.entries()) {
    const [fromPlayerId, toPlayerId] = key.split("->");
    result.push({ fromPlayerId, toPlayerId, value });
  }
  return result;
}

function adjustTrustDelta(trustMap, fromId, toId, delta) {
  const current = Number(trustMap.get(`${fromId}->${toId}`) ?? 0);
  setTrustValue(trustMap, fromId, toId, current + delta);
}

function getTrustValue(trustMatrix, fromId, toId) {
  const found = trustMatrix.find((t) => t?.fromPlayerId === fromId && t?.toPlayerId === toId);
  return Number(found?.value ?? 0);
}

function visibleTransferForPlayer(transfer, playerId) {
  if (!transfer) return false;
  if (!transfer.isHidden) return true;
  return transfer.fromPlayerId === playerId || transfer.toPlayerId === playerId;
}

function applyResourceTransfers(perPlayerResults, transfers = [], trustMatrix = []) {
  if (!Array.isArray(transfers) || transfers.length === 0) return { perPlayerResults, transferResults: [] };

  const byId = new Map(perPlayerResults.map((r) => [r.playerId, r]));
  const transferResults = [];

  for (const transfer of transfers) {
    const fromId = transfer?.fromPlayerId;
    const toId = transfer?.toPlayerId;
    const resource = transfer?.resource;
    const amount = Number(transfer?.amount || 0);
    const isHidden = Boolean(transfer?.isHidden);
    const requiresTrust = Number(transfer?.requiresTrust || 0);
    if (!fromId || !toId || fromId === toId) {
      transferResults.push({ ...transfer, isHidden, status: "rejected_invalid_players", movedAmount: 0 });
      continue;
    }
    if (!["water", "hunger"].includes(resource)) {
      transferResults.push({ ...transfer, isHidden, status: "rejected_invalid_resource", movedAmount: 0 });
      continue;
    }
    if (amount <= 0) {
      transferResults.push({ ...transfer, isHidden, status: "rejected_invalid_amount", movedAmount: 0 });
      continue;
    }

    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) {
      transferResults.push({ ...transfer, isHidden, status: "rejected_player_not_found", movedAmount: 0 });
      continue;
    }

    const trustValue = getTrustValue(trustMatrix, fromId, toId);
    if (requiresTrust > 0 && trustValue < requiresTrust) {
      transferResults.push({
        ...transfer,
        isHidden,
        trustValue,
        status: "blocked_trust",
        movedAmount: 0
      });
      continue;
    }

    const movable = Math.min(amount, from.nextState[resource]);
    if (movable <= 0) {
      transferResults.push({ ...transfer, isHidden, status: "rejected_insufficient_resource", movedAmount: 0 });
      continue;
    }

    from.nextState[resource] = clamp(from.nextState[resource] - movable);
    to.nextState[resource] = clamp(to.nextState[resource] + movable);
    transferResults.push({
      ...transfer,
      isHidden,
      trustValue,
      status: "applied",
      movedAmount: movable
    });
  }

  for (const player of perPlayerResults) {
    player.numericDelta = recalculateDelta(player.baseState, player.nextState);
    player.visibleTransfers = transferResults.filter((t) =>
      visibleTransferForPlayer(t, player.playerId)
    );
  }

  return { perPlayerResults, transferResults };
}

function applyBetrayalActions(perPlayerResults, betrayalActions = [], trustMap) {
  if (!Array.isArray(betrayalActions) || betrayalActions.length === 0) return [];
  const byId = new Map(perPlayerResults.map((r) => [r.playerId, r]));
  const results = [];

  for (const action of betrayalActions) {
    const actorId = action?.actorPlayerId;
    const targetId = action?.targetPlayerId;
    const type = action?.type;
    if (!actorId || !targetId || actorId === targetId) {
      results.push({ ...action, status: "rejected_invalid_players" });
      continue;
    }
    if (!["hide_supply", "refuse_share", "fake_info"].includes(type)) {
      results.push({ ...action, status: "rejected_invalid_type" });
      continue;
    }
    const actor = byId.get(actorId);
    const target = byId.get(targetId);
    if (!actor || !target) {
      results.push({ ...action, status: "rejected_player_not_found" });
      continue;
    }

    let trustDrop = 10;
    let stressUp = 4;
    if (type === "refuse_share") {
      trustDrop = 12;
      stressUp = 3;
    } else if (type === "fake_info") {
      trustDrop = 18;
      stressUp = 6;
    }

    const key = `${actorId}->${targetId}`;
    const currentTrust = Number(trustMap.get(key) ?? 0);
    setTrustValue(trustMap, actorId, targetId, currentTrust - trustDrop);

    target.nextState.stress = clamp(target.nextState.stress + stressUp);
    target.numericDelta = recalculateDelta(target.baseState, target.nextState);

    results.push({
      ...action,
      status: "applied",
      trustDelta: -trustDrop,
      stressDeltaToTarget: stressUp
    });
  }

  return results;
}

function evolveTrustFromRound({ trustMap, transferResults = [], betrayalResults = [] }) {
  const changes = [];

  for (const transfer of transferResults) {
    if (transfer?.status !== "applied") continue;
    const fromId = transfer.fromPlayerId;
    const toId = transfer.toPlayerId;
    if (!fromId || !toId) continue;

    const gain = transfer.isHidden ? 1 : 2;
    adjustTrustDelta(trustMap, toId, fromId, gain);
    changes.push({
      fromPlayerId: toId,
      toPlayerId: fromId,
      delta: gain,
      reason: transfer.isHidden ? "hidden_transfer_applied" : "public_transfer_applied"
    });
  }

  for (const betrayal of betrayalResults) {
    if (betrayal?.status !== "applied") continue;
    const actorId = betrayal.actorPlayerId;
    const targetId = betrayal.targetPlayerId;
    if (!actorId || !targetId) continue;

    const extraDrop = betrayal.type === "fake_info" ? -4 : -2;
    adjustTrustDelta(trustMap, actorId, targetId, extraDrop);
    changes.push({
      fromPlayerId: actorId,
      toPlayerId: targetId,
      delta: extraDrop,
      reason: `betrayal_${betrayal.type}`
    });
  }

  return changes;
}

function applyEventDisclosures(events = [], disclosures = [], players = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return { events, disclosureResults: [], teamIntel: [] };
  }
  if (!Array.isArray(disclosures) || disclosures.length === 0) {
    return { events, disclosureResults: [], teamIntel: [] };
  }

  const privateByTarget = new Map();
  for (const event of events) {
    if (event?.visibility !== "private") continue;
    if (!event?.targetPlayerId) continue;
    if (!privateByTarget.has(event.targetPlayerId)) privateByTarget.set(event.targetPlayerId, []);
    privateByTarget.get(event.targetPlayerId).push(event);
  }

  const playerIds = new Set(players.map((p) => p.id));
  const disclosureResults = [];
  const teamIntel = [];

  for (const d of disclosures) {
    const playerId = d?.playerId;
    const disclose = Boolean(d?.disclose);
    if (!playerId || !playerIds.has(playerId)) {
      disclosureResults.push({ ...d, status: "rejected_invalid_player" });
      continue;
    }
    const owned = privateByTarget.get(playerId) || [];
    if (owned.length === 0) {
      disclosureResults.push({ ...d, status: "skipped_no_private_event", sharedCount: 0 });
      continue;
    }

    if (disclose) {
      for (const e of owned) {
        teamIntel.push({
          sourcePlayerId: playerId,
          eventId: e.id,
          title: e.title,
          effect: e.effect,
          fromPrivateEvent: true
        });
      }
      disclosureResults.push({ ...d, status: "applied_disclosed", sharedCount: owned.length });
    } else {
      disclosureResults.push({ ...d, status: "applied_hidden", sharedCount: 0 });
    }
  }

  return { events, disclosureResults, teamIntel };
}

function applyDisclosureConsequences({
  perPlayerResults,
  disclosureResults = [],
  teamIntel = [],
  trustMap
}) {
  if (!Array.isArray(perPlayerResults) || perPlayerResults.length === 0) return [];
  const byId = new Map(perPlayerResults.map((p) => [p.playerId, p]));
  const allPlayerIds = perPlayerResults.map((p) => p.playerId);
  const consequences = [];

  for (const d of disclosureResults) {
    const actorId = d?.playerId;
    if (!actorId || !byId.has(actorId)) continue;
    const actor = byId.get(actorId);

    if (d.status === "applied_disclosed") {
      // Open sharing calms team slightly and improves trust towards actor.
      for (const otherId of allPlayerIds) {
        if (otherId === actorId) continue;
        const other = byId.get(otherId);
        other.nextState.stress = clamp(other.nextState.stress - 1);
        other.numericDelta = recalculateDelta(other.baseState, other.nextState);
        adjustTrustDelta(trustMap, otherId, actorId, 1);
        consequences.push({
          playerId: otherId,
          sourcePlayerId: actorId,
          type: "disclosure_shared",
          stressDelta: -1,
          trustDelta: +1
        });
      }
    } else if (d.status === "applied_hidden") {
      // Hiding known private intel increases suspicion.
      actor.nextState.stress = clamp(actor.nextState.stress + 1);
      actor.numericDelta = recalculateDelta(actor.baseState, actor.nextState);
      for (const otherId of allPlayerIds) {
        if (otherId === actorId) continue;
        adjustTrustDelta(trustMap, otherId, actorId, -1);
      }
      consequences.push({
        playerId: actorId,
        sourcePlayerId: actorId,
        type: "disclosure_hidden",
        stressDelta: +1,
        trustDelta: -1
      });
    }
  }

  // Keep explicit signal when something was disclosed.
  if (teamIntel.length > 0) {
    consequences.push({
      type: "team_intel_updated",
      sharedEventCount: teamIntel.length
    });
  }

  return consequences;
}

export function resolveRound(input) {
  const state = { ...INITIAL_STATS, ...(input?.state || {}) };
  const weather = input?.environment?.weather || "cloudy";
  const slope = input?.environment?.slope || "flat";
  const seed = Number(input?.seed || 1);
  const round = Number(input?.round || 1);
  const players = Array.isArray(input?.players) ? input.players : [];
  const playerActions = Array.isArray(input?.playerActions) ? input.playerActions : [];
  const transfers = Array.isArray(input?.transfers) ? input.transfers : [];
  const betrayalActions = Array.isArray(input?.betrayalActions) ? input.betrayalActions : [];
  const eventDisclosures = Array.isArray(input?.eventDisclosures) ? input.eventDisclosures : [];
  const trustMatrix = Array.isArray(input?.trustMatrix) ? input.trustMatrix : [];
  const viewerPlayerId = input?.viewerPlayerId;
  const action = input?.action;
  const { weatherMul, slopeMul } = getMultipliers(weather, slope);
  const events = generateRoundEvents({ seed, round, players });
  const disclosure = applyEventDisclosures(events, eventDisclosures, players);
  const visibleEvents = filterVisibleEvents(events, viewerPlayerId);

  if (playerActions.length > 0) {
    const trustMap = buildTrustMap(trustMatrix);
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
        baseState: playerState,
        ...one,
        visibleEvents: filterVisibleEvents(events, playerId)
      };
    });

    const { transferResults } = applyResourceTransfers(
      perPlayerResults,
      transfers,
      trustMatrixFromMap(trustMap)
    );
    const betrayalResults = applyBetrayalActions(perPlayerResults, betrayalActions, trustMap);
    const trustChanges = evolveTrustFromRound({
      trustMap,
      transferResults,
      betrayalResults
    });
    const disclosureConsequences = applyDisclosureConsequences({
      perPlayerResults,
      disclosureResults: disclosure.disclosureResults,
      teamIntel: disclosure.teamIntel,
      trustMap
    });

    for (const player of perPlayerResults) {
      delete player.baseState;
    }

    return {
      events: disclosure.events,
      visibleEvents,
      disclosureResults: disclosure.disclosureResults,
      teamIntel: disclosure.teamIntel,
      trustMatrix: trustMatrixFromMap(trustMap),
      trustChanges,
      disclosureConsequences,
      transferResults,
      betrayalResults,
      perPlayerResults
    };
  }

  const one = resolveSingleState({ state, action, weatherMul, slopeMul });
  return {
    numericDelta: one.numericDelta,
    action: one.action,
    nextState: one.nextState,
    events: disclosure.events,
    visibleEvents
  };
}
