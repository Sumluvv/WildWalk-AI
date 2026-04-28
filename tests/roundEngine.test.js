import test from "node:test";
import assert from "node:assert/strict";
import { resolveRound } from "../src/engine/roundEngine.js";

test("all stats are clamped in [0, 100]", () => {
  const { nextState } = resolveRound({
    state: { stamina: 1, water: 1, hunger: 1, cold: 1, stress: 99 },
    environment: { weather: "harsh", slope: "steep" }
  });

  for (const value of Object.values(nextState)) {
    assert.ok(value >= 0);
    assert.ok(value <= 100);
  }
});

test("harsh + steep drains more stamina than clear + flat", () => {
  const baseState = { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 };
  const easy = resolveRound({
    state: baseState,
    environment: { weather: "clear", slope: "flat" }
  });
  const hard = resolveRound({
    state: baseState,
    environment: { weather: "harsh", slope: "steep" }
  });

  assert.ok(Math.abs(hard.numericDelta.stamina) > Math.abs(easy.numericDelta.stamina));
});

test("low water (<30) adds at least 0.5 extra stamina loss", () => {
  const highWater = resolveRound({
    state: { stamina: 80, water: 50, hunger: 70, cold: 85, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  });
  const lowWater = resolveRound({
    state: { stamina: 80, water: 20, hunger: 70, cold: 85, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  });

  const highWaterLoss = Math.abs(highWater.numericDelta.stamina);
  const lowWaterLoss = Math.abs(lowWater.numericDelta.stamina);
  assert.ok(lowWaterLoss - highWaterLoss >= 0.5);
});

test("low cold (<30) adds at least 0.7 extra stress gain", () => {
  const normalCold = resolveRound({
    state: { stamina: 80, water: 75, hunger: 70, cold: 50, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  });
  const lowCold = resolveRound({
    state: { stamina: 80, water: 75, hunger: 70, cold: 20, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  });

  assert.ok(lowCold.numericDelta.stress - normalCold.numericDelta.stress >= 0.7);
});

test("same seed and round produce deterministic events", () => {
  const input = {
    seed: 12345,
    round: 7,
    players: [{ id: "A" }, { id: "B" }],
    state: { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  };
  const first = resolveRound(input);
  const second = resolveRound(input);
  assert.deepEqual(first.events, second.events);
});

test("private events target a valid player", () => {
  const result = resolveRound({
    seed: 42,
    round: 3,
    players: [{ id: "P1" }, { id: "P2" }],
    state: { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  });
  const privateEvents = result.events.filter((e) => e.visibility === "private");
  for (const e of privateEvents) {
    assert.ok(["P1", "P2"].includes(e.targetPlayerId));
  }
});

test("visibleEvents only includes public or viewer private events", () => {
  const result = resolveRound({
    seed: 73,
    round: 9,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    state: { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  });

  for (const event of result.visibleEvents) {
    if (event.visibility === "private") {
      assert.equal(event.targetPlayerId, "P1");
    }
  }
});

test("camp action reduces stamina and cold loss compared to move", () => {
  const baseInput = {
    seed: 15,
    round: 1,
    players: [{ id: "P1" }, { id: "P2" }],
    state: { stamina: 80, water: 75, hunger: 70, cold: 60, stress: 20 },
    environment: { weather: "cloudy", slope: "rolling" }
  };

  const moveResult = resolveRound({ ...baseInput, action: "move" });
  const campResult = resolveRound({ ...baseInput, action: "camp" });

  const moveStaminaLoss = Math.abs(moveResult.numericDelta.stamina);
  const campStaminaLoss = Math.abs(campResult.numericDelta.stamina);
  const moveColdLoss = Math.abs(moveResult.numericDelta.cold);
  const campColdLoss = Math.abs(campResult.numericDelta.cold);

  assert.ok(campStaminaLoss < moveStaminaLoss);
  assert.ok(campColdLoss < moveColdLoss);
});

test("hydrate action improves water result compared to move", () => {
  const baseInput = {
    seed: 21,
    round: 1,
    players: [{ id: "P1" }],
    state: { stamina: 50, water: 40, hunger: 60, cold: 80, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  };

  const moveResult = resolveRound({ ...baseInput, action: "move" });
  const hydrateResult = resolveRound({ ...baseInput, action: "hydrate" });

  assert.ok(hydrateResult.numericDelta.water > moveResult.numericDelta.water);
});
