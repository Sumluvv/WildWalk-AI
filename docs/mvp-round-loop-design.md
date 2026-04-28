# MVP 设计文档：单回合循环

## 目标

在移动端实现最小可玩的“1 回合闭环”：
环境播报 -> 玩家行动 -> 规则裁定 -> 结果叙事 -> 下一回合。

## 模块划分

1. `ScenarioModule`：提供当前路点环境数据（天气、海拔、地形）
2. `ActionModule`：接收玩家行动与聊天输入
3. `RuleEngine`：计算数值变化与随机事件
4. `NarrationModule`：将裁定结果转换为可读叙事
5. `StateStore`：保存回合前后状态快照

## 数据流

1. 客户端提交 `RoundInput`
2. 服务端 `RuleEngine` 计算 `RoundResult.numericDelta`
3. 事件引擎按可见性分发 `events`
4. AI 生成 `aiNarration`
5. 客户端渲染结果并进入下一回合

## 接口草案

- `POST /v1/round/resolve`
  - 输入：`RoundInput`
  - 输出：`RoundResult`

## 最小验收清单

1. 玩家可提交“前进/扎营/检查装备”三种行动
2. 服务端返回至少 4 类数值变化（体力、水分、失温、心理压力）
3. 每回合至少产出 1 段环境播报 + 1 段结果叙事
4. 支持固定 `seed` 重放并得到一致结果
