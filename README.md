# WildWalk AI

《WildWalk AI》是一款多人在线、回合制、现实地理映射的 AI 徒步生存模拟手机游戏。  
核心目标：用真实路线、真实天气、真实海拔和地形数据，驱动硬核生存决策与社交博弈。

## 1. 项目简介

- 项目定位：多人 AI 徒步模拟（Mobile-first，跨平台优先：iOS + Android）
- 核心卖点：现实映射 + 生存数值 + 社交博弈 + AI 叙事裁定
- 技术策略：后端负责确定性数值计算，AI 负责解释、叙事与不确定事件包装
- 成本策略：先做低成本 MVP（少路线、少角色、稳定回合流程），再逐步扩展

## 2. 功能清单（MVP）

- 路线剧本系统（Scenarios）
  - 支持路线基础信息：海拔、天气、地形、路点（Waypoint）
  - 支持难度标签：Demo / Advanced / Hardcore
- 回合制流程
  - 环境播报（AI Phase）
  - 玩家行动（Action Phase）
  - AI 裁定（Resolution Phase）
  - 结算叙事（Narration）
- 生存数值系统
  - 体力（Stamina）
  - 水分/饥饿（Hydration/Hunger）
  - 失温值（Warmth）
  - 心理压力（Mental Stress）
  - 电子设备状态（电量、信号、余量）
- 社交系统
  - 公共频道
  - 私聊频道
  - 行动共享与背刺策略
- 胜负判定
  - 登顶成功
  - 全军覆没
  - 卫星救援中止（保命但挑战失败）

## 2.1 文档导航

- `docs/development-rules.md`：开发规则（最高优先级）
- `docs/multi-agent-collaboration.md`：多 Agent 协同分工与节奏
- `docs/mvp-round-loop-design.md`：单回合 MVP 设计
- `docs/numeric-design-v0.md`：数值模型与参数 v0
- `docs/ai-narrative-spec-v0.md`：AI 叙事与安全规范 v0
- `docs/mobile-ui-mvp-flow.md`：移动端 MVP 页面流程
- `docs/deploy-minimal.md`：最小云服务器部署步骤（可上线试玩）
- `docs/nginx-wildwalk.conf`：Nginx 反向代理示例（含 WebSocket）
- `docs/api-integration-guide.md`：服务器部署 / 数据库设置 / API 接入实操指南
- `docs/stability-snapshot-2026-04-28.md`：稳定性快照基线（用于回归与回滚对照）

## 3. 安装与运行说明（规划阶段）

当前仓库已包含后端 MVP 规则引擎（单回合计算）与基础自动化测试。
建议技术栈如下：

- 客户端：`Unity` 或 `React Native + Expo`
- 服务端：`Node.js + TypeScript (NestJS/Fastify)`
- 数据库：`PostgreSQL`
- 实时通信：`WebSocket`
- AI 接入：`LLM API`（仅用于叙事/解释，不负责最终数值计算）

### 本地启动（设计文档阶段）

1. 克隆仓库
2. 进入项目目录并执行 `node -v`（建议 Node 20+）
3. 运行测试：`npm test`
4. 阅读 `docs/` 设计文档并继续迭代

## 4. 主要接口/参数说明（MVP 草案）

### 回合输入（RoundInput）

- `scenarioId`: 路线 ID
- `partyState`: 队伍状态（成员数值、位置、装备）
- `playerActions[]`: 玩家本回合提交的行动
- `chatLogs[]`: 公聊与私聊文本
- `seed`: 随机种子（保证可回放）
- `round`: 当前回合编号
- `players[]`: 玩家列表（用于私有事件定向分发）
- `action`: 单人模式行动（`move/camp/hydrate/check`）
- `playerActions[]`: 多人模式行动数组（每项含 `playerId + action + state`）
- `transfers[]`: 多人资源分享数组（每项含 `fromPlayerId + toPlayerId + resource + amount`）
- `trustMatrix[]`: 玩家信任矩阵（每项含 `fromPlayerId + toPlayerId + value`）
- `betrayalActions[]`: 背刺动作数组（每项含 `actorPlayerId + targetPlayerId + type`）
- `eventDisclosures[]`: 私有事件公开决策（每项含 `playerId + disclose`）

### 回合输出（RoundResult）

- `numericDelta`: 各玩家数值变化
- `events`: 随机事件与可见性（公开/私有）
- `stateSnapshot`: 新的队伍状态快照
- `aiNarration`: AI 叙事文本（只解释，不改写数值）

### HTTP API（已实现 MVP）

- `GET /healthz`
  - 用途：健康检查
  - 返回：`{ ok, service, db }`
  - 说明：`db.ok=false` 时返回 `503`，便于部署平台探针快速熔断
- `POST /v1/round/resolve`
  - 用途：执行单回合数值结算
  - 请求体：`RoundInput`（支持单人 `action` 和多人 `playerActions[]` 两种模式）
  - 返回（单人）：`{ numericDelta, action, nextState, events, visibleEvents }`
  - 返回（多人）：`{ events, visibleEvents, perPlayerResults[] }`
  - 说明：`visibleEvents` 已按 `viewerPlayerId` 过滤，仅包含该玩家可见事件（公开 + 该玩家私有）
  - MVP 行动枚举：`move`（前进）`camp`（扎营）`hydrate`（补水）`check`（检查装备）
  - MVP 分享资源：`resource` 支持 `water` 或 `hunger`
  - `transfers[]` 扩展：
    - `isHidden`: 是否私下交易（仅双方可见）
    - `requiresTrust`: 最低信任值门槛，未达到则阻断
  - 多人返回新增：`transferResults[]`（每笔分享状态，如 `applied` / `blocked_trust`）
  - 背刺动作 `type`（MVP）：
    - `hide_supply`（隐瞒补给）
    - `refuse_share`（拒绝分享）
    - `fake_info`（提供假信息）
  - 多人返回新增：
    - `betrayalResults[]`（背刺执行结果）
    - `trustMatrix[]`（回合后信任矩阵快照）
    - `trustChanges[]`（本回合自动关系演化明细）
    - `disclosureResults[]`（玩家是否公开私有事件的处理结果）
    - `teamIntel[]`（被公开到团队情报流的事件）
    - `disclosureConsequences[]`（公开/隐瞒造成的信任与压力连带影响）
    - `narrativePacket`（给 AI 旁白的结构化回合摘要输入）
- `POST /v1/narration/preview`
  - 用途：根据 `narrativePacket` 生成模板中文旁白（MVP 预览版）
  - 请求体：`{ narrativePacket }`
  - 返回：`{ narration, source }`
- `POST /v1/round/resolve-and-narrate`
  - 用途：一次请求完成“回合结算 + AI 旁白”
  - 请求体：与 `POST /v1/round/resolve` 相同
  - 返回：`roundResult + narration + narrationSource + narrationModel`
  - 可选：传入 `matchId` 时，自动写入对局剧情日志
  - 说明：若未配置真实 LLM，则自动模板回退（`template-fallback`）
- `POST /v1/ai/narrate`
  - 用途：只做旁白生成（真实 AI + 模板回退）
  - 请求体：`{ narrativePacket }`
  - 返回：`{ narration, source, model }`
- `GET /v1/match/:matchId/logs`
  - 用途：读取指定对局的回合剧情日志（MVP 内存版）
  - 返回：`{ matchId, logs[] }`
- `GET /v1/match/:matchId/diary`
  - 用途：基于日志生成“徒步日记”文本（MVP 模板版）
  - 返回：`{ matchId, diary, rounds }`
- `GET /v1/match/:matchId/badge`
  - 用途：基于日志统计生成“航迹勋章”与称号（MVP 规则版）
  - 返回：`{ matchId, level, title, stats }`
- `GET /v1/match/:matchId/summary`
  - 用途：赛后总结一体化读取（日志+日记+勋章）
  - 返回：`{ matchId, rounds, badge, diary, logs }`
- `GET /v1/scenarios`
  - 用途：获取可选徒步路线列表（MVP 内置版）
  - 返回：`{ total, scenarios[] }`
- `GET /v1/scenarios/:scenarioId`
  - 用途：获取单条路线详情（天气分布、建议策略、示例路点）
  - 返回：`scenarioSummary + detail`
- `POST /v1/matches`
  - 用途：根据路线创建新对局（开局入口）
  - 请求体：`{ scenarioId }`
  - 返回：`{ matchId, scenarioId, round, status, partyState, scenario }`
- `POST /v1/matches/:matchId/join`
  - 用途：玩家加入房间
  - 请求体：`{ playerId, nickname }`
- `POST /v1/matches/:matchId/ready`
  - 用途：玩家准备状态切换
  - 请求体：`{ playerId, ready }`
- `POST /v1/matches/:matchId/start`
  - 用途：房间开局（需至少 2 人且全员 ready）
- `POST /v1/matches/:matchId/resolve-turn`
  - 用途：按房间当前回合自动结算并推进回合号
  - 请求体：回合输入（如 `playerActions/environment/viewerPlayerId`）
  - 返回：`{ match, roundResult..., narration, narrationSource, narrationModel }`
  - 说明：会自动把该房间聊天记录注入回合上下文（`narrativePacket.highlights.chatLogs`）
  - 注入策略（默认）：最近 2 回合、最多 12 条，避免历史聊天噪音污染旁白
- `POST /v1/matches/:matchId/chat/public`
  - 用途：发送公聊
  - 请求体：`{ playerId, message }`
  - 返回：聊天消息对象（`scope=public`）
- `POST /v1/matches/:matchId/chat/private`
  - 用途：发送私聊
  - 请求体：`{ fromPlayerId, toPlayerId, message }`
  - 返回：聊天消息对象（`scope=private`）
- `GET /v1/matches/:matchId/chat?viewerPlayerId=...`
  - 用途：按查看者读取可见聊天
  - 返回：`{ matchId, viewerPlayerId, chats[] }`
  - 说明：私聊仅双方可见，公聊全员可见
- `GET /v1/matches/:matchId/sync?viewerPlayerId=...&since=...`
  - 用途：断线重连后的增量补拉（聊天 + 回合日志）
  - 返回：`{ matchId, since, serverTime, match, chats[], logs[] }`
  - 说明：`since` 为 ISO 时间；不传则返回当前可见全量
- `POST /v1/matches/:matchId/finish`
  - 用途：结束对局并写入结束原因
  - 请求体：`{ reason }`
  - reason 枚举：`summit_success` / `all_dead` / `rescue_abort`
- `POST /v1/demo/run-once`
  - 用途：一键执行 MVP 端到端演示流程（建房->加入->开局->一回合->结束->总结）
  - 请求体：`{ scenarioId?, finishReason? }`
  - 返回：`{ matchId, scenario, roundResult, narration, finalMatch, summary }`
- `GET /demo`
  - 用途：打开本地可点击演示页（浏览器中一键触发 `demo/run-once`）

### 实时推送（WebSocket）

- 连接地址：`ws://localhost:3000/ws?matchId=<matchId>&playerId=<viewerPlayerId>`
- 推送事件：
  - `chat.public`：公聊消息广播
  - `chat.private`：私聊消息定向推送（仅私聊双方收到）
  - `turn.resolved`：回合结算广播（含 `narration` 与 `roundResult`）
- 说明：`/demo` 页面已接入实时连接，聊天与回合结果可自动刷新
- 稳定性：服务端已开启心跳保活（15s ping/pong），Demo 页断线后会自动重连

## 5. 测试与验证方法（MVP 目标）

- 单元测试：数值计算规则（天气、坡度、负重、保暖）
- 集成测试：完整一回合流程（输入 -> 计算 -> 裁定 -> 输出）
- 回放测试：固定 `seed` 多次执行，确保结果可复现

### 本地运行与测试命令

- 启动服务：`npm run start`
- 运行测试：`npm test`
- 一键冒烟自检：`./scripts/smoke.sh`
  - 若开启鉴权：`ADMIN_API_KEY=你的值 ./scripts/smoke.sh`

### 生产/试玩服部署（基础版）

1. 复制环境模板：`cp .env.example .env`
2. 按需修改 `.env`（至少确认 `PORT`、`DB_FILE`、`ENABLE_REAL_AI`）
3. Docker 启动：`docker compose up -d --build`
4. 健康检查：访问 `GET /healthz`
5. 打开试玩页：`/demo`

> 当前目标平台：**cross-platform（Docker Linux 容器）**。  
> 若后续要 iOS-only/macOS-only 客户端联调，只需改客户端，不影响当前服务端部署方式。

完整云部署步骤见：`docs/deploy-minimal.md`
接口接入实操见：`docs/api-integration-guide.md`

### PM2 启动（非 Docker 备用）

1. 安装 PM2：`npm i -g pm2`
2. 启动：`pm2 start ecosystem.config.cjs`
3. 查看状态：`pm2 status`
4. 开机自启：`pm2 startup && pm2 save`

### Nginx 反向代理（含 WebSocket）

- 示例文件：`docs/nginx-wildwalk.conf`
- 核心点：
  - `/` 反代 HTTP API 与 Demo
  - `/ws` 反代 WebSocket，并开启 `Upgrade` 头

### 真实 AI 旁白配置（可选）

- `ENABLE_REAL_AI=true`：开启真实 LLM 调用
- `LLM_API_KEY=<YOUR_API_KEY>`：LLM API Key（必须）
- `LLM_BASE_URL=https://api.openai.com/v1`：兼容 OpenAI 协议的 Base URL（可选）
- `LLM_MODEL=gpt-4o-mini`：模型名（可选）
- `NARRATION_CHAT_MAX_MESSAGES=12`：回合旁白注入的聊天最大条数（可选）
- `NARRATION_CHAT_ROUNDS_BACK=2`：回合旁白回看最近几回合聊天（可选）
- `DB_FILE=.data/wildwalk.sqlite`：SQLite 数据库文件（推荐保留默认）
- `RUNTIME_STORE_FILE=.data/runtime-store.json`：运行态持久化文件路径（可选）
- `REQUIRE_ADMIN_KEY=false`：是否启用写接口鉴权（建议生产开）
- `ADMIN_API_KEY=<YOUR_ADMIN_API_KEY>`：管理接口 Key（请求头 `x-admin-key`）
- `RATE_LIMIT_ENABLED=true`：是否启用限流
- `RATE_LIMIT_WINDOW_MS=60000`：限流时间窗口（毫秒）
- `RATE_LIMIT_MAX_REQUESTS=240`：每个 IP 在窗口内最大请求数
- 未配置或调用失败时会自动回退到模板旁白，保证试玩流程不中断

### 手动验收步骤（给非技术同学）

1. 进入“选择路线”界面，选京都大文字山
2. 创建 2~3 人房间并开始游戏
3. 每名玩家执行 1 次个人行动 + 1 次聊天
4. 检查是否生成“环境播报 + 数值变化 + 叙事”
5. 重复 3 回合，确认体力与失温逻辑变化合理

## 6. 常见问题与解决方案（FAQ）

- Q: 为什么 AI 说了“很危险”，但数值没变？
  - A: AI 只负责叙事，数值只由后端规则引擎修改，这是设计要求。
- Q: 为什么同样行动结果不同？
  - A: 可能受到天气变化、地形、随机事件和隐藏私聊决策影响。
- Q: 为什么先做低难度路线？
  - A: 低成本验证核心循环，减少早期研发风险。

## 7. 本次改动记录

### 改动概要与原因

- 新建项目基础文档，明确产品方向、MVP 范围、接口草案与测试方式。
- 先统一开发规则和协作方式，避免多人并行开发时目标不一致。
- 完成多 Agent 首轮产出沉淀（数值策划、AI 叙事、移动端 UI 流程）。
- 新增后端单回合规则引擎与基础测试，确保“可运行 + 可验证”。
- 新增最小 HTTP API（健康检查 + 回合结算）与接口集成测试。
- 新增 `seed` 可回放随机事件与公开/私有事件分发逻辑。
- 新增玩家视角事件过滤（`viewerPlayerId -> visibleEvents`），便于客户端直接渲染。
- 新增行动输入 `action` 对数值结算的直接影响（前进/扎营/补水/检查）。
- 新增多人 `playerActions[]` 逐玩家结算输出（`perPlayerResults`），对接多人回合制。
- 新增多人资源分享 `transfers[]` 联动结算（如分享水/食物）。
- 新增私下交易与信任门槛规则（`isHidden` + `requiresTrust` + `trustMatrix`）。
- 新增背刺动作规则（`betrayalActions[]`）并联动信任值与目标心理压力。
- 新增关系演化：分享与背刺会自动产生 `trustChanges[]` 并更新 `trustMatrix`。
- 新增私有事件公开决策链路（`eventDisclosures[] -> teamIntel[]`）。
- 新增公开/隐瞒后的二次影响（队友压力与信任联动变化）。
- 新增 `narrativePacket` 回合叙事打包输出，便于 AI 直接生成旁白。
- 新增 `POST /v1/narration/preview` 旁白预览接口（模板渲染）。
- 新增 `POST /v1/round/resolve-and-narrate` 一体化接口，便于前端单次调用。
- 新增对局日志接口（内存版），用于“徒步日记”与“航迹勋章”后续能力衔接。
- 新增 `GET /v1/match/:matchId/diary`，可直接产出中文日记预览。
- 新增 `GET /v1/match/:matchId/badge`，可返回称号、等级与关键统计。
- 新增 `GET /v1/match/:matchId/summary`，便于前端一接口渲染赛后页。
- 新增 `GET /v1/scenarios`，支持“选路线”页面直接拉取路线列表。
- 新增 `GET /v1/scenarios/:scenarioId`，支持“路线详情页”展示。
- 新增 `POST /v1/matches`，支持从路线详情页一键开局。
- 新增 `join/ready/start` 房间流程接口，打通“创建房间 -> 准备 -> 开局”。
- 新增 `resolve-turn` 房间回合接口，减少前端拼装回合上下文的负担。
- 新增 `finish` 对局结束接口，覆盖登顶成功/全灭/救援中止。
- 新增 `demo/run-once` 一键试玩接口，用于快速演示整条玩法链路。
- 新增 `GET /demo` 演示页面，非技术同学可直接点击体验接口链路。
- 新增真实 AI 旁白服务（`POST /v1/ai/narrate`），支持模板回退，保证可用性。
- 新增公聊/私聊接口与可见性过滤接口（`chat/public`、`chat/private`、`chat?viewerPlayerId`）。
- 新增回合自动注入聊天上下文，AI 旁白可读取玩家聊天语境（`narrativePacket.highlights.chatLogs`）。
- 升级聊天注入策略为“最近窗口注入”（默认最近 2 回合、最多 12 条），降低提示词噪音并稳定旁白质量。
- 新增 WebSocket 实时推送能力（聊天/回合），`/demo` 页面支持自动实时刷新体验。
- 升级私聊为服务端定向推送，并加入心跳与自动重连机制，提升弱网环境稳定性。
- 新增运行态本地持久化（对局/聊天/日志）与重启恢复，支持断线后增量补拉 `sync` 接口。
- 实装 SQLite 持久化底座，默认将运行态写入 `.data/wildwalk.sqlite`，提升重启恢复稳定性。
- 持久化升级为 SQLite 结构化表（`matches`/`match_logs`/`match_chats`），查询与恢复更稳定。
- 新增 `.env.example`、`Dockerfile`、`docker-compose.yml`，补齐基础部署链路（本地到试玩服）。
- 新增请求级 `X-Request-Id` 与基础访问日志，便于线上问题排查。
- 新增最小云服务器部署文档（`docs/deploy-minimal.md`），覆盖启动、验证与回滚步骤。
- 新增 `healthz` 数据库可用性检查，便于平台健康探针与自动重启策略。
- 新增 `ecosystem.config.cjs`，支持 PM2 一键拉起（非 Docker 备用方案）。
- 新增 Nginx 配置示例（`docs/nginx-wildwalk.conf`），覆盖 WebSocket 转发。
- 新增可开关的 Admin Key 鉴权与全局 IP 限流，提升试玩服抗滥用能力。
- 新增 `scripts/smoke.sh`，支持上线前一键核心链路自检。
- 新增 `docs/api-integration-guide.md`，详细说明服务器部署、数据库设置与 API 接入步骤。
- 新增 `.dockerignore` 并补强 `.gitignore`，避免部署镜像误带运行数据。
- 修复开启 Admin Key 后的浏览器接入链路（CORS + Demo 页面可填写管理 Key）。
- Docker 镜像切换为更稳的 `node:20-bookworm-slim`，降低 `better-sqlite3` 构建失败风险。
- 新增 Docker Compose 健康检查，便于服务器上快速确认容器是否真正可用。
- 新增稳定性快照文档，固化当前可试玩版本的提交号、端口、健康检查与验收基线。
- Demo 回合改为“自由文本行动输入”模式：支持第一行动与裁定后第二行动（均可由 AI 裁定解析）。
- 新增 AI Phase 路点环境播报：按路线 Waypoint 自动注入海拔、地形、能见度与天气描述。
- 新增装备耦合基础规则：负重/冲锋衣/地图/单反/电源对体力、保温、压力、电量与信号产生影响。
- 扩展三条路线的示例路点数量，提升回合长度与测试可玩性。

### 已知风险与待改进

- 尚未接入真实天气/海拔 API，当前仅设计层定义。
- 尚未建立客户端与后端代码骨架。
- 私聊博弈和事件可见性规则仍需细化。

### 当前验证结果

- ✅ 文档结构完整可读
- ✅ 开发规则可执行
- ✅ 已有代码级自动化测试（规则引擎 4 条断言）
- ✅ 已有接口级测试（健康检查、回合结算、错误请求）
- ✅ 已验证同 `seed + round` 的事件结果可复现
- ✅ 已完成一次可部署版本稳定性快照（`docs/stability-snapshot-2026-04-28.md`）

### 下一步建议（优先级）

1. P0：按稳定性快照基线继续迭代 Demo，并确保每次改动后跑回归命令
2. P0：建立客户端最小回合 UI（行动 + 聊天 + 结果）
3. P1：接入 1 条真实路线数据（京都大文字山）
4. P1：增加固定种子回放测试
