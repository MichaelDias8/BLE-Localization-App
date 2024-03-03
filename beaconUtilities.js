//BEACON UUIDS & COORDINATES
export const BEACON_1_UUID = 'f4c06066-434e-42d2-8534-66f7c4fa7647'
export const BEACON_2_UUID = '5bfd3d57-6491-49ee-8e83-cc7eff678d6f'
export const BEACON_3_UUID = 'c3fdbc17-3473-4ea3-9b1b-875a0d57737f'
export const beaconCoords = [
  [0, 0, 0],            // Beacon 1  
  [2.28, 1.42, 0],      // Beacon 2 
  [0.20, 6.10, 0]       // Beacon 3
];

export const beaconAdvertisingFrequency = 333; // in milliseconds

// EMPIRICALLY DERIVED VALUES
export const beaconVariances = {
  [BEACON_1_UUID]: 2.4, //
  [BEACON_2_UUID]: 2.5, //
  [BEACON_3_UUID]: 2.4  //
}
const PATHLOSS = 3;
const RSSISAT1M = {
  [BEACON_1_UUID]: -55, //54.685
  [BEACON_2_UUID]: -55, //54.983
  [BEACON_3_UUID]: -55  //55.092
}

// HELPERS
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