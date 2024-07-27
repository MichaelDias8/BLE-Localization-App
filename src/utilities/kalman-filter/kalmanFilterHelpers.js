import KalmanFilter from 'kalmanjs';
import { KalmanFilter as KF } from 'kalman-filter';
import { calculatePosition } from '../positioning/positioningUtilities';
import { beaconVariance, beaconUUIDs, beaconAdvFreq, rssiToDistance } from "../beacons/beaconUtilities";
import { constVelKFOptions, constVelKFInitCov, APIVariance, BLEVariance, processNoise, getCovarianceMatrix, dtAPI, dtBLE } from './kalmanFilterSettings';
import { point, lineString } from '@turf/helpers';
import { bearing as turfBearing, destination, nearestPointOnLine } from '@turf/turf';
import { rawNodes } from '../nav/navigationUtilities';

// Module-level variables to store the 2D Kalman Filter and 1D Kalman Filters
let kf2D = null;
let KFs1D = {};
beaconUUIDs.forEach((uuid) => { KFs1D[uuid] = null; });

export const updateKFWithBLE = (filteredRSSIs, beaconCoords, userFloor, userDirection, userCoordinates, setUserCoordinates, setMeasuredPosition, setCorrectedPosition, nextNode, setNextNode) => {
  const startTime = performance.now();
  // Get distances from RSSIs
  const distances = {};
  Object.entries(filteredRSSIs).forEach(([id, rssi]) => { distances[id] = rssiToDistance(rssi); });

  if (kf2D) {
    // PREDICT
    kf2D.dynamic.transition = getCovarianceMatrix(dtBLE);
    let predicted = kf2D.predict({ previousCorrected: kf2D.state });

    // OBSERVE
    var observation = calculatePosition(beaconCoords, distances, userDirection, userCoordinates, userFloor);
    if (!observation) return;

    setMeasuredPosition(observation);

    observation = [[observation[0]], [observation[1]]];

    // CORRECT
    kf2D.observation.covariance = [[BLEVariance, 0], [0, BLEVariance]];

    const corrected = kf2D.correct({ predicted, observation });

    setCorrectedPosition([corrected.mean[0][0], corrected.mean[1][0]]);

    // Update states
    setUserCoordinates([corrected.mean[0][0], corrected.mean[1][0]]);
  } 
  // Initialize the KF if at least 3 beacons are online
  else if (Object.keys(distances).length >= 3) {
    // Get measured position
    const initialPosition = calculatePosition(beaconCoords, distances, userDirection, userCoordinates, userFloor);
    if (!initialPosition) return;

    // Create the KF object
    initializeKF2D(initialPosition);

    // Update state
    setUserCoordinates(initialPosition);
  }
  console.log(`BLE KF Computed in ${(performance.now() - startTime).toFixed(0)}ms`);
};

export const updateKFWithAPI = (apiCoordinates, setMeasuredPosition, setCorrectedPosition, setUserCoordinates, prevNode, setPrevNode, nextNode, setNextNode) => {
  const startTime = performance.now();
  if (kf2D) {
    // PREDICT
    kf2D.dynamic.covariance = getCovarianceMatrix(dtAPI);
    let predicted = kf2D.predict({ previousCorrected: kf2D.state });

    // PROJECT TO PATH TO GET PATH LOCKED OBSERVATION
    const nextNodePoint = point([rawNodes[nextNode][0], rawNodes[nextNode][1]]);
    const prevNodePoint = point([rawNodes[prevNode][0], rawNodes[prevNode][1]]);

    const line = lineString([prevNodePoint.geometry.coordinates, nextNodePoint.geometry.coordinates]);

    const projectedPoint = nearestPointOnLine(line, point([apiCoordinates[0], apiCoordinates[1]]));

    const observation = [[projectedPoint.geometry.coordinates[0]], [projectedPoint.geometry.coordinates[1]]];

    // CORRECT
    kf2D.observation.covariance = [[APIVariance, 0], [0, APIVariance]];
    const corrected = kf2D.correct({ predicted, observation });

    // Update states
    setMeasuredPosition([projectedPoint.geometry.coordinates[0], projectedPoint.geometry.coordinates[1]]);
    setCorrectedPosition([corrected.mean[0][0], corrected.mean[1][0]]);
    setUserCoordinates([corrected.mean[0][0], corrected.mean[1][0]]);
  } else {
    // Create the KF object
    initializeKF2D(apiCoordinates);

    console.log("Initialized KF with API Position: ", apiCoordinates);

    // Update state
    setUserCoordinates(apiCoordinates);
  }
  
  console.log(`API KF Computed in ${(performance.now() - startTime).toFixed(0)}ms`);
};

export const filterRSSI = (id, beaconDistance, filteredDistance, beaconLastAdvTime) => {
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
  constVelKFOptions.dynamic.init = {};
  const newMean = [[initialPosition[0]], [initialPosition[1]], [0], [0]];
  constVelKFOptions.dynamic.init.mean = newMean
  constVelKFOptions.dynamic.init.covariance = constVelKFInitCov;
  kf2D = new KF(constVelKFOptions);
};