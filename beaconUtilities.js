// UUIDS 
export const BEACON_1_UUID = 'f4c06066-434e-42d2-8534-66f7c4fa7647'
export const BEACON_2_UUID = 'c3fdbc17-3473-4ea3-9b1b-875a0d57737f'
export const BEACON_3_UUID = '5bfd3d57-6491-49ee-8e83-cc7eff678d6f'
// Beacon UUIDs
export const beaconUUIDs = [BEACON_1_UUID, BEACON_2_UUID, BEACON_3_UUID];
export const beaconIds = [BEACON_1_UUID, BEACON_2_UUID, BEACON_3_UUID];
// EMPIRICALLY DERIVED VALUES
export const beaconVariances = {
  [BEACON_1_UUID]: 2, //
  [BEACON_2_UUID]: 2, //
  [BEACON_3_UUID]: 2  //
}
const PATHLOSS = 2.2;
const RSSISAT1M = {
  [BEACON_1_UUID]: -56, 
  [BEACON_2_UUID]: -56, 
  [BEACON_3_UUID]: -56 
}
// COORDINATES
// Bottom Wall y = 0
// Left Wall x = 0
// Right Wall x = 7.01
export const beaconCoords = [
  [0.00, 5.00, 0.00],     // Beacon 1  
  [6.88, 5.00, 0.00],     // Beacon 2  
  [4.42, 0.30, 0.00],     // Beacon 3
];

// Beacon advertising frequency in ms
export const beaconAdvertisingFrequency = 170; 

// Function to convert RSSI to distance
export const rssiToDistance = (BeaconRSSIVals, beacon_uuid) => {
  // If the input is a single value, return the distance
  if (typeof BeaconRSSIVals !== 'object') {
    return Math.pow(10, (RSSISAT1M[beacon_uuid] - BeaconRSSIVals) / (10 * PATHLOSS)); // FIX TO USE BEACON SPECIFIC RSSI
  } else if (BeaconRSSIVals.length) {
    // If the input is an array, convert each value
    return BeaconRSSIVals.map((rssi) => {
      return Math.pow(10, (RSSISAT1M[beacon_uuid] - rssi) / (10 * PATHLOSS));
    });
  }else {
    // If the input is an object, iterate over it and convert each value
    let distances = [];
    for (let beacon in BeaconRSSIVals) {
      let rssi = BeaconRSSIVals[beacon];
      // convert rssi to distance and store in distances object
      distances.push(Math.pow(10, (RSSISAT1M[beacon] - rssi) / (10 * PATHLOSS)));
    }
    return distances;
  }
};

export const colors = ['blue', 'green', 'magenta', 'yellow', 'purple', 'orange', 'pink', 'brown', 'cyan'];