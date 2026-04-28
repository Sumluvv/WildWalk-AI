import http from "node:http";
import { resolveRound } from "../engine/roundEngine.js";
import { renderNarrationPreview } from "../narration/templateNarration.js";
import { buildMatchDiary } from "../narration/diaryBuilder.js";
import { buildMatchBadge } from "../narration/badgeBuilder.js";
import { appendMatchLog, getMatchLogs } from "./matchLogStore.js";
import { createMatch } from "./matchStore.js";
import { SCENARIOS, SCENARIO_DETAILS } from "../data/scenarios.js";

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
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

export function createAppServer() {
  return http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/healthz") {
      return json(res, 200, { ok: true, service: "wildwalk-ai-backend" });
    }

    if (req.method === "GET" && req.url === "/v1/scenarios") {
      return json(res, 200, {
        total: SCENARIOS.length,
        scenarios: SCENARIOS
      });
    }

    if (req.method === "POST" && req.url === "/v1/matches") {
      try {
        const body = await readJsonBody(req);
        const scenarioId = body?.scenarioId;
        const scenario = SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) {
          return json(res, 400, { error: "BAD_REQUEST", message: "Invalid scenarioId" });
        }
        const match = createMatch({ scenarioId });
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

    if (req.method === "GET" && req.url.startsWith("/v1/scenarios/")) {
      const scenarioId = req.url.slice("/v1/scenarios/".length);
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

    if (req.method === "POST" && req.url === "/v1/round/resolve") {
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

    if (req.method === "POST" && req.url === "/v1/round/resolve-and-narrate") {
      try {
        const body = await readJsonBody(req);
        const roundResult = resolveRound(body);
        const narration = renderNarrationPreview(roundResult?.narrativePacket || {});
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
        }
        return json(res, 200, {
          ...roundResult,
          narration,
          narrationSource: "template-preview"
        });
      } catch (error) {
        return json(res, 400, {
          error: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unknown request error"
        });
      }
    }

    if (req.method === "GET" && req.url.startsWith("/v1/match/") && req.url.endsWith("/logs")) {
      const prefix = "/v1/match/";
      const suffix = "/logs";
      const matchId = req.url.slice(prefix.length, req.url.length - suffix.length);
      if (!matchId) {
        return json(res, 400, { error: "BAD_REQUEST", message: "matchId is required" });
      }
      return json(res, 200, {
        matchId,
        logs: getMatchLogs(matchId)
      });
    }

    if (req.method === "GET" && req.url.startsWith("/v1/match/") && req.url.endsWith("/diary")) {
      const prefix = "/v1/match/";
      const suffix = "/diary";
      const matchId = req.url.slice(prefix.length, req.url.length - suffix.length);
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

    if (req.method === "GET" && req.url.startsWith("/v1/match/") && req.url.endsWith("/badge")) {
      const prefix = "/v1/match/";
      const suffix = "/badge";
      const matchId = req.url.slice(prefix.length, req.url.length - suffix.length);
      if (!matchId) {
        return json(res, 400, { error: "BAD_REQUEST", message: "matchId is required" });
      }
      const logs = getMatchLogs(matchId);
      return json(res, 200, buildMatchBadge(matchId, logs));
    }

    if (req.method === "GET" && req.url.startsWith("/v1/match/") && req.url.endsWith("/summary")) {
      const prefix = "/v1/match/";
      const suffix = "/summary";
      const matchId = req.url.slice(prefix.length, req.url.length - suffix.length);
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

    if (req.method === "POST" && req.url === "/v1/narration/preview") {
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

    return json(res, 404, { error: "NOT_FOUND", message: "Route not found" });
  });
}
