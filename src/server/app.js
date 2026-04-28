import http from "node:http";
import { resolveRound } from "../engine/roundEngine.js";
import { renderNarrationPreview } from "../narration/templateNarration.js";
import { buildMatchDiary } from "../narration/diaryBuilder.js";
import { appendMatchLog, getMatchLogs } from "./matchLogStore.js";

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
