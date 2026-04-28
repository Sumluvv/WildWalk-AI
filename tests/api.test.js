import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server/app.js";

async function startTestServer() {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test("GET /healthz returns ok", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/healthz`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.ok, true);
});

test("POST /v1/round/resolve returns numericDelta and player-visible events", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    seed: 11,
    round: 1,
    viewerPlayerId: "A",
    action: "camp",
    players: [{ id: "A" }, { id: "B" }],
    state: { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 },
    environment: { weather: "cloudy", slope: "flat" }
  };

  const res = await fetch(`${baseUrl}/v1/round/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(data.numericDelta);
  assert.ok(data.nextState);
  assert.ok(Array.isArray(data.events));
  assert.ok(Array.isArray(data.visibleEvents));
  assert.equal(data.action, "camp");
  assert.equal(typeof data.nextState.stamina, "number");

  for (const event of data.visibleEvents) {
    if (event.visibility === "private") {
      assert.equal(event.targetPlayerId, "A");
    }
  }
});

test("POST /v1/round/resolve returns 400 for invalid JSON", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/round/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid"
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.error, "BAD_REQUEST");
});

test("POST /v1/round/resolve supports multiplayer playerActions", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    seed: 22,
    round: 2,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      {
        playerId: "P1",
        action: "move",
        state: { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 }
      },
      {
        playerId: "P2",
        action: "camp",
        state: { stamina: 50, water: 60, hunger: 60, cold: 65, stress: 30 }
      }
    ],
    transfers: [{ fromPlayerId: "P1", toPlayerId: "P2", resource: "water", amount: 8 }],
    environment: { weather: "cloudy", slope: "rolling" }
  };

  const res = await fetch(`${baseUrl}/v1/round/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data.perPlayerResults));
  assert.equal(data.perPlayerResults.length, 2);
  assert.equal(data.perPlayerResults[0].playerId, "P1");
  assert.equal(data.perPlayerResults[1].playerId, "P2");

  const p1 = data.perPlayerResults.find((p) => p.playerId === "P1");
  const p2 = data.perPlayerResults.find((p) => p.playerId === "P2");
  assert.ok(p1.nextState.water < 75);
  assert.ok(p2.nextState.water > 60);
});

test("hidden transfer is not visible to unrelated viewer", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    seed: 23,
    round: 2,
    viewerPlayerId: "P3",
    players: [{ id: "P1" }, { id: "P2" }, { id: "P3" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 75, hunger: 70, cold: 85, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 50, water: 60, hunger: 60, cold: 65, stress: 30 } },
      { playerId: "P3", action: "check", state: { stamina: 70, water: 65, hunger: 60, cold: 70, stress: 25 } }
    ],
    transfers: [
      { fromPlayerId: "P1", toPlayerId: "P2", resource: "water", amount: 8, isHidden: true, requiresTrust: 20 }
    ],
    trustMatrix: [{ fromPlayerId: "P1", toPlayerId: "P2", value: 50 }],
    environment: { weather: "cloudy", slope: "rolling" }
  };

  const res = await fetch(`${baseUrl}/v1/round/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  const p3 = data.perPlayerResults.find((p) => p.playerId === "P3");
  assert.ok(Array.isArray(p3.visibleTransfers));
  assert.equal(p3.visibleTransfers.length, 0);
});

test("betrayalActions are returned with trust matrix updates", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    seed: 41,
    round: 4,
    viewerPlayerId: "A",
    players: [{ id: "A" }, { id: "B" }],
    playerActions: [
      { playerId: "A", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "B", action: "camp", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } }
    ],
    betrayalActions: [{ actorPlayerId: "A", targetPlayerId: "B", type: "hide_supply" }],
    trustMatrix: [{ fromPlayerId: "A", toPlayerId: "B", value: 65 }],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const res = await fetch(`${baseUrl}/v1/round/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data.betrayalResults));
  assert.equal(data.betrayalResults[0].status, "applied");
  const trust = data.trustMatrix.find((x) => x.fromPlayerId === "A" && x.toPlayerId === "B");
  assert.ok(trust.value < 65);
  assert.ok(Array.isArray(data.trustChanges));
  assert.ok(data.trustChanges.length >= 1);
});

test("eventDisclosures returns disclosure results and team intel", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    seed: 77,
    round: 3,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } }
    ],
    eventDisclosures: [{ playerId: "P1", disclose: true }],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const res = await fetch(`${baseUrl}/v1/round/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data.disclosureResults));
  assert.ok(Array.isArray(data.teamIntel));
  assert.ok(Array.isArray(data.disclosureConsequences));
  assert.ok(data.narrativePacket);
  assert.equal(typeof data.narrativePacket.summary.publicEventCount, "number");
});

test("POST /v1/narration/preview returns Chinese narration text", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    narrativePacket: {
      round: 3,
      environment: { weather: "cloudy", slope: "flat" },
      summary: {
        publicEventCount: 1,
        privateEventCount: 2,
        sharedIntelCount: 1,
        appliedTransfers: 1,
        appliedBetrayals: 0,
        trustChangeCount: 2
      }
    }
  };

  const res = await fetch(`${baseUrl}/v1/narration/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(typeof data.narration, "string");
  assert.ok(data.narration.includes("第 3 回合"));
});
