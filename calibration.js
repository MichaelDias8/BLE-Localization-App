import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function saveAndShareCalibrationData() {
  const fileName = 'calibrationData.json';
  const fileInfo = `${FileSystem.documentDirectory}${fileName}`;

  try {
    const dataString = JSON.stringify(calibrationData);
    await FileSystem.writeAsStringAsync(fileInfo, dataString, { encoding: FileSystem.EncodingType.UTF8 });
    console.log(`Calibration data saved to ${fileInfo}`);

    // Check if sharing is available
    if (!(await Sharing.isAvailableAsync())) {
      console.error("Sharing is not available on this device");
      return;
    }

    // Share the file
    await Sharing.shareAsync(fileInfo);
  } catch (error) {
    console.error('Failed to save or share calibration data:', error);
  }
}

export const calibrateMagnetometer = (magnetometerReadings) => {
  // Center the data points
  const centeredDataPoints = centerDataPoints(magnetometerReadings);

  // Estimate the scaling factors
  const { scaleX, scaleY, scaleZ } = estimateScalingFactors(centeredDataPoints);

  return { scaleX, scaleY, scaleZ };
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
