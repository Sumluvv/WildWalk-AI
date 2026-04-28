import { createSeededRandom } from "./random.js";

const PUBLIC_EVENT_POOL = [
  { id: "trail-sign", title: "发现路标", effect: "方向辨识更稳定" },
  { id: "animal-trace", title: "发现野生动物踪迹", effect: "队伍警惕性提升" },
  { id: "light-rain-stop", title: "短暂雨停", effect: "行动压力略有缓解" }
];

const PRIVATE_EVENT_POOL = [
  { id: "hidden-water", title: "你发现隐蔽补水点", effect: "仅你知道的补给机会" },
  { id: "strange-footstep", title: "你听到可疑脚步", effect: "仅你收到风险提醒" },
  { id: "shortcut-mark", title: "你发现疑似近路标记", effect: "仅你知道的路线信息" }
];

function pickOne(arr, random) {
  const idx = Math.floor(random() * arr.length);
  return arr[idx];
}

export function generateRoundEvents({ seed = 1, round = 1, players = [] } = {}) {
  const random = createSeededRandom(seed + round * 9973);
  const events = [];

  if (random() < 0.55) {
    events.push({
      visibility: "public",
      ...pickOne(PUBLIC_EVENT_POOL, random)
    });
  }

  if (players.length > 0 && random() < 0.45) {
    const target = players[Math.floor(random() * players.length)];
    events.push({
      visibility: "private",
      targetPlayerId: target.id,
      ...pickOne(PRIVATE_EVENT_POOL, random)
    });
  }

  return events;
}
