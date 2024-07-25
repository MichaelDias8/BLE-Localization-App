// 1D Kalman Filter variables
export const processNoise = 0.5;  

// 2D Kalman Filter variables
export const KFFrequency = 0.5;                             // Time step in seconds
const processNoise2D = 1;                                   // Process noise for the 2D Kalman Filter

const BLEPosVariance = 4;                                   // Variance of the BLE position measurements
const APIPosVariance = 4;                                   // Variance of the API position measurements

const BLEVelVariance = KFFrequency ** 2 * BLEPosVariance;   // Variance of the BLE velocity measurements
const APIVelVariance = KFFrequency ** 2 * APIPosVariance;   // Variance of the API velocity measurements

// MODELS
export const ConstPosKFOptions = {
  dynamic: {
    init: {
      mean: [0, 0],
      covariance: [huge, huge],
    },
    transition: [
      [1, 0],
      [0, 1],
    ],
    covariance: [processNoise2D * KFFrequency, processNoise2D * KFFrequency]
  },
  observation: {
    dimension: 2,
    stateProjection: [
      [1, 0],
      [0, 1],
    ],
    covariance: [ APIPosVariance, APIPosVariance]
  }
};

// INITIAL COVARIANCES
const huge = 100;
export const ConstPosKFInitCov = [
  [huge, 0],
  [0, huge]
];
export const ConstVelKFInitCov = [
  [huge, 0, 0, 0],
  [0, huge, 0, 0],
  [0, 0, huge, 0],
  [0, 0, 0, huge]
];

// HELPERS
function scalarMultiply2DArray(matrix, scalar) {
  // Iterate through each row of the matrix
  for (let i = 0; i < matrix.length; i++) {
      // Iterate through each column in the current row
      for (let j = 0; j < matrix[i].length; j++) {
          // Multiply the current element by the scalar and update the element
          matrix[i][j] *= scalar;
      }
  }
  return matrix;
}