export const SCENARIOS = [
  {
    id: "kyoto-daimonji",
    name: "京都大文字山",
    difficulty: "Demo",
    durationMinutes: 30,
    altitudeRange: { min: 80, max: 466 },
    weatherProfile: "多云为主，偶有阵雨",
    recommendedPlayers: "2-4",
    tags: ["新手友好", "短局", "城市近郊"]
  },
  {
    id: "yakushima-traverse",
    name: "屋久岛纵走",
    difficulty: "Advanced",
    durationMinutes: 120,
    altitudeRange: { min: 120, max: 1936 },
    weatherProfile: "高降雨，湿冷变化快",
    recommendedPlayers: "3-4",
    tags: ["高湿度", "温控挑战", "补给管理"]
  },
  {
    id: "everest-base-camp",
    name: "珠峰大本营",
    difficulty: "Hardcore",
    durationMinutes: 240,
    altitudeRange: { min: 2800, max: 5364 },
    weatherProfile: "极寒低氧，风雪强",
    recommendedPlayers: "4",
    tags: ["高海拔", "缺氧", "硬核生存"]
  }
];

export const SCENARIO_DETAILS = {
  "kyoto-daimonji": {
    weatherDistribution: { clear: 50, cloudy: 40, harsh: 10 },
    strategyTips: [
      "前 10 回合优先稳步前进，避免过早消耗补给。",
      "遇到私有事件时建议公开，快速建立队友信任。"
    ],
    sampleWaypoints: [
      { name: "银阁寺入口", altitude: 90, terrain: "flat" },
      { name: "中段林道", altitude: 260, terrain: "rolling" },
      { name: "大文字火床", altitude: 466, terrain: "rolling" }
    ]
  },
  "yakushima-traverse": {
    weatherDistribution: { clear: 20, cloudy: 35, harsh: 45 },
    strategyTips: [
      "雨天回合优先保暖与补水，避免连续高强度移动。",
      "团队中至少 1 人持续执行装备检查行动。"
    ],
    sampleWaypoints: [
      { name: "淀川登山口", altitude: 1360, terrain: "rolling" },
      { name: "花之江河", altitude: 1640, terrain: "rolling" },
      { name: "宫之浦岳周边", altitude: 1936, terrain: "steep" }
    ]
  },
  "everest-base-camp": {
    weatherDistribution: { clear: 15, cloudy: 30, harsh: 55 },
    strategyTips: [
      "高海拔阶段必须控制节奏，避免多人同时执行高消耗行动。",
      "发现补给时优先共享，保持全队最低生存线。"
    ],
    sampleWaypoints: [
      { name: "卢卡拉", altitude: 2860, terrain: "rolling" },
      { name: "南池", altitude: 3440, terrain: "steep" },
      { name: "珠峰大本营", altitude: 5364, terrain: "steep" }
    ]
  }
};
