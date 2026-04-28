import http from "node:http";
import { resolveRound } from "../engine/roundEngine.js";

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

    return json(res, 404, { error: "NOT_FOUND", message: "Route not found" });
  });
}
