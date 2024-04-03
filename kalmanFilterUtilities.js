// 1D Kalman Filter variables
export const processNoise = 0.5;

// 2D Kalman Filter variables
const dt = 0.5;
export const beaconMeasurementVariance = 4;
export const IMUMeasurementVariance = 20;
const processNoise2D = 1;
const velocityVariance = dt**2*beaconMeasurementVariance;

// Beacon models
// 2D Constant position model

export const ConstantPosition2DKFOptions = {
  dynamic: {
    init: {
      mean: [0, 0],
      covariance: [huge, huge],
    },
    transition: [
      [1, 0],
      [0, 1],
    ],
    covariance: [processNoise2D * dt, processNoise2D * dt]
  },
  observation: {
    dimension: 2, 
    stateProjection: [
      [1, 0],
      [0, 1],
    ],
    covariance: [beaconMeasurementVariance, beaconMeasurementVariance]
  },
};

// 2D Constant velocity model 
export var ConstantVelocity2DKFOptions = {
  dynamic: {
    dimension: 4,
    transition: [
      [1, dt, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, dt],
      [0, 0, 0, 1],
    ],
    covariance: scalarMultiply2DArray([
      [dt**4/4, dt**3/2, 0, 0],
      [dt**3/2, dt**2, 0, 0],
      [0, 0, dt**4/4, dt**3/2],
      [0, 0, dt**3/2, dt**2],
    ], velocityVariance),
  },
  observation: {
    dimension: 2,
    stateProjection: [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
    ],
    covariance: [beaconMeasurementVariance, beaconMeasurementVariance],
  }
};

// 3D Constant velocity model
export const ConstantVelocity3DKFilterOptions = {
	dynamic: {
    init: {
      mean: [1, 0, 1, 0, 0, 0], // start with position x=1, y=0, z=1, velocity x=0, y=0, z=0
      covariance: [huge, huge, huge, huge, huge, huge],
    },
    dimension: 6,
    transition: [
      [1, 0, 0, dt, 0, 0],
      [0, 1, 0, 0, dt, 0],
      [0, 0, 1, 0, 0, dt],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
    ],
		covariance: [1, 1, 1, 0.01, 0.01, 0.01]
	},
  observation: {
		dimension: 3,
	}
};

// 3D INS Model
export const constantVelocity3DINS = {};

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

// INITIAL COVARIANCES
const huge = 100;
export const ConstantPositionInitialCovariance = [
  [huge, 0],
  [0, huge]
];

export const ConstantVelocityInitialCovariance = [
  [huge, 0, 0, 0],
  [0, huge, 0, 0],
  [0, 0, huge, 0],
  [0, 0, 0, huge]
];