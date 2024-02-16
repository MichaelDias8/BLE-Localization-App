const dt = 0.5;
const huge = 1e8;
const accelerationVariance = 0.1;   // acceleration variance
const velocityVariance = 0.1;   // position variance
const measurementVariance = 0.1; // measurement variance

// 2D Constant velocity model discrete noise 
export const ConstantVelocityDiscrete2DKFilterOptions = {
  dynamic: {
    init: {
      mean: [5, 0, 5, 0], // start with position x=5, y=5, velocity vx=0, vy=0
      covariance: [huge, huge, huge, huge],
    },
    dimension: 4,
    transition: [
      [1, dt, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, dt],
      [0, 0, 0, 1],
    ],
    covariance: scalarMultiply2DArray([
      [dt**2, dt, 0, 0],
      [dt, 1, 0, 0],
      [0, 0, dt**2, dt],
      [0, 0, dt, 1],
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

export const ConstantVelocityContinuous2DKFilterOptions = 
ConstantVelocityDiscrete2DKFilterOptions.dynamic.covariance = scalarMultiply2DArray([
  [(dt**3)/3, (dt**2)/2, 0, 0],
  [(dt**2)/2, dt, 0, 0],
  [0, 0, (dt**3)/3, (dt**2)/2],
  [0, 0, (dt**2)/2, dt],
], velocityVariance);

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

// 3D constant acceleration model
export const ConstantAcceleration3DKFilterOptions = {
	dynamic: {
    init: {
      mean: [1, 1, 0, 0, 0, 0, 0, 0, 0], // start with position x=1, y=1, z=0, velocity vx=0, vy=0, vz=0, acceleration ax=0, ay=0, az=0
      covariance: [huge, huge, huge, huge, huge, huge, huge, huge, huge],
    },
    dimension: 6,
    transition: [
      [1, 0, 0, dt, 0, 0, 0.5*dt**2, 0, 0],
      [0, 1, 0, 0, dt, 0, 0, 0.5*dt**2, 0],
      [0, 0, 1, 0, 0, dt, 0, 0, 0.5*dt**2],
      [0, 0, 0, 1, 0, 0, dt, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, dt, 0],
      [0, 0, 0, 0, 0, 1, 0, 0, dt],
      [0, 0, 0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 1],
    ],
		covariance: scalarMultiply2DArray([
      [dt**4/4, dt**3/2, dt**2/2, 0, 0, 0, 0, 0, 0],
      [dt**3/2, dt**2, dt, 0, 0, 0, 0, 0, 0],
      [dt**2/2, dt, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, dt**4/4, dt**3/2, dt**2/2, 0, 0, 0],
      [0, 0, 0, dt**3/2, dt**2, dt, 0, 0, 0],
      [0, 0, 0, dt**2/2, dt, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, dt**4/4, dt**3/2, dt**2/2],
      [0, 0, 0, 0, 0, 0, dt**3/2, dt**2, dt],
      [0, 0, 0, 0, 0, 0, dt**2/2, dt, 1],
    ], accelerationVariance),
	},
  observation: {
		dimension: 3,
	}
};

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

