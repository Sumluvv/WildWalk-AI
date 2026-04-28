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

test("GET /demo returns html page", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/demo`);
  const text = await res.text();

  assert.equal(res.status, 200);
  assert.ok(text.includes("WildWalk AI 可试玩 Demo"));
});

test("GET /v1/scenarios returns built-in scenario list", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/scenarios`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(data.scenarios));
  assert.ok(data.total >= 3);
  assert.ok(data.scenarios.some((s) => s.id === "kyoto-daimonji"));
});

test("GET /v1/scenarios/:id returns scenario detail", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/scenarios/kyoto-daimonji`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.id, "kyoto-daimonji");
  assert.ok(data.detail);
  assert.ok(Array.isArray(data.detail.strategyTips));
  assert.ok(Array.isArray(data.detail.sampleWaypoints));
});

test("POST /v1/matches creates match from scenarioId", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.scenarioId, "kyoto-daimonji");
  assert.equal(data.round, 1);
  assert.equal(data.status, "waiting");
  assert.ok(typeof data.matchId === "string");
});

test("POST /v1/matches rejects invalid scenarioId", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "invalid-scenario" })
  });
  const data = await res.json();

  assert.equal(res.status, 400);
  assert.equal(data.error, "BAD_REQUEST");
});

test("POST /v1/demo/run-once returns end-to-end playable summary", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/demo/run-once`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji", finishReason: "summit_success" })
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(typeof data.matchId, "string");
  assert.equal(data.finalMatch.status, "finished");
  assert.equal(typeof data.narration, "string");
  assert.ok(data.summary);
  assert.ok(Array.isArray(data.summary.logs));
});

test("match join and start flow works", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;
  assert.equal(createRes.status, 200);

  const joinARes = await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", nickname: "Alice" })
  });
  assert.equal(joinARes.status, 200);

  const joinBRes = await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", nickname: "Bob" })
  });
  assert.equal(joinBRes.status, 200);

  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", ready: true })
  });

  const startRes = await fetch(`${baseUrl}/v1/matches/${matchId}/start`, {
    method: "POST"
  });
  const started = await startRes.json();

  assert.equal(startRes.status, 200);
  assert.equal(started.status, "in_progress");
});

test("POST /v1/matches/:id/resolve-turn resolves and advances round", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;
  assert.equal(createRes.status, 200);

  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", nickname: "Alice" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", nickname: "Bob" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/start`, { method: "POST" });

  const resolveRes = await fetch(`${baseUrl}/v1/matches/${matchId}/resolve-turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      viewerPlayerId: "P1",
      playerActions: [
        { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
        { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
      ],
      environment: { weather: "cloudy", slope: "flat" }
    })
  });
  const resolved = await resolveRes.json();

  assert.equal(resolveRes.status, 200);
  assert.ok(resolved.match);
  assert.equal(typeof resolved.narration, "string");
  assert.equal(resolved.match.round, 2);
});

test("POST /v1/matches/:id/finish marks match finished", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;
  assert.equal(createRes.status, 200);

  const finishRes = await fetch(`${baseUrl}/v1/matches/${matchId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "summit_success" })
  });
  const finished = await finishRes.json();

  assert.equal(finishRes.status, 200);
  assert.equal(finished.status, "finished");
  assert.equal(finished.finishReason, "summit_success");
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

test("POST /v1/round/resolve-and-narrate returns round result and narration", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const payload = {
    seed: 99,
    round: 4,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
    ],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const res = await fetch(`${baseUrl}/v1/round/resolve-and-narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.ok(data.narrativePacket);
  assert.equal(typeof data.narration, "string");
  assert.ok(["template-fallback", "real-ai"].includes(data.narrationSource));
});

test("POST /v1/ai/narrate returns narration with fallback", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${baseUrl}/v1/ai/narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      narrativePacket: {
        round: 2,
        environment: { weather: "cloudy", slope: "flat" },
        summary: { publicEventCount: 1, privateEventCount: 0, sharedIntelCount: 0, appliedTransfers: 0, appliedBetrayals: 0, trustChangeCount: 0 }
      }
    })
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(typeof data.narration, "string");
  assert.ok(["template-fallback", "real-ai"].includes(data.source));
});

test("chat public/private endpoints support visibility filtering", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;
  assert.equal(createRes.status, 200);

  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", nickname: "Alice" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", nickname: "Bob" })
  });

  const publicRes = await fetch(`${baseUrl}/v1/matches/${matchId}/chat/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", message: "我体力快见底了" })
  });
  assert.equal(publicRes.status, 200);

  const privateRes = await fetch(`${baseUrl}/v1/matches/${matchId}/chat/private`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromPlayerId: "P1", toPlayerId: "P2", message: "先别公开补给位置" })
  });
  assert.equal(privateRes.status, 200);

  const p2Res = await fetch(`${baseUrl}/v1/matches/${matchId}/chat?viewerPlayerId=P2`);
  const p2Data = await p2Res.json();
  assert.equal(p2Res.status, 200);
  assert.equal(p2Data.chats.length, 2);

  const p3Res = await fetch(`${baseUrl}/v1/matches/${matchId}/chat?viewerPlayerId=P3`);
  const p3Data = await p3Res.json();
  assert.equal(p3Res.status, 200);
  assert.equal(p3Data.chats.length, 1);
  assert.equal(p3Data.chats[0].scope, "public");
});

test("resolve-turn injects chat logs into narrative packet", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;
  assert.equal(createRes.status, 200);

  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", nickname: "Alice" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", nickname: "Bob" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/start`, { method: "POST" });

  await fetch(`${baseUrl}/v1/matches/${matchId}/chat/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", message: "跟紧我，不要掉队" })
  });

  const resolveRes = await fetch(`${baseUrl}/v1/matches/${matchId}/resolve-turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      viewerPlayerId: "P1",
      playerActions: [
        { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
        { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
      ],
      environment: { weather: "cloudy", slope: "flat" }
    })
  });
  const resolved = await resolveRes.json();

  assert.equal(resolveRes.status, 200);
  assert.ok(resolved.narrativePacket);
  assert.ok(Array.isArray(resolved.narrativePacket.highlights.chatLogs));
  assert.ok(resolved.narrativePacket.highlights.chatLogs.length >= 1);
});

test("resolve-turn injects bounded recent chat context", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;

  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", nickname: "Alice" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", nickname: "Bob" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/start`, { method: "POST" });

  for (let i = 0; i < 20; i += 1) {
    await fetch(`${baseUrl}/v1/matches/${matchId}/chat/public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: "P1", message: `msg-${i}` })
    });
  }

  const resolveRes = await fetch(`${baseUrl}/v1/matches/${matchId}/resolve-turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      viewerPlayerId: "P1",
      playerActions: [
        { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
        { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
      ],
      environment: { weather: "cloudy", slope: "flat" }
    })
  });
  const resolved = await resolveRes.json();
  const injected = resolved?.narrativePacket?.highlights?.chatLogs || [];

  assert.equal(resolveRes.status, 200);
  assert.ok(injected.length <= 12);
  assert.equal(injected[injected.length - 1]?.message, "msg-19");
});

test("GET /v1/matches/:id/sync returns incremental chats and logs", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const createRes = await fetch(`${baseUrl}/v1/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId: "kyoto-daimonji" })
  });
  const created = await createRes.json();
  const matchId = created.matchId;

  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", nickname: "Alice" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", nickname: "Bob" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P2", ready: true })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/start`, { method: "POST" });

  const since = new Date(Date.now() - 1000).toISOString();
  await fetch(`${baseUrl}/v1/matches/${matchId}/chat/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: "P1", message: "sync-msg" })
  });
  await fetch(`${baseUrl}/v1/matches/${matchId}/resolve-turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      viewerPlayerId: "P1",
      playerActions: [
        { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
        { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
      ],
      environment: { weather: "cloudy", slope: "flat" }
    })
  });

  const syncRes = await fetch(
    `${baseUrl}/v1/matches/${matchId}/sync?viewerPlayerId=P1&since=${encodeURIComponent(since)}`
  );
  const syncData = await syncRes.json();

  assert.equal(syncRes.status, 200);
  assert.ok(Array.isArray(syncData.chats));
  assert.ok(Array.isArray(syncData.logs));
  assert.ok(syncData.chats.some((x) => x.message === "sync-msg"));
  assert.ok(syncData.logs.length >= 1);
});

test("GET /v1/match/:id/logs returns logs after resolve-and-narrate", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const matchId = "demo-match-1";
  const payload = {
    matchId,
    seed: 1001,
    round: 1,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
    ],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const resolveRes = await fetch(`${baseUrl}/v1/round/resolve-and-narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(resolveRes.status, 200);

  const logsRes = await fetch(`${baseUrl}/v1/match/${matchId}/logs`);
  const logsData = await logsRes.json();

  assert.equal(logsRes.status, 200);
  assert.equal(logsData.matchId, matchId);
  assert.ok(Array.isArray(logsData.logs));
  assert.ok(logsData.logs.length >= 1);
  assert.equal(typeof logsData.logs[0].narration, "string");
});

test("GET /v1/match/:id/diary returns generated diary text", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const matchId = "demo-match-2";
  const payload = {
    matchId,
    seed: 1002,
    round: 1,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
    ],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const resolveRes = await fetch(`${baseUrl}/v1/round/resolve-and-narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(resolveRes.status, 200);

  const diaryRes = await fetch(`${baseUrl}/v1/match/${matchId}/diary`);
  const diaryData = await diaryRes.json();

  assert.equal(diaryRes.status, 200);
  assert.equal(diaryData.matchId, matchId);
  assert.equal(typeof diaryData.diary, "string");
  assert.ok(diaryData.diary.includes("徒步日记"));
  assert.ok(diaryData.diary.includes("第 1 回合"));
});

test("GET /v1/match/:id/badge returns badge summary", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const matchId = "demo-match-3";
  const payload = {
    matchId,
    seed: 1003,
    round: 1,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
    ],
    transfers: [{ fromPlayerId: "P1", toPlayerId: "P2", resource: "water", amount: 5 }],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const resolveRes = await fetch(`${baseUrl}/v1/round/resolve-and-narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(resolveRes.status, 200);

  const badgeRes = await fetch(`${baseUrl}/v1/match/${matchId}/badge`);
  const badgeData = await badgeRes.json();

  assert.equal(badgeRes.status, 200);
  assert.equal(badgeData.matchId, matchId);
  assert.equal(typeof badgeData.title, "string");
  assert.equal(typeof badgeData.level, "string");
  assert.ok(typeof badgeData.stats.cooperationCount === "number");
});

test("GET /v1/match/:id/summary returns unified post-match payload", async (t) => {
  const { server, baseUrl } = await startTestServer();
  t.after(() => server.close());

  const matchId = "demo-match-4";
  const payload = {
    matchId,
    seed: 1004,
    round: 1,
    viewerPlayerId: "P1",
    players: [{ id: "P1" }, { id: "P2" }],
    playerActions: [
      { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
      { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
    ],
    transfers: [{ fromPlayerId: "P1", toPlayerId: "P2", resource: "water", amount: 5 }],
    environment: { weather: "cloudy", slope: "flat" }
  };

  const resolveRes = await fetch(`${baseUrl}/v1/round/resolve-and-narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  assert.equal(resolveRes.status, 200);

  const summaryRes = await fetch(`${baseUrl}/v1/match/${matchId}/summary`);
  const summaryData = await summaryRes.json();

  assert.equal(summaryRes.status, 200);
  assert.equal(summaryData.matchId, matchId);
  assert.equal(typeof summaryData.diary, "string");
  assert.ok(summaryData.badge);
  assert.ok(Array.isArray(summaryData.logs));
  assert.ok(summaryData.logs.length >= 1);
});
