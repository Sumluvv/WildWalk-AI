import { createAppServer } from "./app.js";
import { WebSocketServer, WebSocket } from "ws";
import { subscribeRealtime } from "./realtimeBus.js";

const port = Number(process.env.PORT || 3000);
const server = createAppServer();
const wss = new WebSocketServer({ server });

function canReceiveEvent(client, event) {
  const audience = event?.audience;
  if (!audience) return true;
  if (audience.matchId && client.matchId !== audience.matchId) return false;
  if (Array.isArray(audience.playerIds) && audience.playerIds.length > 0) {
    return audience.playerIds.includes(client.playerId);
  }
  return true;
}

wss.on("connection", (socket, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname !== "/ws") {
    socket.close(1008, "Invalid websocket path");
    return;
  }
  const matchId = url.searchParams.get("matchId");
  const playerId = url.searchParams.get("playerId");
  socket.isAlive = true;
  socket.matchId = matchId || null;
  socket.playerId = playerId || null;
  socket.on("pong", () => {
    socket.isAlive = true;
  });
  socket.send(
    JSON.stringify({
      type: "system.connected",
      matchId: matchId || null,
      playerId: playerId || null,
      message: "realtime connected"
    })
  );
});

subscribeRealtime((event) => {
  const body = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (!canReceiveEvent(client, event)) return;
    client.send(body);
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.isAlive === false) {
      client.terminate();
      return;
    }
    client.isAlive = false;
    client.ping();
  });
}, 15000);

server.on("close", () => clearInterval(heartbeat));

process.on("uncaughtException", (error) => {
  console.error("[fatal] uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[fatal] unhandledRejection", reason);
});

server.listen(port, () => {
  // Keep log concise for local dev.
  console.log(`[wildwalk-ai] server listening on :${port}`);
});
