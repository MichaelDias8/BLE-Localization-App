// Emprically determined constants for the RSSI at 1 meter and the path loss exponent
const RSSIAT1M = -63;
const PATHLOSS = 2.3;
export const BEACON_1_ID = '0B:33:30:31:E8:CB'
export const BEACON_2_ID = '29:28:FA:96:0C:2B'
export const BEACON_3_ID = '28:77:CB:05:EB:97'
export const beaconCoords = [
  [0, 0, 0],       // Beacon 1  
  [6.37, 1.26, 0], // Beacon 2 
  [4.42, 5.37, 0]  // Beacon 3
];

// Function to convert the RSSI values to distances
export const rssiToDistance = (BeaconRSSIVals) => {
  // If the input is a single value, return the distance
  if (typeof BeaconRSSIVals !== 'object') {
    return Math.pow(10, (RSSIAT1M - BeaconRSSIVals) / (10 * PATHLOSS));
  }
  // Convert RSSI values from the object array to distances
  //log output
  return Object.values(BeaconRSSIVals).map(rssi => Math.pow(10, (RSSIAT1M - rssi) / (10 * PATHLOSS)));
}