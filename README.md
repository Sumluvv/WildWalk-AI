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

### 回合输出（RoundResult）

- `numericDelta`: 各玩家数值变化
- `events`: 随机事件与可见性（公开/私有）
- `stateSnapshot`: 新的队伍状态快照
- `aiNarration`: AI 叙事文本（只解释，不改写数值）

### HTTP API（已实现 MVP）

- `GET /healthz`
  - 用途：健康检查
  - 返回：`{ ok: true, service: "wildwalk-ai-backend" }`
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

## 5. 测试与验证方法（MVP 目标）

- 单元测试：数值计算规则（天气、坡度、负重、保暖）
- 集成测试：完整一回合流程（输入 -> 计算 -> 裁定 -> 输出）
- 回放测试：固定 `seed` 多次执行，确保结果可复现

### 本地运行与测试命令

- 启动服务：`npm run start`
- 运行测试：`npm test`

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

### 下一步建议（优先级）

1. P0：建立后端最小规则引擎（单回合计算）
2. P0：建立客户端最小回合 UI（行动 + 聊天 + 结果）
3. P1：接入 1 条真实路线数据（京都大文字山）
4. P1：增加固定种子回放测试
