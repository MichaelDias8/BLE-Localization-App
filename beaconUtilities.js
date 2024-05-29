export const beaconUUIDs = [ "275792", "275848", "275849", "275851", "275854", "275857", "275871", "275873" ];
export const initBeaconCoords = {
  "275792": [-81.31245, 43.01421, 0],
  "275848": [-81.31245, 43.01422, 0],
  "275849": [-81.31245, 43.01423, 0],
  "275851": [-81.31245, 43.01424, 0],
  "275854": [-81.31245, 43.01425, 0],
  "275857": [-81.31245, 43.01426, 0],
  "275871": [-81.31245, 43.01427, 0],
  "275873": [-81.31245, 43.01428, 0],
};

// EMPIRICALLY DERIVED VALUES
export const beaconVariance = 2;
export const beaconAdvFreq = 200;     // Beacon advertising frequency in ms
const RSSISAT1M = -59; 
const PATHLOSS = 2.2;        


export const rssiToDistance = (BeaconRSSIVals) => {
  // If the input is a single value, return the distance
  if (typeof BeaconRSSIVals !== 'object') {
    return Math.pow(10, (RSSISAT1M - BeaconRSSIVals) / (10 * PATHLOSS));
  } else if (BeaconRSSIVals.length) {
    // If the input is an array, convert each value
    return BeaconRSSIVals.map((rssi) => {
      return Math.pow(10, (RSSISAT1M - rssi) / (10 * PATHLOSS));
    });
  }else {
    // If the input is an object, iterate over it and convert each value
    let distances = [];
    for (let beacon in BeaconRSSIVals) {
      let rssi = BeaconRSSIVals[beacon];
      // convert rssi to distance and store in distances object
      distances.push(Math.pow(10, (RSSISAT1M- rssi) / (10 * PATHLOSS)));
    }
    return distances;
  }
};