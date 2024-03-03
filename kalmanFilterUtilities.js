const dt = 0.5;
const huge = 100;
const measurementVariance = 4;
const velocityVariance = dt**2*measurementVariance;

// MODELS

// 2D Constant position model discrete noise
export const ConstantPosition2DKFilterOptions = {
  dynamic: {
    dimension: 2,
    transition: [
      [1, 0],
      [0, 1],
    ],
    covariance: [
      [0.01, 0], // Small values indicating low process noise
      [0, 0.01],
    ],

  },
  observation: {
    dimension: 2,
    stateProjection: [
      [1, 0],
      [0, 1],
    ],
    covariance: [
      [measurementVariance, 0], 
      [0, measurementVariance]
    ],
  }
};

// 2D Constant velocity model discrete noise  
export var ConstantVelocity2DKFilterOptions = {
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
    covariance: [measurementVariance, measurementVariance],
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

// INITIAL COVARIANCE
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