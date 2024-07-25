import KalmanFilter from 'kalmanjs';
import { KalmanFilter as KF } from 'kalman-filter';
import { calculatePosition } from '../positioning/positioningUtilities';
import { beaconVariance, beaconUUIDs, beaconAdvFreq } from "../beacons/beaconUtilities";
import { ConstPosKFOptions, ConstPosKFInitCov, processNoise, KFFrequency } from './kalmanFilterSettings';


// Module-level variables to store the 2D Kalman Filter and 1D Kalman Filters
let kf2D = null;

let KFs1D = {};
beaconUUIDs.forEach((uuid) => { KFs1D[uuid] = null; });


export const updateKFWithBLE = (filteredDistances, beaconCoords, setMeasuredPosition, setCorrectedPosition, setUserCoordinates) => {
  const startTime = performance.now();
  if (kf2D) {
    // PREDICT
    let predicted = kf2D.predict({ previousCorrected: kf2D.state });

    // OBSERVE
    var observation = calculatePosition(beaconCoords, filteredDistances);
    if (!observation) return;

    setMeasuredPosition(observation);

    observation = [[observation[0]], [observation[1]]];

    // CORRECT
    const corrected = kf2D.correct({ predicted, observation });

    setCorrectedPosition([corrected.mean[0][0], corrected.mean[1][0]]);

    // Update states
    setUserCoordinates([corrected.mean[0][0], corrected.mean[1][0]]);
    console.log(`BLE KF Computed in ${(performance.now() - startTime).toFixed(0)}ms`);
  } 
  // Initialize the KF if at least 3 beacons are online
  else if (Object.keys(filteredDistances).length >= 3) {
    // Get measured position
    const initialPosition = calculatePosition(beaconCoords, filteredDistances);
    if (!initialPosition) return;

    // Create the KF object
    initializeKF2D(initialPosition);

    // Update state
    setUserCoordinates(initialPosition);
  }
};

export const filterDistance = (id, beaconDistance, filteredDistance, beaconLastAdvTime) => {
  if (typeof filteredDistance === 'undefined') {
    filteredDistance = beaconDistance;
  }

  if (!KFs1D[id] && beaconDistance !== 0) {
    // If KF is not initialized, initialize it
    KFs1D[id] = new KalmanFilter({ R: processNoise, Q: beaconVariance, x: beaconDistance });
    return beaconDistance; // Return the initial distance as the filtered distance
  } else {
    const startTime = performance.now();
    // If KF is initialized, filter the distance 
    // Update measurement noise to trust lower distances more and higher distances less
    let measurementDifference = beaconDistance - filteredDistance;
    let measurementNoise = (measurementDifference > 0) ?
      ((0.8 * beaconVariance) * Math.log10(measurementDifference + 1)) + 1
      :
      1 / ((beaconVariance * -measurementDifference) + 1);

    if (beaconDistance > 5) {
      measurementNoise += (beaconDistance - 5);
    }
    KFs1D[id].setMeasurementNoise(measurementNoise);

    // Update the process noise value based on the time since the last advertisement
    KFs1D[id].setProcessNoise(processNoise * (performance.now() - beaconLastAdvTime) / beaconAdvFreq);

    // Compute the filtered position and update the state
    const computedPosition = KFs1D[id].filter(beaconDistance);

    // Check if Computed Position is NaN
    if (isNaN(computedPosition)) {
      console.log('KF Computed NaN');
      return undefined; // Explicitly return undefined
    }

    return computedPosition;
  }
};

const initializeKF2D = (initialPosition) => {
  ConstPosKFOptions.dynamic.init.mean = [[initialPosition[0]], [initialPosition[1]]];
  ConstPosKFOptions.dynamic.init.covariance = ConstPosKFInitCov;
  kf2D = new KF(ConstPosKFOptions);
};