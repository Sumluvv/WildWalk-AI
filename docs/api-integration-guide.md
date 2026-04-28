# WildWalk AI 接口接入指南（从 0 到可玩）

这份文档专门回答三个问题：

1. 服务器怎么部署到你自己买的机器上
2. 数据库怎么设置
3. API 在客户端哪里接、怎么接

## 1) 部署到你自己的服务器（最短路径）

假设你买的是 Ubuntu 云服务器，公网 IP 为 `1.2.3.4`。

### Step A: 登录并准备环境

```bash
ssh root@1.2.3.4
apt update
apt install -y git docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
```

### Step B: 拉代码与配置

```bash
git clone <YOUR_REPO_URL>
cd WildWalk-AI
cp .env.example .env
```

编辑 `.env`（最小可跑配置）：

- `PORT=3000`
- `CORS_ORIGIN=*`（上线前改成你的前端域名）
- `DB_FILE=.data/wildwalk.sqlite`
- `ENABLE_REAL_AI=true`
- `LLM_API_KEY=你的DeepSeek_API_Key`
- `LLM_BASE_URL=https://api.deepseek.com`
- `LLM_MODEL=deepseek-chat`
- `REQUIRE_ADMIN_KEY=true`
- `ADMIN_API_KEY=你自己设置一个长字符串`

### Step C: 启动

```bash
docker compose up -d --build
```

验证：

```bash
curl http://127.0.0.1:3000/healthz
```

如果返回 `ok=true` 且 `db.ok=true`，说明服务和数据库都正常。

如果你开了管理鉴权，冒烟测试这样跑：

```bash
ADMIN_API_KEY=你设置的值 ./scripts/smoke.sh
```

---

## 2) 数据库怎么设置（当前是 SQLite）

你现在不需要手动建表，服务启动会自动初始化数据库与结构：

- 默认文件：`.data/wildwalk.sqlite`
- 表：
  - `matches`
  - `match_logs`
  - `match_chats`

你只需要做两件事：

1. 保证 `.data/` 目录持久化（`docker-compose.yml` 已挂载）
2. 定期备份 `.data/` 目录

备份示例：

```bash
tar -czf wildwalk-data-$(date +%F).tar.gz .data
```

---

## 3) API 接口在哪接入（前端/客户端）

核心原则：**客户端只调 HTTP + WebSocket；游戏数值全由后端算。**

### 3.0 鉴权怎么接

如果服务端启用了：

- `REQUIRE_ADMIN_KEY=true`

那么所有写请求都要加请求头：

```js
headers: {
  "Content-Type": "application/json",
  "x-admin-key": "你的 ADMIN_API_KEY"
}
```

读请求通常不用加。

### 3.1 前端配置一个 API Base URL

例如：

- 开发：`http://127.0.0.1:3000`
- 线上：`https://api.your-domain.com`

### 3.2 最小接入顺序（按页面）

1. **选路线页**  
   `GET /v1/scenarios`

2. **创建房间**  
   `POST /v1/matches`

3. **房间页**  
   `POST /v1/matches/:id/join`  
   `POST /v1/matches/:id/ready`  
   `POST /v1/matches/:id/start`

4. **聊天**  
   `POST /v1/matches/:id/chat/public`  
   `POST /v1/matches/:id/chat/private`  
   `GET /v1/matches/:id/chat?viewerPlayerId=...`

5. **回合结算**  
   `POST /v1/matches/:id/resolve-turn`

6. **断线恢复**  
   `GET /v1/matches/:id/sync?viewerPlayerId=...&since=...`

7. **结束结算页**  
   `POST /v1/matches/:id/finish`  
   `GET /v1/match/:id/summary`

### 3.3 WebSocket 实时接入

连接：

`ws://<host>/ws?matchId=<matchId>&playerId=<viewerPlayerId>`

监听事件：

- `chat.public`
- `chat.private`
- `turn.resolved`

重连后立刻调一次 `sync`，补齐漏消息。

---

## 4) 给你一个“是否接对”的验收标准

- 能建房、能加入、能开局
- 发公聊后双方都能看到
- 发私聊后只有双方看到
- 点“结算回合”后有旁白和状态变化
- 刷新页面/断线重连后能恢复当前局

满足这 5 条，就达到了“可上线试玩”的基础接入标准。
