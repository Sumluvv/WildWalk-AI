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
