export function renderDemoPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WildWalk AI 可试玩 Demo</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1115; color: #e8ecf1; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
    .title { margin: 0 0 12px; }
    .desc { color: #aeb8c4; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { background: #171b22; border: 1px solid #262d38; border-radius: 12px; padding: 14px; }
    .card h3 { margin: 0 0 10px; font-size: 16px; }
    label { display: block; color: #aeb8c4; font-size: 13px; margin-bottom: 6px; }
    select, button { width: 100%; padding: 9px 10px; border-radius: 8px; border: 1px solid #374151; background: #111827; color: #e5e7eb; }
    button { cursor: pointer; background: #1f2937; }
    button:hover { background: #273449; }
    button.primary { background: #2563eb; border-color: #2563eb; }
    button.primary:hover { background: #1d4ed8; }
    .row { margin-bottom: 10px; }
    .status { padding: 10px; border-radius: 8px; background: #111827; border: 1px solid #374151; font-size: 13px; color: #9fb1c6; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #1f2937; border: 1px solid #334155; font-size: 12px; margin-right: 6px; margin-bottom: 6px; }
    .stats { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 6px; margin-top: 8px; }
    .stat { background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 7px; text-align: center; font-size: 12px; }
    .narr { white-space: pre-wrap; line-height: 1.6; background: #0b1220; border: 1px solid #23314d; border-radius: 8px; padding: 10px; min-height: 90px; }
    .log { max-height: 260px; overflow: auto; font-size: 12px; color: #9fb1c6; background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 8px; }
    .full { grid-column: 1 / -1; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1 class="title">WildWalk AI 可试玩 Demo</h1>
    <div class="desc">这是试玩样式页面：选路线 -> 创建房间 -> 开局 -> 每回合行动 -> 结束并看总结。</div>

    <div class="grid">
      <section class="card">
        <h3>1) 选择路线与开房</h3>
        <div class="row">
          <label>路线</label>
          <select id="scenarioId"></select>
        </div>
        <div class="row">
          <button class="primary" id="createBtn">创建房间</button>
        </div>
        <div id="matchStatus" class="status">未创建房间</div>
      </section>

      <section class="card">
        <h3>2) 房间流程</h3>
        <div class="row"><button id="joinBtn">两名玩家加入</button></div>
        <div class="row"><button id="readyBtn">全员准备</button></div>
        <div class="row"><button class="primary" id="startBtn">开始对局</button></div>
        <div id="lobbyStatus" class="status">等待操作...</div>
      </section>

      <section class="card">
        <h3>3) 每回合操作</h3>
        <div class="row">
          <label>P1 行动</label>
          <select id="actionP1">
            <option value="move">前进</option><option value="camp">扎营</option><option value="hydrate">补水</option><option value="check">检查装备</option>
          </select>
        </div>
        <div class="row">
          <label>P2 行动</label>
          <select id="actionP2">
            <option value="camp">扎营</option><option value="move">前进</option><option value="hydrate">补水</option><option value="check">检查装备</option>
          </select>
        </div>
        <div class="row"><button class="primary" id="resolveBtn">结算 1 回合</button></div>
        <div id="turnStatus" class="status">尚未开局</div>
      </section>

      <section class="card">
        <h3>4) 结束与总结</h3>
        <div class="row">
          <label>结束原因</label>
          <select id="finishReason">
            <option value="summit_success">登顶成功</option>
            <option value="all_dead">全军覆没</option>
            <option value="rescue_abort">救援中止</option>
          </select>
        </div>
        <div class="row"><button class="primary" id="finishBtn">结束对局并查看总结</button></div>
        <div id="summaryStatus" class="status">未结束</div>
      </section>

      <section class="card full">
        <h3>回合旁白</h3>
        <div id="narration" class="narr">等待回合结算...</div>
      </section>

      <section class="card full">
        <h3>玩家状态</h3>
        <div id="playersView"></div>
      </section>

      <section class="card full">
        <h3>事件与关系变化</h3>
        <div id="metaView"></div>
      </section>

      <section class="card full">
        <h3>调试日志</h3>
        <div id="debugLog" class="log">页面已加载。</div>
      </section>
    </div>
  </div>

  <script>
    const els = {
      scenarioId: document.getElementById("scenarioId"),
      createBtn: document.getElementById("createBtn"),
      joinBtn: document.getElementById("joinBtn"),
      readyBtn: document.getElementById("readyBtn"),
      startBtn: document.getElementById("startBtn"),
      resolveBtn: document.getElementById("resolveBtn"),
      finishBtn: document.getElementById("finishBtn"),
      actionP1: document.getElementById("actionP1"),
      actionP2: document.getElementById("actionP2"),
      finishReason: document.getElementById("finishReason"),
      matchStatus: document.getElementById("matchStatus"),
      lobbyStatus: document.getElementById("lobbyStatus"),
      turnStatus: document.getElementById("turnStatus"),
      summaryStatus: document.getElementById("summaryStatus"),
      narration: document.getElementById("narration"),
      playersView: document.getElementById("playersView"),
      metaView: document.getElementById("metaView"),
      debugLog: document.getElementById("debugLog")
    };

    const state = {
      matchId: null,
      round: 1,
      players: [
        { id: "P1", nickname: "Alice", stats: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20 } },
        { id: "P2", nickname: "Bob", stats: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24 } }
      ]
    };

    function log(msg) {
      els.debugLog.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg + "\\n" + els.debugLog.textContent;
    }

    function renderPlayers() {
      els.playersView.innerHTML = state.players.map((p) => {
        const s = p.stats;
        return '<div style="margin-bottom:10px;"><b>' + p.nickname + '</b>' +
          '<div class="stats">' +
          '<div class="stat">体力<br>' + Math.round(s.stamina) + '</div>' +
          '<div class="stat">水分<br>' + Math.round(s.water) + '</div>' +
          '<div class="stat">饥饿<br>' + Math.round(s.hunger) + '</div>' +
          '<div class="stat">保温<br>' + Math.round(s.cold) + '</div>' +
          '<div class="stat">压力<br>' + Math.round(s.stress) + '</div>' +
          '</div></div>';
      }).join("");
    }

    function renderMeta(roundResult) {
      const pills = [];
      (roundResult.events || []).forEach(e => pills.push('<span class="pill">事件: ' + e.title + '</span>'));
      (roundResult.teamIntel || []).forEach(i => pills.push('<span class="pill">情报: ' + i.title + '</span>'));
      (roundResult.trustChanges || []).forEach(t => pills.push('<span class="pill">信任变化 ' + t.delta + '</span>'));
      els.metaView.innerHTML = pills.length ? pills.join("") : '<span class="pill">本回合无显著事件</span>';
    }

    async function api(path, method = "GET", body) {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      return res.json();
    }

    async function loadScenarios() {
      const data = await api("/v1/scenarios");
      els.scenarioId.innerHTML = (data.scenarios || []).map(s =>
        '<option value="' + s.id + '">' + s.name + "（" + s.difficulty + "）</option>"
      ).join("");
    }

    els.createBtn.addEventListener("click", async () => {
      const data = await api("/v1/matches", "POST", { scenarioId: els.scenarioId.value });
      state.matchId = data.matchId;
      state.round = data.round || 1;
      els.matchStatus.textContent = "房间已创建: " + data.matchId + " | 路线: " + data.scenario.name;
      log("创建房间成功 " + data.matchId);
    });

    els.joinBtn.addEventListener("click", async () => {
      if (!state.matchId) return;
      await api("/v1/matches/" + state.matchId + "/join", "POST", { playerId: "P1", nickname: "Alice" });
      await api("/v1/matches/" + state.matchId + "/join", "POST", { playerId: "P2", nickname: "Bob" });
      els.lobbyStatus.textContent = "两名玩家已加入。";
      log("玩家加入完成");
    });

    els.readyBtn.addEventListener("click", async () => {
      if (!state.matchId) return;
      await api("/v1/matches/" + state.matchId + "/ready", "POST", { playerId: "P1", ready: true });
      await api("/v1/matches/" + state.matchId + "/ready", "POST", { playerId: "P2", ready: true });
      els.lobbyStatus.textContent = "全员 ready。";
      log("全员准备完成");
    });

    els.startBtn.addEventListener("click", async () => {
      if (!state.matchId) return;
      const data = await api("/v1/matches/" + state.matchId + "/start", "POST");
      els.turnStatus.textContent = "对局开始，当前回合: " + data.round;
      log("对局开始");
    });

    els.resolveBtn.addEventListener("click", async () => {
      if (!state.matchId) return;
      const payload = {
        viewerPlayerId: "P1",
        playerActions: [
          { playerId: "P1", action: els.actionP1.value, state: state.players[0].stats },
          { playerId: "P2", action: els.actionP2.value, state: state.players[1].stats }
        ],
        environment: { weather: "cloudy", slope: "flat" }
      };
      const data = await api("/v1/matches/" + state.matchId + "/resolve-turn", "POST", payload);
      if (data.perPlayerResults) {
        data.perPlayerResults.forEach(pr => {
          const p = state.players.find(x => x.id === pr.playerId);
          if (p) p.stats = pr.nextState;
        });
      }
      state.round = data.match.round;
      els.turnStatus.textContent = "回合结算完成，下一回合: " + state.round;
      els.narration.textContent = data.narration || "无旁白";
      renderPlayers();
      renderMeta(data);
      log("完成第 " + (state.round - 1) + " 回合结算");
    });

    els.finishBtn.addEventListener("click", async () => {
      if (!state.matchId) return;
      const finish = await api("/v1/matches/" + state.matchId + "/finish", "POST", { reason: els.finishReason.value });
      const summary = await api("/v1/match/" + state.matchId + "/summary");
      els.summaryStatus.textContent = "对局已结束: " + finish.finishReason + " | 勋章: " + summary.badge.title + " (" + summary.badge.level + ")";
      log("对局结束并拉取总结");
    });

    loadScenarios();
    renderPlayers();
  </script>
</body>
</html>`;
}
