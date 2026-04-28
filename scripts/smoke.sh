#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"

AUTH_HEADER=()
if [[ -n "${ADMIN_API_KEY}" ]]; then
  AUTH_HEADER=(-H "x-admin-key: ${ADMIN_API_KEY}")
fi

echo "[smoke] healthz"
curl -sf "${BASE_URL}/healthz" > /tmp/wildwalk_healthz.json

echo "[smoke] scenarios"
curl -sf "${BASE_URL}/v1/scenarios" > /tmp/wildwalk_scenarios.json

echo "[smoke] create match"
MATCH_ID=$(curl -sf -X POST "${BASE_URL}/v1/matches" \
  -H "Content-Type: application/json" \
  "${AUTH_HEADER[@]}" \
  -d '{"scenarioId":"kyoto-daimonji"}' | node -e 'process.stdin.on("data",d=>{const j=JSON.parse(d);process.stdout.write(j.matchId||"")})')

if [[ -z "${MATCH_ID}" ]]; then
  echo "[smoke] FAIL: matchId empty"
  exit 1
fi

echo "[smoke] join + ready + start"
curl -sf -X POST "${BASE_URL}/v1/matches/${MATCH_ID}/join" -H "Content-Type: application/json" "${AUTH_HEADER[@]}" -d '{"playerId":"P1","nickname":"Alice"}' > /dev/null
curl -sf -X POST "${BASE_URL}/v1/matches/${MATCH_ID}/join" -H "Content-Type: application/json" "${AUTH_HEADER[@]}" -d '{"playerId":"P2","nickname":"Bob"}' > /dev/null
curl -sf -X POST "${BASE_URL}/v1/matches/${MATCH_ID}/ready" -H "Content-Type: application/json" "${AUTH_HEADER[@]}" -d '{"playerId":"P1","ready":true}' > /dev/null
curl -sf -X POST "${BASE_URL}/v1/matches/${MATCH_ID}/ready" -H "Content-Type: application/json" "${AUTH_HEADER[@]}" -d '{"playerId":"P2","ready":true}' > /dev/null
curl -sf -X POST "${BASE_URL}/v1/matches/${MATCH_ID}/start" "${AUTH_HEADER[@]}" > /dev/null

echo "[smoke] resolve turn"
curl -sf -X POST "${BASE_URL}/v1/matches/${MATCH_ID}/resolve-turn" \
  -H "Content-Type: application/json" \
  "${AUTH_HEADER[@]}" \
  -d '{"viewerPlayerId":"P1","playerActions":[{"playerId":"P1","action":"move","state":{"stamina":80,"water":70,"hunger":70,"cold":80,"stress":20}},{"playerId":"P2","action":"camp","state":{"stamina":75,"water":65,"hunger":68,"cold":78,"stress":24}}],"environment":{"weather":"cloudy","slope":"flat"}}' \
  > /tmp/wildwalk_turn.json

echo "[smoke] PASS: core flow is healthy"
