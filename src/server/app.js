import http from "node:http";
import { resolveRound } from "../engine/roundEngine.js";
import { generateNarration } from "../ai/narrationService.js";
import { renderNarrationPreview } from "../narration/templateNarration.js";
import { buildMatchDiary } from "../narration/diaryBuilder.js";
import { buildMatchBadge } from "../narration/badgeBuilder.js";
import { renderDemoPage } from "./demoPage.js";
import { appendMatchLog, dumpMatchLogs, getMatchLogs, getMatchLogsSince, loadMatchLogs } from "./matchLogStore.js";
import {
  appendPrivateChat,
  appendPublicChat,
  dumpMatchChats,
  getChatContextForRound,
  getVisibleChats,
  getVisibleChatsSince,
  loadMatchChats
} from "./chatStore.js";
import { publishRealtime } from "./realtimeBus.js";
import { loadRuntimeStore, saveRuntimeStore } from "./runtimePersistence.js";
import { checkSqliteHealth } from "./sqliteStore.js";
import {
  createMatch,
  listMatches,
  loadMatches,
  joinMatch,
  markReady,
  startMatch,
  getMatch,
  applyTurnResult,
  finishMatch
} from "./matchStore.js";
import { SCENARIOS, SCENARIO_DETAILS } from "../data/scenarios.js";

const rateLimitStore = new Map();

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key"
  });
  res.end(JSON.stringify(payload));
}

function html(res, statusCode, content) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*"
  });
  res.end(content);
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isWriteRequest(req) {
  return req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
}

function shouldProtectPath(path) {
  return path.startsWith("/v1/");
}

function checkRateLimit(req) {
  const enabled = process.env.RATE_LIMIT_ENABLED !== "false";
  if (!enabled) return { ok: true };
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 240);
  const key = clientIp(req);
  const now = Date.now();
  const bucket = rateLimitStore.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= windowMs) {
    bucket.start = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateLimitStore.set(key, bucket);
  if (bucket.count > maxRequests) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.start + windowMs - now) / 1000))
    };
  }
  return { ok: true };
}

function checkAdminAuth(req, path) {
  const required = process.env.REQUIRE_ADMIN_KEY === "true";
  if (!required) return { ok: true };
  if (!isWriteRequest(req) || !shouldProtectPath(path)) return { ok: true };
  const expected = process.env.ADMIN_API_KEY || "";
  if (!expected) return { ok: false, reason: "ADMIN_KEY_NOT_CONFIGURED" };
  const provided = req.headers["x-admin-key"];
  if (provided !== expected) return { ok: false, reason: "UNAUTHORIZED" };
  return { ok: true };
}

async function readJsonBody(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function getPathFromUrl(url) {
  return new URL(url, "http://localhost").pathname;
}

function getSearchParams(url) {
  return new URL(url, "http://localhost").searchParams;
}

function buildChatContext(matchId, round) {
  return getChatContextForRound(matchId, round, {
    maxMessages: process.env.NARRATION_CHAT_MAX_MESSAGES || 12,
    roundsBack: process.env.NARRATION_CHAT_ROUNDS_BACK || 2
  });
}

function persistRuntimeState() {
  saveRuntimeStore({
    savedAt: new Date().toISOString(),
    matches: listMatches(),
    matchLogs: dumpMatchLogs(),
    matchChats: dumpMatchChats()
  });
}

function bootstrapRuntimeState() {
  const snapshot = loadRuntimeStore();
  if (!snapshot) return;
  loadMatches(Array.isArray(snapshot.matches) ? snapshot.matches : []);
  loadMatchLogs(snapshot.matchLogs || {});
  loadMatchChats(snapshot.matchChats || {});
}

bootstrapRuntimeState();

export function createAppServer() {
  return http.createServer(async (req, res) => {
    const startedAt = Date.now();
    const requestId = `req_${Math.random().toString(36).slice(2, 10)}`;
    res.setHeader("X-Request-Id", requestId);
    res.on("finish", () => {
      const ms = Date.now() - startedAt;
      console.log(`[api] ${requestId} ${req.method} ${req.url} -> ${res.statusCode} (${ms}ms)`);
    });

    const path = getPathFromUrl(req.url || "/");

    const rate = checkRateLimit(req);
    if (!rate.ok) {
      res.setHeader("Retry-After", String(rate.retryAfterSec));
      return json(res, 429, { error: "RATE_LIMITED", message: "Too many requests" });
    }

    const auth = checkAdminAuth(req, path);
    if (!auth.ok) {
      const status = auth.reason === "ADMIN_KEY_NOT_CONFIGURED" ? 500 : 401;
      return json(res, status, { error: auth.reason, message: "Admin authorization failed" });
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-key"
      });
      res.end();
      return;
    }

    if (req.method === "GET" && path === "/healthz") {
      const db = checkSqliteHealth();
      const ok = db.ok;
      return json(res, ok ? 200 : 503, {
        ok,
        service: "wildwalk-ai-backend",
        db
      });
    }

    if (req.method === "GET" && path === "/demo") {
      return html(res, 200, renderDemoPage());
    }

    if (req.method === "GET" && path === "/v1/scenarios") {
      return json(res, 200, {
        total: SCENARIOS.length,
        scenarios: SCENARIOS
      });
    }

    if (req.method === "POST" && path === "/v1/matches") {
      try {
        const body = await readJsonBody(req);
        const scenarioId = body?.scenarioId;
        const scenario = SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) {
          return json(res, 400, { error: "BAD_REQUEST", message: "Invalid scenarioId" });
        }
        const match = createMatch({ scenarioId });
        persistRuntimeState();
        return json(res, 200, {
          ...match,
          scenario
        });
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path === "/v1/demo/run-once") {
      try {
        const body = await readJsonBody(req);
        const scenarioId = body?.scenarioId || "kyoto-daimonji";
        const scenario = SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) {
          return json(res, 400, { error: "BAD_REQUEST", message: "Invalid scenarioId" });
        }

        const created = createMatch({ scenarioId });
        const matchId = created.matchId;
        joinMatch(matchId, { playerId: "P1", nickname: "Alice" });
        joinMatch(matchId, { playerId: "P2", nickname: "Bob" });
        markReady(matchId, "P1", true);
        markReady(matchId, "P2", true);
        startMatch(matchId);

        const roundInput = {
          matchId,
          round: created.round,
          viewerPlayerId: "P1",
          players: [{ id: "P1" }, { id: "P2" }],
          playerActions: [
            { playerId: "P1", action: "move", state: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
            { playerId: "P2", action: "camp", state: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
          ],
          environment: { weather: "cloudy", slope: "flat" }
        };
        const roundResult = resolveRound(roundInput);
        const aiResult = await generateNarration(roundResult?.narrativePacket || {});
        const narration = aiResult.narration;
        appendMatchLog(matchId, {
          round: created.round,
          narration,
          narrativePacket: roundResult?.narrativePacket || null,
          keyChanges: {
            trustChanges: roundResult?.trustChanges || [],
            disclosureConsequences: roundResult?.disclosureConsequences || [],
            transferResults: roundResult?.transferResults || [],
            betrayalResults: roundResult?.betrayalResults || []
          }
        });
        applyTurnResult(matchId, { roundResult });
        const finished = finishMatch(matchId, body?.finishReason || "summit_success");
        persistRuntimeState();
        const finalMatch = finished.match;
        const logs = getMatchLogs(matchId);

        return json(res, 200, {
          matchId,
          scenario,
          roundResult,
          narration,
          finalMatch,
          summary: {
            matchId,
            rounds: logs.length,
            badge: buildMatchBadge(matchId, logs),
            diary: buildMatchDiary(matchId, logs),
            logs
          }
        });
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "GET" && path.startsWith("/v1/matches/")) {
      const matchId = path.slice("/v1/matches/".length);
      if (!matchId.includes("/")) {
        const match = getMatch(matchId);
        if (!match) return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        return json(res, 200, match);
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/join")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/join";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const body = await readJsonBody(req);
        const result = joinMatch(matchId, body);
        if (result.error === "NOT_FOUND") {
          return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        }
        if (result.error) {
          return json(res, 400, { error: "BAD_REQUEST", message: result.error });
        }
        persistRuntimeState();
        return json(res, 200, result.match);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/ready")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/ready";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const body = await readJsonBody(req);
        const result = markReady(matchId, body?.playerId, body?.ready);
        if (result.error === "NOT_FOUND") {
          return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        }
        if (result.error) {
          return json(res, 400, { error: "BAD_REQUEST", message: result.error });
        }
        persistRuntimeState();
        return json(res, 200, result.match);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/start")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/start";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const result = startMatch(matchId);
        if (result.error === "NOT_FOUND") {
          return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        }
        if (result.error) {
          return json(res, 400, { error: "BAD_REQUEST", message: result.error });
        }
        persistRuntimeState();
        return json(res, 200, result.match);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/resolve-turn")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/resolve-turn";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const match = getMatch(matchId);
        if (!match) return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        if (match.status !== "in_progress") {
          return json(res, 400, { error: "BAD_REQUEST", message: "MATCH_NOT_IN_PROGRESS" });
        }

        const body = await readJsonBody(req);
        const roundInput = {
          ...body,
          matchId,
          round: match.round,
          players: match.partyState.players.map((p) => ({ id: p.playerId })),
          chatLogs: buildChatContext(matchId, match.round)
        };
        const roundResult = resolveRound(roundInput);
        const aiResult = await generateNarration(roundResult?.narrativePacket || {});
        const narration = aiResult.narration;

        appendMatchLog(matchId, {
          round: match.round,
          narration,
          narrativePacket: roundResult?.narrativePacket || null,
          keyChanges: {
            trustChanges: roundResult?.trustChanges || [],
            disclosureConsequences: roundResult?.disclosureConsequences || [],
            transferResults: roundResult?.transferResults || [],
            betrayalResults: roundResult?.betrayalResults || []
          }
        });

        const applied = applyTurnResult(matchId, { roundResult });
        if (applied.error) {
          return json(res, 400, { error: "BAD_REQUEST", message: applied.error });
        }
        persistRuntimeState();
        publishRealtime({
          type: "turn.resolved",
          matchId,
          audience: { matchId },
          payload: {
            round: match.round,
            nextRound: applied.match.round,
            narration,
            roundResult
          }
        });
        return json(res, 200, {
          match: applied.match,
          ...roundResult,
          narration,
          narrationSource: aiResult.source,
          narrationModel: aiResult.model
        });
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/finish")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/finish";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const body = await readJsonBody(req);
        const result = finishMatch(matchId, body?.reason);
        if (result.error === "NOT_FOUND") {
          return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        }
        if (result.error) {
          return json(res, 400, { error: "BAD_REQUEST", message: result.error });
        }
        persistRuntimeState();
        return json(res, 200, result.match);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "GET" && path.startsWith("/v1/scenarios/")) {
      const scenarioId = path.slice("/v1/scenarios/".length);
      const summary = SCENARIOS.find((s) => s.id === scenarioId);
      if (!summary) {
        return json(res, 404, { error: "NOT_FOUND", message: "Scenario not found" });
      }
      const detail = SCENARIO_DETAILS[scenarioId] || {};
      return json(res, 200, {
        ...summary,
        detail
      });
    }

    if (req.method === "POST" && path === "/v1/round/resolve") {
      try {
        const body = await readJsonBody(req);
        const result = resolveRound(body);
        return json(res, 200, result);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path === "/v1/round/resolve-and-narrate") {
      try {
        const body = await readJsonBody(req);
        const roundResult = resolveRound({
          ...body,
          chatLogs: body?.matchId ? buildChatContext(body.matchId, body?.round || 1) : body?.chatLogs
        });
        const aiResult = await generateNarration(roundResult?.narrativePacket || {});
        const narration = aiResult.narration;
        const matchId = body?.matchId;
        if (matchId) {
          appendMatchLog(matchId, {
            round: body?.round ?? roundResult?.narrativePacket?.round ?? null,
            narration,
            narrativePacket: roundResult?.narrativePacket || null,
            keyChanges: {
              trustChanges: roundResult?.trustChanges || [],
              disclosureConsequences: roundResult?.disclosureConsequences || [],
              transferResults: roundResult?.transferResults || [],
              betrayalResults: roundResult?.betrayalResults || []
            }
          });
          persistRuntimeState();
        }
        return json(res, 200, {
          ...roundResult,
          narration,
          narrationSource: aiResult.source,
          narrationModel: aiResult.model
        });
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "GET" && path.startsWith("/v1/match/") && path.endsWith("/logs")) {
      const prefix = "/v1/match/";
      const suffix = "/logs";
      const matchId = path.slice(prefix.length, path.length - suffix.length);
      if (!matchId) {
        return json(res, 400, { error: "BAD_REQUEST", message: "matchId is required" });
      }
      return json(res, 200, {
        matchId,
        logs: getMatchLogs(matchId)
      });
    }

    if (req.method === "GET" && path.startsWith("/v1/match/") && path.endsWith("/diary")) {
      const prefix = "/v1/match/";
      const suffix = "/diary";
      const matchId = path.slice(prefix.length, path.length - suffix.length);
      if (!matchId) {
        return json(res, 400, { error: "BAD_REQUEST", message: "matchId is required" });
      }
      const logs = getMatchLogs(matchId);
      return json(res, 200, {
        matchId,
        diary: buildMatchDiary(matchId, logs),
        rounds: logs.length
      });
    }

    if (req.method === "GET" && path.startsWith("/v1/match/") && path.endsWith("/badge")) {
      const prefix = "/v1/match/";
      const suffix = "/badge";
      const matchId = path.slice(prefix.length, path.length - suffix.length);
      if (!matchId) {
        return json(res, 400, { error: "BAD_REQUEST", message: "matchId is required" });
      }
      const logs = getMatchLogs(matchId);
      return json(res, 200, buildMatchBadge(matchId, logs));
    }

    if (req.method === "GET" && path.startsWith("/v1/match/") && path.endsWith("/summary")) {
      const prefix = "/v1/match/";
      const suffix = "/summary";
      const matchId = path.slice(prefix.length, path.length - suffix.length);
      if (!matchId) {
        return json(res, 400, { error: "BAD_REQUEST", message: "matchId is required" });
      }
      const logs = getMatchLogs(matchId);
      return json(res, 200, {
        matchId,
        rounds: logs.length,
        badge: buildMatchBadge(matchId, logs),
        diary: buildMatchDiary(matchId, logs),
        logs
      });
    }

    if (req.method === "POST" && path === "/v1/narration/preview") {
      try {
        const body = await readJsonBody(req);
        const narration = renderNarrationPreview(body?.narrativePacket || {});
        return json(res, 200, {
          narration,
          source: "template-preview"
        });
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path === "/v1/ai/narrate") {
      try {
        const body = await readJsonBody(req);
        const aiResult = await generateNarration(body?.narrativePacket || {});
        return json(res, 200, aiResult);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/chat/public")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/chat/public";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const body = await readJsonBody(req);
        if (!body?.playerId || !body?.message) {
          return json(res, 400, { error: "BAD_REQUEST", message: "playerId and message required" });
        }
        const match = getMatch(matchId);
        if (!match) return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        const item = appendPublicChat(matchId, {
          playerId: body.playerId,
          message: String(body.message).slice(0, 500),
          round: match.round
        });
        persistRuntimeState();
        publishRealtime({
          type: "chat.public",
          matchId,
          audience: { matchId },
          payload: item
        });
        return json(res, 200, item);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "POST" && path.startsWith("/v1/matches/") && path.endsWith("/chat/private")) {
      try {
        const prefix = "/v1/matches/";
        const suffix = "/chat/private";
        const matchId = path.slice(prefix.length, path.length - suffix.length);
        const body = await readJsonBody(req);
        if (!body?.fromPlayerId || !body?.toPlayerId || !body?.message) {
          return json(res, 400, { error: "BAD_REQUEST", message: "from/to/message required" });
        }
        const match = getMatch(matchId);
        if (!match) return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
        const item = appendPrivateChat(matchId, {
          fromPlayerId: body.fromPlayerId,
          toPlayerId: body.toPlayerId,
          message: String(body.message).slice(0, 500),
          round: match.round
        });
        persistRuntimeState();
        publishRealtime({
          type: "chat.private",
          matchId,
          audience: {
            matchId,
            playerIds: [body.fromPlayerId, body.toPlayerId]
          },
          payload: item
        });
        return json(res, 200, item);
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "GET" && path.startsWith("/v1/matches/") && path.endsWith("/chat")) {
      const prefix = "/v1/matches/";
      const suffix = "/chat";
      const matchId = path.slice(prefix.length, path.length - suffix.length);
      const viewer = getSearchParams(req.url || "").get("viewerPlayerId");
      const match = getMatch(matchId);
      if (!match) return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
      return json(res, 200, {
        matchId,
        viewerPlayerId: viewer || null,
        chats: getVisibleChats(matchId, viewer || undefined)
      });
    }

    if (req.method === "GET" && path.startsWith("/v1/matches/") && path.endsWith("/sync")) {
      const prefix = "/v1/matches/";
      const suffix = "/sync";
      const matchId = path.slice(prefix.length, path.length - suffix.length);
      const query = getSearchParams(req.url || "");
      const viewer = query.get("viewerPlayerId") || undefined;
      const since = query.get("since") || "";
      const match = getMatch(matchId);
      if (!match) return json(res, 404, { error: "NOT_FOUND", message: "Match not found" });
      return json(res, 200, {
        matchId,
        since: since || null,
        serverTime: new Date().toISOString(),
        match,
        chats: getVisibleChatsSince(matchId, viewer, since),
        logs: getMatchLogsSince(matchId, since)
      });
    }

    return json(res, 404, { error: "NOT_FOUND", message: "Route not found" });
  });
}
