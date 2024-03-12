// Compute cross product of two vectors
const crossProduct = (v1, v2) => {
  return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
  ];
}

// Normalize a vector
const normalize = (v) => {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
}

// Computes the north, east, and down directions given accelerometer and magnetometer readings
export const computeDirections = (accelerometerReading, magnetometerReading) => {
  // Normalize the accelerometer reading to get the down direction
  const down = normalize([-accelerometerReading.x, -accelerometerReading.y, -accelerometerReading.z]);

  // Normalize the magnetometer reading
  const magnetometerVector = normalize([magnetometerReading.x, magnetometerReading.y, magnetometerReading.z]);

  // Compute east direction by taking the cross product of down and magnetometer vector
  const east = crossProduct(down, magnetometerVector);

  // Compute north direction by taking the cross product of east and down vectors
  const north = crossProduct(east, down);

  // Return normalized direction vectors
  return {
      down: down,
      east: normalize(east),
      north: normalize(north)
  };
}