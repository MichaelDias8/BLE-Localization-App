import { Quaternion, Matrix4, Vector3 } from 'three';

export const calibrateMagnetometer = (magnetometerReadings) => {
  // Center the data points
  const centeredDataPoints = centerDataPoints(magnetometerReadings);

  // Estimate the scaling factors
  const { scaleX, scaleY, scaleZ } = estimateScalingFactors(centeredDataPoints);

  // Scale the spheroid to a sphere
  const scaledDataPoints = scaleSpheroidToSphere(centeredDataPoints, scaleX, scaleY, scaleZ);

  return scaledDataPoints;
}

function centerDataPoints(dataPoints) {
  // Calculate the average of each axis
  let avgX = 0, avgY = 0, avgZ = 0;
  dataPoints.forEach(point => {
      avgX += point.x;
      avgY += point.y;
      avgZ += point.z;
  });
  avgX /= dataPoints.length;
  avgY /= dataPoints.length;
  avgZ /= dataPoints.length;

  // Subtract the average from each axis to center the data
  return dataPoints.map(point => {
      return {
          x: point.x - avgX,
          y: point.y - avgY,
          z: point.z - avgZ
      };
  });
}

function estimateScalingFactors(dataPoints) {
  // Initialize min and max for each axis
  let maxX = 0, maxY = 0, maxZ = 0;

  // Find the max absolute value for each axis
  dataPoints.forEach(point => {
      maxX = Math.max(maxX, Math.abs(point.x));
      maxY = Math.max(maxY, Math.abs(point.y));
      maxZ = Math.max(maxZ, Math.abs(point.z));
  });

  // Assume the largest max value as the target radius for uniform scaling
  let targetRadius = Math.max(maxX, maxY, maxZ);

  // Calculate scaling factors to normalize the spheroid into a sphere
  let scaleX = targetRadius / maxX;
  let scaleY = targetRadius / maxY;
  let scaleZ = targetRadius / maxZ;

  return { scaleX, scaleY, scaleZ };
}

function scaleSpheroidToSphere(dataPoints, scaleX, scaleY, scaleZ) {
  // Scale each point in the array
  return dataPoints.map(point => {
      return {
          x: point.x * scaleX,
          y: point.y * scaleY,
          z: point.z * scaleZ
      };
  });
}

// Computes the north, east, and down directions given accelerometer and magnetometer readings
export const computeDirections = (accelerometerReading, magnetometerReading) => {
  // Normalize the accelerometer reading to compute down
  var down = normalizeVector([-accelerometerReading.x, -accelerometerReading.y, -accelerometerReading.z]);
  
  // Get the normalized magnetometer reading
  const magnetometerVector = normalizeVector([magnetometerReading.x, magnetometerReading.y, magnetometerReading.z]);
  
  // Compute east
  var east = crossProduct(down, magnetometerVector);
  east = normalizeVector(east);
  
  // Compute north
  var north = crossProduct(east, down);
  north = normalizeVector(north);
  
  const quaternion = vectorsToQuaternion(north, east, down); 

  north = {x: north[0], y: north[1], z: north[2]};
  east = {x: east[0], y: east[1], z: east[2]};
  down = {x: down[0], y: down[1], z: down[2]};
  return { north, east, down, quaternion };
} 

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
}

// Compute cross product of two vectors
const crossProduct = (v1, v2) => {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];
}

// Normalize a vector using three.js
const normalizeVector = (vector) => {
  const threeVector = new Vector3(vector[0], vector[1], vector[2]);
  threeVector.normalize();
  // Return the normalized vector as an array
  return [threeVector.x, threeVector.y, threeVector.z];
}