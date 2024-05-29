import { Quaternion, Matrix4, Vector3, Euler } from 'three';

const magneticDeclination = 8.88; // Magnetic declination in degrees wr for Western University, London, Ontario

// #region Utility functions
const crossProduct = (v1, v2) => {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];
};

// Normalize a vector using three.js
const normalizeVector = (vector) => {
  const threeVector = new Vector3(vector[0], vector[1], vector[2]);
  threeVector.normalize();
  // Return the normalized vector as an array
  return [threeVector.x, threeVector.y, threeVector.z];
};

const normalizeVector2D = (vector) => {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  // Prevent division by zero
  if (magnitude === 0) {
    return {x: 0, y: 0};
  }
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude
  };
};

const vectorMagnitude = (vector) => {
  return vector.z ? 
  Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z) : 
  Math.sqrt(vector.x * vector.x + vector.y * vector.y);
};

// Convert rotation matrix to quaternion using three.js
const vectorsToQuaternion = (north, east, down) => {
  const rotationMatrix4 = new Matrix4();
  rotationMatrix4.set(
    north[0], east[0], -down[0], 0,
    north[2], east[2], -down[2], 0,
    north[1], east[1], -down[1], 0,
    0, 0, 0, 1
  );
  const quaternion = new Quaternion().setFromRotationMatrix(rotationMatrix4);
  return quaternion;
};

// Utility function to create a rotation matrix around the Z-axis
const createRotationMatrixZ = (angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
};

// Utility function to apply a rotation matrix to a vector
const applyMatrixToVector = (matrix, vector) => {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  ];
};

const invertYaw = (quaternion) => {
  const euler = new Euler().setFromQuaternion(quaternion);
  euler.z = -euler.z; // Invert the yaw component
  const invertedQuaternion = new Quaternion().setFromEuler(euler);
  return invertedQuaternion;
};
// #endregion

// Computes the north, east, and down directions given accelerometer and magnetometer readings
export const computeRotationWithMag = (accelerometerReading, magnetometerReading) => {
  // Compute linear acceleration based on the x and y magnetometer readings magnitudes
  var linearAcceleration = Math.sqrt((0.98 - vectorMagnitude(accelerometerReading))**2);

  // If linear acceleration > 1, then the device is moving too fast for accurate direction calculation Return.
  if (linearAcceleration > 1) {
    return { quaternion: null, dir2D: null, linearAcceleration };
  }

  // Normalize the accelerometer reading to compute down
  var down = normalizeVector([-accelerometerReading.x, -accelerometerReading.y, -accelerometerReading.z]);
  
  // Get the normalized magnetometer reading
  const magnetometerVector = normalizeVector([magnetometerReading.x, magnetometerReading.y, magnetometerReading.z]);
  
  // Convert magnetic declination from degrees to radians
  const magneticDeclinationRadians = magneticDeclination * (Math.PI / 180);

  // Create a rotation matrix for the magnetic declination
  const declinationRotationMatrix = createRotationMatrixZ(magneticDeclinationRadians);

  // Adjust magnetometer vector for magnetic declination
  const adjustedMagnetometerVector = applyMatrixToVector(declinationRotationMatrix, magnetometerVector);

  // Compute east
  var east = crossProduct(down, adjustedMagnetometerVector);
  east = normalizeVector(east);
  
  // Compute north
  var north = crossProduct(east, down);
  north = normalizeVector(north);

  // Compute the quaternion from the north, east, and down vectors
  var quaternion = vectorsToQuaternion(north, east, down);

  // Invert the yaw
  quaternion = invertYaw(quaternion);

  // Convert quaternion to Euler angles to check the pitch
  const euler = new Euler().setFromQuaternion(quaternion);
  const pitch = euler.x; // Rotation around X-axis in radians

  // Check if the pitch indicates a tilt of more than 60 degrees from the horizontal
  const tiltThresholdRadians = 60 * (Math.PI / 180); // Convert 60 degrees to radians
  var dir2D;
  var forward;
  if (Math.abs(pitch) > tiltThresholdRadians) {
    // Use a different forward vector if tilted more than 60 degrees
    forward = new Vector3(1, 0, 0);
    forward.applyQuaternion(quaternion);
    dir2D = normalizeVector2D({x: -forward.x, y: -forward.z});
  } else {
    // Calculate forward direction based on quaternion
    forward = new Vector3(0, 1, 0);
    forward.applyQuaternion(quaternion);
    dir2D = normalizeVector2D({x: -forward.y, y: -forward.x});
  }

  quaternion = {x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w}; 

  return { quaternion, dir2D, linearAcceleration };
};

// @param quaternion - previous quaternion - { x: 0, y: 0, z: 0, w: 0 }, gyroReading - { x: 0, y: 0, z: 0 }
export const computeRotationWithGyro = (quaternion, gyroReading, dt) => {
  // Convert dt from milliseconds to seconds
  const dtSeconds = dt / 1000.0;

  // Gyro reading in radians per second
  const omegaX = gyroReading.x;
  const omegaY = gyroReading.y;
  const omegaZ = gyroReading.z;

  // Current quaternion
  const q0 = quaternion.w;
  const q1 = quaternion.x;
  const q2 = quaternion.z;
  const q3 = quaternion.y;

  // Quaternion derivative based on angular velocity
  const dq0 = 0.5 * (-q1 * omegaX - q2 * omegaY - q3 * omegaZ);
  const dq1 = 0.5 * (q0 * omegaX + q2 * omegaZ - q3 * omegaY);
  const dq2 = 0.5 * (q0 * omegaY - q1 * omegaZ + q3 * omegaX);
  const dq3 = 0.5 * (q0 * omegaZ + q1 * omegaY - q2 * omegaX);

  // Update quaternion using Euler integration
  const q0_updated = q0 + dq0 * dtSeconds;
  const q1_updated = q1 + dq1 * dtSeconds;
  const q2_updated = q2 + dq2 * dtSeconds;
  const q3_updated = q3 + dq3 * dtSeconds;

  // Normalize the updated quaternion to prevent drift
  const norm = Math.sqrt(q0_updated * q0_updated + q1_updated * q1_updated + q2_updated * q2_updated + q3_updated * q3_updated);
  const normalizedQuaternion = {
    w: q0_updated / norm,
    x: q1_updated / norm,
    z: q2_updated / norm,
    y: q3_updated / norm,
  };

  return normalizedQuaternion;
};

