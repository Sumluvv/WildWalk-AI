export const WEATHER_COEFFICIENTS = {
  clear: {
    staminaMul: 1.0,
    waterMul: 1.1,
    hungerMul: 1.0,
    coldMul: 0.9,
    stressMul: 0.9
  },
  cloudy: {
    staminaMul: 1.05,
    waterMul: 1.0,
    hungerMul: 1.0,
    coldMul: 1.0,
    stressMul: 1.0
  },
  harsh: {
    staminaMul: 1.2,
    waterMul: 1.15,
    hungerMul: 1.05,
    coldMul: 1.35,
    stressMul: 1.25
  }
};

export const SLOPE_COEFFICIENTS = {
  flat: {
    staminaMul: 1.0,
    waterMul: 1.0,
    hungerMul: 1.0,
    coldMul: 1.0,
    stressMul: 0.95
  },
  rolling: {
    staminaMul: 1.15,
    waterMul: 1.1,
    hungerMul: 1.05,
    coldMul: 1.0,
    stressMul: 1.05
  },
  steep: {
    staminaMul: 1.35,
    waterMul: 1.25,
    hungerMul: 1.1,
    coldMul: 1.05,
    stressMul: 1.15
  }
};

export const INITIAL_STATS = {
  stamina: 80,
  water: 75,
  hunger: 70,
  cold: 85,
  stress: 20
};

export const STAT_MIN = 0;
export const STAT_MAX = 100;
