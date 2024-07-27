// 1D Kalman Filter variables
export const processNoise = 0.5;      // Process noise variance for distance
export const beaconVariance = 2;      // Measurement Variance of the BLE distance measurements

// 2D Kalman Filter variables
export const dtBLE = 0.5;             // Time step in seconds
export const dtAPI = 0.2;             // Time step in seconds

export const BLEVariance = 4;         // Measurement Variance of the BLE observations
export const APIVariance = 4;         // Measurement Variance of the API observations
const velocityVariance = 1;           // Process noise variance for velocity 

// MODELS
export var constVelKFOptions = {
  dynamic: {
    dimension: 4,
    transition: [
      [1, 0, dtBLE, 0],
      [0, 1, 0, dtBLE],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
    covariance: getCovarianceMatrix(dtBLE),
  },
  observation: {
    dimension: 2,
    stateProjection: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
    ],
    covariance: [
      [APIVariance, 0],
      [0, APIVariance],
    ]
  }
};

// INITIAL COVARIANCES
const huge = 100;
export const constPosKFInitCov = [
  [huge, 0],
  [0, huge]
];
export const constVelKFInitCov = [
  [huge, 0, 0, 0],
  [0, huge, 0, 0],
  [0, 0, huge, 0],
  [0, 0, 0, huge]
];

// HELPERS
export function getCovarianceMatrix(deltaTime) {
  const dt4_4 = (deltaTime ** 4) / 4;
  const dt3_2 = (deltaTime ** 3) / 2;
  const dt2 = deltaTime ** 2;

  return [
    [dt4_4 * velocityVariance, dt3_2 * velocityVariance, 0, 0],
    [dt3_2 * velocityVariance, dt2 * velocityVariance, 0, 0],
    [0, 0, dt4_4 * velocityVariance, dt3_2 * velocityVariance],
    [0, 0, dt3_2 * velocityVariance, dt2 * velocityVariance]
  ];
}