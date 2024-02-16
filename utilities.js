// Emprically determined constants for the RSSI at 1 meter and the path loss exponent
const RSSIAT1M = -59;
const PATHLOSS = 2;

// Function to get the RSSI values from the beacons
const GetRSSIVals = () => {
  return [-68, -71, -75];
}
// Function to convert the RSSI values to distances
export const getBeaconDistances = () => {
  // Get the RSSI value from the beacon
  const BeaconRSSIVals = GetRSSIVals();
  // Convert RSSI to distance
  //return BeaconRSSIVals.map((rssi) => {Math.pow(10, (rssi - RSSIAT1M) / 10 * PATHLOSS)});
  return [0.9, 0.9, 0.9];
}

// Function to reduce the array of 3D positions to a single 2 dimension position
export const reduceToTwoDimensions = (positions) => {
  // Return the x and y coordinates of the position that has a positive z value
  if(positions[0][2] > 0) {
    return {
      x: positions[0][0],
      y: positions[0][1]
    };
  } else {
    return {
      x: positions[1][0],
      y: positions[1][1]
    };
  }
}