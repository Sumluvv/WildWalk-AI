export function renderDemoPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WildWalk AI 可试玩 Demo</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top, #1a2233, #0c111a 60%); color: #e8ecf1; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 20px; }
    .title { margin: 0 0 12px; }
    .desc { color: #aeb8c4; margin-bottom: 16px; }
    .hero { background: linear-gradient(135deg, #1d4ed8, #0f766e); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
    .hero h2 { margin: 0 0 6px; font-size: 18px; }
    .hero p { margin: 0; color: #dbeafe; font-size: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { background: #171b22; border: 1px solid #262d38; border-radius: 12px; padding: 14px; }
    .card h3 { margin: 0 0 10px; font-size: 16px; }
    label { display: block; color: #aeb8c4; font-size: 13px; margin-bottom: 6px; }
    select, button, input { width: 100%; padding: 9px 10px; border-radius: 8px; border: 1px solid #374151; background: #111827; color: #e5e7eb; }
    button { cursor: pointer; background: #1f2937; }
    button:hover { background: #273449; }
    button.primary { background: #2563eb; border-color: #2563eb; }
    button.primary:hover { background: #1d4ed8; }
    .row { margin-bottom: 10px; }
    .status { padding: 10px; border-radius: 8px; background: #111827; border: 1px solid #374151; font-size: 13px; color: #9fb1c6; }
    .status.good { border-color: #166534; color: #bbf7d0; background: #052e16; }
    .status.warn { border-color: #92400e; color: #fde68a; background: #3f2207; }
    .status.bad { border-color: #7f1d1d; color: #fecaca; background: #3d1010; }
    .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #1f2937; border: 1px solid #334155; font-size: 12px; margin-right: 6px; margin-bottom: 6px; }
    .stats { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 6px; margin-top: 8px; }
    .stat { background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 7px; text-align: center; font-size: 12px; }
    .bar { margin-top: 4px; width: 100%; height: 6px; border-radius: 999px; background: #0b1220; overflow: hidden; }
    .fill { height: 100%; background: #22c55e; }
    .narr { white-space: pre-wrap; line-height: 1.6; background: #0b1220; border: 1px solid #23314d; border-radius: 8px; padding: 10px; min-height: 90px; }
    .log { max-height: 260px; overflow: auto; font-size: 12px; color: #9fb1c6; background: #111827; border: 1px solid #374151; border-radius: 8px; padding: 8px; }
    .full { grid-column: 1 / -1; }
    .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
    .inventory-item { display: inline-block; margin: 4px 6px 0 0; padding: 4px 8px; border: 1px solid #334155; border-radius: 999px; font-size: 12px; color: #bfdbfe; background: #0f172a; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1 class="title">WildWalk AI 可试玩 Demo</h1>
    <div class="desc">现在你可以像“真的小游戏”一样点着玩，不再是代码回显页面。</div>
    <div class="hero">
      <h2>快速体验入口</h2>
      <p>如果你希望“点一下就有结果”，直接点“一键自动试玩”。</p>
      <div class="quick-actions">
        <button class="primary" id="autoplayBtn">一键自动试玩（推荐）</button>
        <button id="resetBtn">重置页面状态</button>
      </div>
    </div>

    <div class="grid">
      <section class="card">
        <h3>1) 选择路线与开房</h3>
        <div class="row">
          <label>管理 Key（若服务器开启鉴权）</label>
          <input id="adminKey" placeholder="可留空；若写接口 401，请填写 .env 中 ADMIN_API_KEY" />
        </div>
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
        <h3>3) 每回合操作（聊天输入高自由）</h3>
        <div class="row">
          <label>P1 第一行动（自由输入）</label>
          <input id="intentP1" placeholder="例如：我先前进到风口，再找水，必要时给P2 10水" />
        </div>
        <div class="row">
          <label>P2 第一行动（自由输入）</label>
          <input id="intentP2" placeholder="例如：我先扎营检查装备，观察前方路况" />
        </div>
        <div class="row">
          <label>P1 第二行动（裁定后再执行）</label>
          <input id="followupP1" placeholder="例如：我继续前进并公开刚发现的路标" />
        </div>
        <div class="row">
          <label>P2 第二行动（裁定后再执行）</label>
          <input id="followupP2" placeholder="例如：我跟随P1并分享巧克力给P1 8" />
        </div>
        <div class="row"><button class="primary" id="resolveBtn">AI 裁定并结算 1 回合</button></div>
        <div id="turnStatus" class="status">尚未开局</div>
      </section>

      <section class="card">
        <h3>AI 环境播报（AI Phase）</h3>
        <div id="aiPhaseView" class="narr">等待回合开始...</div>
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
        <h3>聊天（公聊/私聊）</h3>
        <div class="grid" style="grid-template-columns: 1fr 1fr;">
          <div>
            <div class="row"><label>公聊内容（P1）</label><input id="publicMsg" placeholder="例如：我体力不行了，谁帮我背相机？" /></div>
            <div class="row"><button id="sendPublicBtn">发送公聊</button></div>
          </div>
          <div>
            <div class="row"><label>私聊内容（P1 -> P2）</label><input id="privateMsg" placeholder="例如：先别公开补给位置" /></div>
            <div class="row"><button id="sendPrivateBtn">发送私聊</button></div>
          </div>
        </div>
        <div class="grid" style="grid-template-columns: 1fr auto; align-items: end;">
          <div class="row"><label>聊天视角</label>
            <select id="chatViewer">
              <option value="P1">P1 视角</option>
              <option value="P2">P2 视角</option>
              <option value="P3">旁观者 P3 视角</option>
            </select>
          </div>
          <div class="row"><button id="refreshChatBtn">刷新聊天</button></div>
        </div>
        <div id="chatView" class="log">暂无聊天记录。</div>
      </section>

      <section class="card full">
        <h3>回合旁白</h3>
        <div id="narration" class="narr">等待回合结算...</div>
      </section>

      <section class="card full">
        <h3>AI 裁定结果（Resolution Phase）</h3>
        <div id="judgeView" class="log">等待回合结算...</div>
      </section>

      <section class="card full">
        <h3>玩家状态</h3>
        <div id="playersView"></div>
      </section>

      <section class="card full">
        <h3>物品栏（检阅 / 消耗）</h3>
        <div class="grid" style="grid-template-columns: 1fr 1fr 1fr auto;">
          <div class="row">
            <label>玩家</label>
            <select id="invPlayer">
              <option value="P1">P1 / Alice</option>
              <option value="P2">P2 / Bob</option>
            </select>
          </div>
          <div class="row">
            <label>物品</label>
            <select id="invItem"></select>
          </div>
          <div class="row">
            <label>操作</label>
            <select id="invAction">
              <option value="review">检阅</option>
              <option value="use">消耗/使用</option>
            </select>
          </div>
          <div class="row"><button id="invApplyBtn">执行物品操作</button></div>
        </div>
        <div id="invStatus" class="status">等待物品操作...</div>
      </section>

      <section class="card full">
        <h3>事件与关系变化</h3>
        <div id="metaView"></div>
      </section>

      <section class="card full">
        <h3>调试日志</h3>
        <div id="debugLog" class="log">页面已加载。</div>
      </section>

      <section class="card full">
        <h3>游戏结束总结</h3>
        <div id="summaryView" class="narr">尚未结束对局，暂无总结。</div>
      </section>
    </div>
  </div>

  <script>
    const els = {
      scenarioId: document.getElementById("scenarioId"),
      adminKey: document.getElementById("adminKey"),
      createBtn: document.getElementById("createBtn"),
      joinBtn: document.getElementById("joinBtn"),
      readyBtn: document.getElementById("readyBtn"),
      startBtn: document.getElementById("startBtn"),
      resolveBtn: document.getElementById("resolveBtn"),
      finishBtn: document.getElementById("finishBtn"),
      intentP1: document.getElementById("intentP1"),
      intentP2: document.getElementById("intentP2"),
      followupP1: document.getElementById("followupP1"),
      followupP2: document.getElementById("followupP2"),
      finishReason: document.getElementById("finishReason"),
      matchStatus: document.getElementById("matchStatus"),
      lobbyStatus: document.getElementById("lobbyStatus"),
      turnStatus: document.getElementById("turnStatus"),
      summaryStatus: document.getElementById("summaryStatus"),
      aiPhaseView: document.getElementById("aiPhaseView"),
      narration: document.getElementById("narration"),
      judgeView: document.getElementById("judgeView"),
      summaryView: document.getElementById("summaryView"),
      playersView: document.getElementById("playersView"),
      metaView: document.getElementById("metaView"),
      debugLog: document.getElementById("debugLog"),
      autoplayBtn: document.getElementById("autoplayBtn"),
      resetBtn: document.getElementById("resetBtn"),
      publicMsg: document.getElementById("publicMsg"),
      privateMsg: document.getElementById("privateMsg"),
      sendPublicBtn: document.getElementById("sendPublicBtn"),
      sendPrivateBtn: document.getElementById("sendPrivateBtn"),
      chatViewer: document.getElementById("chatViewer"),
      refreshChatBtn: document.getElementById("refreshChatBtn"),
      chatView: document.getElementById("chatView"),
      invPlayer: document.getElementById("invPlayer"),
      invItem: document.getElementById("invItem"),
      invAction: document.getElementById("invAction"),
      invApplyBtn: document.getElementById("invApplyBtn"),
      invStatus: document.getElementById("invStatus")
    };

    const state = {
      matchId: null,
      round: 1,
      ws: null,
      shouldReconnect: false,
      reconnectTimer: null,
      lastSyncAt: null,
      routeWaypoints: 6,
      finished: false,
      rescueRequested: false,
      players: [
        { id: "P1", nickname: "Alice", role: "待分配", inventory: [], stats: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20, deviceBattery: 95, signal: 65 } },
        { id: "P2", nickname: "Bob", role: "待分配", inventory: [], stats: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24, deviceBattery: 92, signal: 62 } }
      ],
      chats: []
    };

    els.adminKey.value = localStorage.getItem("wildwalk_admin_key") || "";

    function setStatus(el, text, type) {
      el.className = "status" + (type ? " " + type : "");
      el.textContent = text;
    }

    function log(msg, type) {
      const marker = type === "error" ? "❌" : type === "ok" ? "✅" : "•";
      els.debugLog.textContent = "[" + new Date().toLocaleTimeString() + "] " + marker + " " + msg + "\\n" + els.debugLog.textContent;
    }

    async function syncAfterReconnect() {
      if (!state.matchId) return;
      const viewer = encodeURIComponent(els.chatViewer.value || "P1");
      const since = state.lastSyncAt ? "&since=" + encodeURIComponent(state.lastSyncAt) : "";
      const data = await api("/v1/matches/" + state.matchId + "/sync?viewerPlayerId=" + viewer + since);
      if (data.error) return;
      if (Array.isArray(data.chats) && data.chats.length) {
        await refreshChat();
      }
      if (Array.isArray(data.logs) && data.logs.length > 0) {
        const last = data.logs[data.logs.length - 1];
        if (last?.narration) els.narration.textContent = last.narration;
      }
      if (data.match?.round) {
        state.round = data.match.round;
        setStatus(els.turnStatus, "同步完成，当前回合: " + state.round, "good");
      }
      state.lastSyncAt = data.serverTime || new Date().toISOString();
    }

    function connectRealtime() {
      if (!state.matchId) return;
      if (state.ws && state.ws.readyState === WebSocket.OPEN) return;
      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const viewerPlayerId = els.chatViewer.value || "P1";
      const ws = new WebSocket(
        protocol + "://" + location.host + "/ws?matchId=" + encodeURIComponent(state.matchId) + "&playerId=" + encodeURIComponent(viewerPlayerId)
      );
      state.ws = ws;
      state.shouldReconnect = true;
      ws.onopen = async () => {
        log("实时连接已建立", "ok");
        await syncAfterReconnect();
      };
      ws.onclose = () => {
        log("实时连接已断开", "error");
        if (!state.shouldReconnect) return;
        if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
        state.reconnectTimer = setTimeout(() => connectRealtime(), 1500);
      };
      ws.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          state.lastSyncAt = new Date().toISOString();
          if (payload.matchId && payload.matchId !== state.matchId) return;
          if (payload.type === "chat.public" || payload.type === "chat.private") {
            await refreshChat();
          }
          if (payload.type === "turn.resolved") {
            const rr = payload.payload?.roundResult;
            const narration = payload.payload?.narration;
            if (rr?.perPlayerResults) {
              rr.perPlayerResults.forEach((pr) => {
                const p = state.players.find((x) => x.id === pr.playerId);
                if (p) p.stats = pr.nextState;
              });
            }
            if (narration) els.narration.textContent = narration;
            renderPlayers();
            renderMeta(rr || {});
            log("收到实时回合结算广播", "ok");
          }
        } catch {
          log("实时消息解析失败", "error");
        }
      };
    }

    function statBlock(name, value) {
      const safe = Math.max(0, Math.min(100, Math.round(value)));
      return '<div class="stat">' + name + "<br>" + safe +
        '<div class="bar"><div class="fill" style="width:' + safe + '%"></div></div>' +
      "</div>";
    }

    function pickRandom(list) {
      return list[Math.floor(Math.random() * list.length)];
    }

    function randomLoadoutFor(playerId) {
      const rolePool = [
        {
          role: "资深驴友",
          inventory: [
            { id: "shell_jacket", name: "GORE-TEX 冲锋衣", qty: 1, effect: "提升保温并降低失温惩罚", consumable: false },
            { id: "sat_phone", name: "卫星电话", qty: 1, effect: "可触发救援中止结局", consumable: false },
            { id: "paper_map", name: "地图", qty: 1, effect: "降低压力并提高路径判断", consumable: false },
            { id: "energy_bar", name: "高热量能量棒", qty: 2, effect: "回复体力与饥饿", consumable: true }
          ],
          patch: { stamina: +8, cold: +10, stress: -4, loadWeight: 18, hasShellJacket: true, hasSatellitePhone: true, hasMap: true, hasPowerBank: false, hasHeavyCamera: false }
        },
        {
          role: "小白游客",
          inventory: [
            { id: "hoodie", name: "普通卫衣", qty: 1, effect: "轻度保温", consumable: false },
            { id: "half_water", name: "半瓶矿泉水", qty: 1, effect: "回复少量水分", consumable: true },
            { id: "phone", name: "手机", qty: 1, effect: "基础通讯设备", consumable: false },
            { id: "power_bank", name: "充电宝", qty: 1, effect: "回复设备电量", consumable: true }
          ],
          patch: { stamina: -5, cold: -12, stress: +6, loadWeight: 8, hasShellJacket: false, hasSatellitePhone: false, hasMap: false, hasPowerBank: true, hasHeavyCamera: false }
        },
        {
          role: "摄影爱好者",
          inventory: [
            { id: "camera", name: "单反相机", qty: 1, effect: "提升侦察能力但显著增加负重", consumable: false },
            { id: "tele_lens", name: "长焦镜头", qty: 1, effect: "观测远处路况", consumable: false },
            { id: "tripod", name: "三脚架", qty: 1, effect: "稳定拍摄，增加负重", consumable: false },
            { id: "battery_pack", name: "备用电池", qty: 2, effect: "回复设备电量", consumable: true }
          ],
          patch: { stamina: -3, cold: -2, stress: +2, loadWeight: 22, hasShellJacket: false, hasSatellitePhone: false, hasMap: true, hasPowerBank: true, hasHeavyCamera: true }
        }
      ];
      const chosen = pickRandom(rolePool);
      return {
        playerId,
        role: chosen.role,
        inventory: chosen.inventory,
        patch: chosen.patch
      };
    }

    function renderPlayers() {
      els.playersView.innerHTML = state.players.map((p) => {
        const s = p.stats;
        const items = (p.inventory || []).map((it) => '<span class="inventory-item">' + it.name + " x" + it.qty + "</span>").join("");
        return '<div style="margin-bottom:10px;"><b>' + p.nickname + "（" + p.role + "）</b>" +
          '<div style="font-size:12px;color:#9fb1c6;margin-top:4px;">装备：' + (items || "无") + '</div>' +
          '<div class="stats">' +
          statBlock("体力", s.stamina) +
          statBlock("水分", s.water) +
          statBlock("饥饿", s.hunger) +
          statBlock("保温", s.cold) +
          statBlock("压力", s.stress) +
          statBlock("电量", s.deviceBattery || 0) +
          statBlock("信号", s.signal || 0) +
          '</div></div>';
      }).join("");
    }

    function refreshInventoryOptions() {
      const player = state.players.find((p) => p.id === els.invPlayer.value) || state.players[0];
      const options = (player?.inventory || []).map((it) =>
        '<option value="' + it.id + '">' + it.name + " x" + it.qty + "</option>"
      );
      els.invItem.innerHTML = options.length ? options.join("") : '<option value="">无可用物品</option>';
    }

    function applyInventoryAction() {
      const player = state.players.find((p) => p.id === els.invPlayer.value);
      if (!player) return;
      const item = (player.inventory || []).find((it) => it.id === els.invItem.value);
      if (!item) {
        setStatus(els.invStatus, "没有可操作物品", "warn");
        return;
      }
      if (els.invAction.value === "review") {
        setStatus(els.invStatus, player.nickname + " 检阅「" + item.name + "」：" + item.effect, "good");
        log("物品检阅：" + player.id + " -> " + item.name, "ok");
        return;
      }
      if (item.qty <= 0) {
        setStatus(els.invStatus, "该物品已耗尽", "warn");
        return;
      }
      if (item.id === "energy_bar") {
        player.stats.stamina = Math.min(100, player.stats.stamina + 10);
        player.stats.hunger = Math.min(100, player.stats.hunger + 12);
      } else if (item.id === "half_water") {
        player.stats.water = Math.min(100, player.stats.water + 14);
      } else if (item.id === "power_bank" || item.id === "battery_pack") {
        player.stats.deviceBattery = Math.min(100, (player.stats.deviceBattery || 50) + 22);
      } else if (item.id === "sat_phone") {
        state.rescueRequested = true;
        setStatus(els.invStatus, "已触发卫星电话求援：本局将以“救援中止”结束。", "warn");
        log("触发卫星电话求援", "ok");
        return;
      } else {
        setStatus(els.invStatus, "该物品不可消耗，建议使用“检阅”", "warn");
        return;
      }
      if (item.consumable) item.qty = Math.max(0, item.qty - 1);
      setStatus(els.invStatus, player.nickname + " 使用了「" + item.name + "」", "good");
      log("物品消耗：" + player.id + " -> " + item.name, "ok");
      refreshInventoryOptions();
      renderPlayers();
    }

    function renderMeta(roundResult) {
      const pills = [];
      (roundResult.events || []).forEach(e => pills.push('<span class="pill">事件: ' + e.title + '</span>'));
      (roundResult.teamIntel || []).forEach(i => pills.push('<span class="pill">情报: ' + i.title + '</span>'));
      (roundResult.trustChanges || []).forEach(t => pills.push('<span class="pill">信任变化 ' + t.delta + '</span>'));
      els.metaView.innerHTML = pills.length ? pills.join("") : '<span class="pill">本回合无显著事件</span>';
    }

    function renderSummary(summary, reason) {
      if (!summary) return;
      const badge = summary.badge || {};
      els.summaryView.textContent =
        "结局：" + reason + "\n\n" +
        "航迹勋章：" + (badge.title || "未知") + "（" + (badge.level || "-") + "）\n" +
        "关键统计：" + JSON.stringify(badge.stats || {}, null, 2) + "\n\n" +
        "徒步日记：\n" + (summary.diary || "暂无");
    }

    function getOrCreateInventoryItem(player, itemId, fallbackName, consumable = true) {
      let found = (player.inventory || []).find((x) => x.id === itemId);
      if (!found) {
        found = { id: itemId, name: fallbackName, qty: 0, effect: "对话驱动新增物资", consumable };
        player.inventory.push(found);
      }
      return found;
    }

    function applyRoundInventoryChanges(roundResult) {
      const perPlayer = roundResult?.perPlayerResults || [];
      for (const pr of perPlayer) {
        const player = state.players.find((p) => p.id === pr.playerId);
        if (!player) continue;
        for (const used of (pr.consumedItems || [])) {
          const item = (player.inventory || []).find((it) => it.id === used.itemId);
          if (item) item.qty = Math.max(0, item.qty - Number(used.quantity || 1));
        }
      }

      for (const t of (roundResult?.transferResults || [])) {
        if (t.status !== "applied") continue;
        const from = state.players.find((p) => p.id === t.fromPlayerId);
        const to = state.players.find((p) => p.id === t.toPlayerId);
        if (!from || !to) continue;
        const moved = Number(t.movedAmount || 0);
        if (moved <= 0) continue;
        if (t.resource === "water") {
          const fromItem = (from.inventory || []).find((it) => it.id === "half_water");
          if (fromItem) fromItem.qty = Math.max(0, fromItem.qty - 1);
          const toItem = getOrCreateInventoryItem(to, "half_water", "补给矿泉水");
          toItem.qty += 1;
        } else if (t.resource === "hunger") {
          const fromItem = (from.inventory || []).find((it) => it.id === "energy_bar");
          if (fromItem) fromItem.qty = Math.max(0, fromItem.qty - 1);
          const toItem = getOrCreateInventoryItem(to, "energy_bar", "共享能量棒");
          toItem.qty += 1;
        }
      }
      refreshInventoryOptions();
    }

    function renderChat() {
      if (!state.chats.length) {
        els.chatView.textContent = "暂无聊天记录。";
        return;
      }
      els.chatView.innerHTML = state.chats.map((c) => {
        if (c.scope === "public") return "【公聊】" + c.playerId + ": " + c.message;
        return "【私聊】" + c.fromPlayerId + " -> " + c.toPlayerId + ": " + c.message;
      }).join("<br>");
    }

    async function api(path, method = "GET", body) {
      const headers = { "Content-Type": "application/json" };
      const adminKey = (els.adminKey.value || "").trim();
      if (adminKey) {
        headers["x-admin-key"] = adminKey;
        localStorage.setItem("wildwalk_admin_key", adminKey);
      }
      const res = await fetch(path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      return res.json();
    }

    async function loadScenarios() {
      const data = await api("/v1/scenarios");
      els.scenarioId.innerHTML = (data.scenarios || []).map(s =>
        '<option value="' + s.id + '">' + s.name + "（" + s.difficulty + "）</option>"
      ).join("");
      log("路线列表已加载", "ok");
    }

    els.createBtn.addEventListener("click", async () => {
      try {
        const data = await api("/v1/matches", "POST", { scenarioId: els.scenarioId.value });
        if (data.error) throw new Error(data.message || data.error);
        state.matchId = data.matchId;
        state.round = data.round || 1;
        state.lastSyncAt = null;
        state.finished = false;
        state.rescueRequested = false;
        try {
          const detail = await api("/v1/scenarios/" + data.scenarioId);
          state.routeWaypoints = detail?.detail?.sampleWaypoints?.length || 6;
        } catch {}
        setStatus(els.matchStatus, "房间已创建: " + data.matchId + " | 路线: " + data.scenario.name, "good");
        connectRealtime();
        log("创建房间成功 " + data.matchId, "ok");
      } catch (e) {
        setStatus(els.matchStatus, "创建失败: " + e.message, "bad");
        log("创建房间失败: " + e.message, "error");
      }
    });

    els.joinBtn.addEventListener("click", async () => {
      if (!state.matchId) {
        setStatus(els.lobbyStatus, "请先创建房间。", "warn");
        return;
      }
      try {
        const a = await api("/v1/matches/" + state.matchId + "/join", "POST", { playerId: "P1", nickname: "Alice" });
        const b = await api("/v1/matches/" + state.matchId + "/join", "POST", { playerId: "P2", nickname: "Bob" });
        if (a.error && a.message !== "PLAYER_ALREADY_JOINED") throw new Error(a.message || a.error);
        if (b.error && b.message !== "PLAYER_ALREADY_JOINED") throw new Error(b.message || b.error);
        for (const p of state.players) {
          const loadout = randomLoadoutFor(p.id);
          p.role = loadout.role;
          p.inventory = loadout.inventory;
          p.stats = {
            ...p.stats,
            stamina: Math.max(10, Math.min(100, p.stats.stamina + loadout.patch.stamina)),
            cold: Math.max(10, Math.min(100, p.stats.cold + loadout.patch.cold)),
            stress: Math.max(0, Math.min(100, p.stats.stress + loadout.patch.stress)),
            loadWeight: loadout.patch.loadWeight,
            hasShellJacket: loadout.patch.hasShellJacket,
            hasSatellitePhone: loadout.patch.hasSatellitePhone,
            hasMap: loadout.patch.hasMap,
            hasPowerBank: loadout.patch.hasPowerBank,
            hasHeavyCamera: loadout.patch.hasHeavyCamera
          };
        }
        renderPlayers();
        refreshInventoryOptions();
        setStatus(els.lobbyStatus, "两名玩家已加入。", "good");
        log("玩家加入完成", "ok");
      } catch (e) {
        setStatus(els.lobbyStatus, "加入失败: " + e.message, "bad");
        log("玩家加入失败: " + e.message, "error");
      }
    });

    els.readyBtn.addEventListener("click", async () => {
      if (!state.matchId) {
        setStatus(els.lobbyStatus, "请先创建房间。", "warn");
        return;
      }
      await api("/v1/matches/" + state.matchId + "/ready", "POST", { playerId: "P1", ready: true });
      await api("/v1/matches/" + state.matchId + "/ready", "POST", { playerId: "P2", ready: true });
      setStatus(els.lobbyStatus, "全员 ready。", "good");
      log("全员准备完成", "ok");
    });

    els.startBtn.addEventListener("click", async () => {
      if (!state.matchId) {
        setStatus(els.turnStatus, "请先创建房间。", "warn");
        return;
      }
      const data = await api("/v1/matches/" + state.matchId + "/start", "POST");
      if (data.error) {
        setStatus(els.turnStatus, "开局失败: " + data.message, "bad");
        log("对局开始失败: " + data.message, "error");
        return;
      }
      setStatus(els.turnStatus, "对局开始，当前回合: " + data.round, "good");
      log("对局开始", "ok");
    });

    els.resolveBtn.addEventListener("click", async () => {
      if (state.finished) {
        setStatus(els.turnStatus, "本局已结束，请重置或新建房间。", "warn");
        return;
      }
      if (!state.matchId) {
        setStatus(els.turnStatus, "请先创建并开始房间。", "warn");
        return;
      }
      const payload = {
        viewerPlayerId: "P1",
        playerActions: [
          {
            playerId: "P1",
            intent: (els.intentP1.value || "").trim(),
            followupIntent: (els.followupP1.value || "").trim(),
            state: state.players[0].stats
          },
          {
            playerId: "P2",
            intent: (els.intentP2.value || "").trim(),
            followupIntent: (els.followupP2.value || "").trim(),
            state: state.players[1].stats
          }
        ]
      };
      const data = await api("/v1/matches/" + state.matchId + "/resolve-turn", "POST", payload);
      if (data.error) {
        setStatus(els.turnStatus, "结算失败: " + data.message, "bad");
        log("回合结算失败: " + data.message, "error");
        return;
      }
      if (data.perPlayerResults) {
        data.perPlayerResults.forEach(pr => {
          const p = state.players.find(x => x.id === pr.playerId);
          if (p) p.stats = pr.nextState;
        });
      }
      applyRoundInventoryChanges(data);
      state.round = data.match.round;
      setStatus(els.turnStatus, "回合结算完成，下一回合: " + state.round, "good");
      if (data.aiPhase?.broadcast) {
        els.aiPhaseView.textContent = data.aiPhase.broadcast;
      }
      els.narration.textContent = data.narration || "无旁白";
      els.judgeView.textContent = Array.isArray(data.aiAdjudication) && data.aiAdjudication.length
        ? data.aiAdjudication.join("\n")
        : "本回合无额外判定明细。";
      renderPlayers();
      renderMeta(data);
      log("完成第 " + (state.round - 1) + " 回合结算", "ok");

      const alivePlayers = state.players.filter((p) => p.stats.stamina > 0 && p.stats.cold > 0);
      let autoReason = null;
      if (alivePlayers.length === 0) {
        autoReason = "all_dead";
      } else if (state.rescueRequested) {
        autoReason = "rescue_abort";
      } else if ((state.round - 1) >= state.routeWaypoints) {
        autoReason = "summit_success";
      }
      if (autoReason) {
        const finish = await api("/v1/matches/" + state.matchId + "/finish", "POST", { reason: autoReason });
        if (!finish.error) {
          const summary = await api("/v1/match/" + state.matchId + "/summary");
          state.finished = true;
          if (summary?.diary) {
            els.narration.textContent = summary.diary;
          }
          setStatus(
            els.summaryStatus,
            "自动结局：" + autoReason + " | 徒步日记已生成 | 勋章：" + summary.badge.title + "（" + summary.badge.level + "）",
            autoReason === "summit_success" ? "good" : "warn"
          );
          renderSummary(summary, autoReason);
          log("自动触发结局：" + autoReason, "ok");
        }
      }
    });

    async function refreshChat() {
      if (!state.matchId) {
        setStatus(els.turnStatus, "请先创建房间。", "warn");
        return;
      }
      const data = await api("/v1/matches/" + state.matchId + "/chat?viewerPlayerId=" + encodeURIComponent(els.chatViewer.value));
      if (data.error) {
        log("刷新聊天失败: " + data.message, "error");
        return;
      }
      state.chats = data.chats || [];
      renderChat();
      log("聊天已刷新（" + els.chatViewer.value + "）", "ok");
    }

    els.sendPublicBtn.addEventListener("click", async () => {
      if (!state.matchId) return log("请先创建房间", "error");
      const message = (els.publicMsg.value || "").trim();
      if (!message) return;
      const data = await api("/v1/matches/" + state.matchId + "/chat/public", "POST", { playerId: "P1", message });
      if (data.error) return log("公聊发送失败: " + data.message, "error");
      els.publicMsg.value = "";
      await refreshChat();
    });

    els.sendPrivateBtn.addEventListener("click", async () => {
      if (!state.matchId) return log("请先创建房间", "error");
      const message = (els.privateMsg.value || "").trim();
      if (!message) return;
      const data = await api("/v1/matches/" + state.matchId + "/chat/private", "POST", {
        fromPlayerId: "P1",
        toPlayerId: "P2",
        message
      });
      if (data.error) return log("私聊发送失败: " + data.message, "error");
      els.privateMsg.value = "";
      await refreshChat();
    });

    els.refreshChatBtn.addEventListener("click", refreshChat);
    els.invPlayer.addEventListener("change", refreshInventoryOptions);
    els.invApplyBtn.addEventListener("click", applyInventoryAction);
    els.chatViewer.addEventListener("change", async () => {
      if (state.ws) {
        try { state.ws.close(); } catch {}
      }
      connectRealtime();
      await refreshChat();
    });

    els.finishBtn.addEventListener("click", async () => {
      if (!state.matchId) {
        setStatus(els.summaryStatus, "请先开始一局对局。", "warn");
        return;
      }
      const finish = await api("/v1/matches/" + state.matchId + "/finish", "POST", { reason: els.finishReason.value });
      if (finish.error) {
        setStatus(els.summaryStatus, "结束失败: " + finish.message, "bad");
        log("结束失败: " + finish.message, "error");
        return;
      }
      const summary = await api("/v1/match/" + state.matchId + "/summary");
      setStatus(els.summaryStatus, "对局已结束: " + finish.finishReason + " | 勋章: " + summary.badge.title + " (" + summary.badge.level + ")", "good");
      renderSummary(summary, finish.finishReason);
      log("对局结束并拉取总结", "ok");
    });

    els.autoplayBtn.addEventListener("click", async () => {
      try {
        const data = await api("/v1/demo/run-once", "POST", {
          scenarioId: els.scenarioId.value,
          finishReason: els.finishReason.value
        });
        if (data.error) throw new Error(data.message || data.error);

        state.matchId = data.matchId;
        state.lastSyncAt = null;
        connectRealtime();
        if (data.roundResult && data.roundResult.perPlayerResults) {
          data.roundResult.perPlayerResults.forEach(pr => {
            const p = state.players.find(x => x.id === pr.playerId);
            if (p) p.stats = pr.nextState;
          });
        }
        setStatus(els.matchStatus, "自动试玩完成，房间: " + data.matchId, "good");
        setStatus(els.lobbyStatus, "自动完成加入与开局。", "good");
        setStatus(els.turnStatus, "自动完成 1 回合结算。", "good");
        setStatus(els.summaryStatus, "自动结束: " + data.finalMatch.finishReason + " | 勋章: " + data.summary.badge.title + " (" + data.summary.badge.level + ")", "good");
        els.narration.textContent = data.narration || "无旁白";
        els.judgeView.textContent = Array.isArray(data.roundResult?.aiAdjudication) ? data.roundResult.aiAdjudication.join("\n") : "自动试玩未返回判定明细";
        renderSummary(data.summary, data.finalMatch.finishReason);
        renderMeta(data.roundResult || {});
        renderPlayers();
        log("一键自动试玩完成", "ok");
      } catch (e) {
        setStatus(els.summaryStatus, "自动试玩失败: " + e.message, "bad");
        log("自动试玩失败: " + e.message, "error");
      }
    });

    els.resetBtn.addEventListener("click", () => {
      state.matchId = null;
      state.round = 1;
      state.lastSyncAt = null;
      state.shouldReconnect = false;
      if (state.ws) {
        try { state.ws.close(); } catch {}
      }
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
      state.ws = null;
      state.players = [
        { id: "P1", nickname: "Alice", role: "待分配", inventory: [], stats: { stamina: 80, water: 70, hunger: 70, cold: 80, stress: 20, deviceBattery: 95, signal: 65 } },
        { id: "P2", nickname: "Bob", role: "待分配", inventory: [], stats: { stamina: 75, water: 65, hunger: 68, cold: 78, stress: 24, deviceBattery: 92, signal: 62 } }
      ];
      state.finished = false;
      state.rescueRequested = false;
      state.routeWaypoints = 6;
      setStatus(els.matchStatus, "未创建房间");
      setStatus(els.lobbyStatus, "等待操作...");
      setStatus(els.turnStatus, "尚未开局");
      setStatus(els.summaryStatus, "未结束");
      els.narration.textContent = "等待回合结算...";
      els.judgeView.textContent = "等待回合结算...";
      els.aiPhaseView.textContent = "等待回合开始...";
      els.summaryView.textContent = "尚未结束对局，暂无总结。";
      els.metaView.innerHTML = "";
      els.chatView.textContent = "暂无聊天记录。";
      els.debugLog.textContent = "页面已重置。";
      els.intentP1.value = "";
      els.intentP2.value = "";
      els.followupP1.value = "";
      els.followupP2.value = "";
      setStatus(els.invStatus, "等待物品操作...");
      renderPlayers();
      refreshInventoryOptions();
      log("已重置页面状态");
    });

    loadScenarios();
    renderPlayers();
    refreshInventoryOptions();
  </script>
</body>
</html>`;
}
