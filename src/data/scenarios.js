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
      { name: "银阁寺入口", altitude: 90, terrain: "石阶", slope: "flat", weather: "cloudy", temperatureC: 16, visibility: "良好" },
      { name: "若王子神社分岔", altitude: 150, terrain: "林道", slope: "rolling", weather: "cloudy", temperatureC: 13, visibility: "一般" },
      { name: "中段杉林补水点", altitude: 230, terrain: "湿滑泥土", slope: "rolling", weather: "harsh", temperatureC: 8, visibility: "受雨雾影响" },
      { name: "风口观景台", altitude: 320, terrain: "碎石坡", slope: "steep", weather: "harsh", temperatureC: 4, visibility: "强风低能见" },
      { name: "大文字火床前缘", altitude: 410, terrain: "裸岩", slope: "steep", weather: "cloudy", temperatureC: 6, visibility: "中等" },
      { name: "大文字火床", altitude: 466, terrain: "山脊平台", slope: "rolling", weather: "clear", temperatureC: 7, visibility: "开阔" }
    ]
  },
  "yakushima-traverse": {
    weatherDistribution: { clear: 20, cloudy: 35, harsh: 45 },
    strategyTips: [
      "雨天回合优先保暖与补水，避免连续高强度移动。",
      "团队中至少 1 人持续执行装备检查行动。"
    ],
    sampleWaypoints: [
      { name: "淀川登山口", altitude: 1360, terrain: "苔藓木道", slope: "rolling", weather: "cloudy", temperatureC: 12, visibility: "潮湿雾气" },
      { name: "高盘岳路段", altitude: 1520, terrain: "岩根坡", slope: "rolling", weather: "harsh", temperatureC: 9, visibility: "雨幕遮挡" },
      { name: "花之江河", altitude: 1640, terrain: "泥泞草甸", slope: "flat", weather: "harsh", temperatureC: 7, visibility: "低" },
      { name: "黑味岳分岔", altitude: 1760, terrain: "连续台阶", slope: "steep", weather: "harsh", temperatureC: 5, visibility: "低" },
      { name: "宫之浦岳前脊", altitude: 1880, terrain: "裸露岩脊", slope: "steep", weather: "cloudy", temperatureC: 4, visibility: "中等" },
      { name: "宫之浦岳周边", altitude: 1936, terrain: "山顶平台", slope: "rolling", weather: "clear", temperatureC: 3, visibility: "开阔" }
    ]
  },
  "everest-base-camp": {
    weatherDistribution: { clear: 15, cloudy: 30, harsh: 55 },
    strategyTips: [
      "高海拔阶段必须控制节奏，避免多人同时执行高消耗行动。",
      "发现补给时优先共享，保持全队最低生存线。"
    ],
    sampleWaypoints: [
      { name: "卢卡拉", altitude: 2860, terrain: "石板路", slope: "rolling", weather: "cloudy", temperatureC: 5, visibility: "中等" },
      { name: "南池", altitude: 3440, terrain: "山谷碎石", slope: "steep", weather: "harsh", temperatureC: -2, visibility: "风雪间歇" },
      { name: "天波切", altitude: 3860, terrain: "风化土坡", slope: "steep", weather: "harsh", temperatureC: -6, visibility: "低" },
      { name: "丁波切", altitude: 4410, terrain: "冻土路段", slope: "rolling", weather: "harsh", temperatureC: -10, visibility: "低" },
      { name: "罗布切", altitude: 4910, terrain: "冰碛石海", slope: "steep", weather: "harsh", temperatureC: -14, visibility: "极低" },
      { name: "珠峰大本营", altitude: 5364, terrain: "冰碛营地", slope: "rolling", weather: "cloudy", temperatureC: -18, visibility: "短时改善" }
    ]
  }
};
