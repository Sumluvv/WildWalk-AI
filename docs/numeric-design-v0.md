# WildWalk AI 数值设计 v0

## 统一约定

- 1 回合 = 1 分钟
- 数值范围：`0 ~ 100`
- 心理压力越高越差，其他值越低越危险
- 所有计算结束后执行 `Clamp(0, 100)`

## 初始值与上下限

- `stamina`：初始 80，范围 0~100
- `water`：初始 75，范围 0~100
- `hunger`：初始 70，范围 0~100
- `cold`（保温值）：初始 85，范围 0~100
- `stress`：初始 20，范围 0~100

## 每回合核心公式（伪代码）

```text
staminaLoss = 1.2 * weather.staminaMul * slope.staminaMul
if water < 30: staminaLoss += 0.5
if hunger < 30: staminaLoss += 0.5
if cold < 30: staminaLoss += 0.8
stamina = Clamp(stamina - staminaLoss, 0, 100)

waterLoss = 1.0 * weather.waterMul * slope.waterMul
if stamina < 20: waterLoss += 0.3
water = Clamp(water - waterLoss, 0, 100)

hungerLoss = 0.7 * weather.hungerMul * slope.hungerMul
if stamina < 30: hungerLoss += 0.2
hunger = Clamp(hunger - hungerLoss, 0, 100)

coldLoss = 0.8 * weather.coldMul * slope.coldMul
if water < 20: coldLoss += 0.6
cold = Clamp(cold - coldLoss, 0, 100)

stressGain = 0.6 * weather.stressMul * slope.stressMul
if stamina < 30: stressGain += 0.6
if water < 30: stressGain += 0.4
if hunger < 30: stressGain += 0.3
if cold < 30: stressGain += 0.7
stress = Clamp(stress + stressGain, 0, 100)
```

## 系数表

### 天气系数

- 晴朗：`stamina 1.00` `water 1.10` `hunger 1.00` `cold 0.90` `stress 0.90`
- 多云：`stamina 1.05` `water 1.00` `hunger 1.00` `cold 1.00` `stress 1.00`
- 恶劣（风雨）：`stamina 1.20` `water 1.15` `hunger 1.05` `cold 1.35` `stress 1.25`

### 坡度系数

- 平缓：`stamina 1.00` `water 1.00` `hunger 1.00` `cold 1.00` `stress 0.95`
- 起伏：`stamina 1.15` `water 1.10` `hunger 1.05` `cold 1.00` `stress 1.05`
- 陡坡：`stamina 1.35` `water 1.25` `hunger 1.10` `cold 1.05` `stress 1.15`

## 新手路线（30 分钟）建议参数

- 回合数：30
- 地形：70% 平缓 + 30% 起伏（禁用陡坡）
- 天气：60% 晴朗 + 40% 多云（禁用恶劣）
- 轻事件：每 10 回合触发一次
- 补给：第 10 回合 `water +12`，第 20 回合 `hunger +10`

## 可直接转单测的断言

1. 任意回合计算后，五大数值都在 `0~100` 内。
2. 同初始状态下，恶劣+陡坡体力损耗 > 晴朗+平缓。
3. 同条件下，`water=20` 的体力损耗至少比 `water=50` 多 `0.5`。
4. 同条件下，`cold=20` 的压力增长至少比 `cold=50` 多 `0.7`。
5. 固定种子跑 30 回合，新手目标应达成：`stamina>=35` `water>=30` `hunger>=30` `cold>=40` `stress<=55`。
