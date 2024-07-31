import { KalmanFilter } from 'kalman-filter';
import { point, lineString } from '@turf/helpers';
import { bearing as turfBearing, distance, destination, nearestPointOnLine } from '@turf/turf';

import { calculatePosition } from '../positioning/positioningUtilities';
import { rssiToDistance, initBeaconCoords } from "../beacons/beaconUtilities";
import { rawNodes } from '../nav/navigationUtilities';

// GLOBAL VARIABLES
var beaconCoordinates = initBeaconCoords;
var kf = null; 

// MODEL PARAMETERS
export const processNoise = 0.5;  // Process noise for BLE beacon RSSI measurements
export const beaconVariance = 2;  // Measurement variance of the BLE beacon RSSI measurements
export const APIVariance = 4;     // Measurement variance of the API observation
export const dtAPI = 0.2;         // Time step in seconds for samling API
export const dtKF = 0.21          // Time step in seconds applied to Kalman Filter

// MODEL INITIAL COVARIANCE
const huge = 100;
const initialCovariance = [
  [huge, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, huge, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, huge, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, huge, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, huge, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, huge, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, huge, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, huge],
  
];

// MODEL
const constVelKFOptions = {
  dynamic: {
    dimension: 15,
    transition: function (opts) {
      const previousState = opts.previousCorrected.mean;
      const X = previousState[0];       // X coordinate
      const Y = previousState[1];       // Y coordinate
      const VX = previousState[2];      // X velocity
      const VY = previousState[3];      // Y velocity
      const heading = previousState[4]; // Users heading
      
      const transitionMatrix = [
        [1, 0, dtKF, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],   // X = X + VX*dt
        [0, 1, 0, dtKF, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],   // Y = Y + VY*dt
        [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],      // VX = VX
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],      // VY = VY
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],      // heading = heading
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],      // nextNodeID = nextNodeID
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],      // prevNodeID = prevNodeID
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],      // beacon1ID = beacon1ID
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],      // beacon2ID = beacon2ID
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],      // beacon3ID = beacon3ID
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],      // beacon4ID = beacon4ID
      ];

      const beaconIDs = previousState.slice(7, 11);
      const zeroRow = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      beaconIDs.forEach((id, i) => {
        if (id == 0) {
          transitionMatrix.push([...zeroRow]);
        } else {
          let beaconCoordinate = beaconCoordinates[id.toString()];
          let originalDistance = distance(point([X, Y]), point(beaconCoordinate));
          let updatedDistance = distance(point([X + VX, Y + VY]), point(beaconCoordinate));
          let deltaDistance = updatedDistance - originalDistance;
          let ratio = deltaDistance / originalDistance;
          
          // Create a copy of zeroRow and update the specific element
          let newRow = [...zeroRow];
          newRow[11 + i] = ratio;
          transitionMatrix.push(newRow);
        }
      });      

      return transitionMatrix;
    },
    covariance: function (opts) {
      const previousCovariance = opts.previousCorrected.covariance;
      return previousCovariance;
    },
  },
  observation: {
    dimension: 3,
    stateProjection: function (opts) {
      const predicted = opts.predicted;
      const observation = opts.observation;
      const transitionMatrix = [
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],   // X = X
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],   // Y = Y
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],   // heading = heading
      ];

      return transitionMatrix;
    },
    covariance: function (opts) {
      return [
        [APIVariance, 0, 0],
        [0, APIVariance, 0],
        [0, 0, 1],
      ];
    },
  }
};

export const updateKF = (beaconCoords, filteredRSSIs, apiCoordinates, userDirection, setMeasuredPosition, setCorrectedPosition, setUserCoordinates, prevNode, nextNode, moveToNextNode) => {
  const startTime = performance.now();
  beaconCoordinates = beaconCoords;
  if (!kf) {
    // Initialize KF
    const projectedPoint = projectToPath(apiCoordinates, prevNode, nextNode); // Get initial position by projecting API coordinates onto path
    initializeKF(projectedPoint, userDirection);

    // Update state
    setUserCoordinates(apiCoordinates);
  } else {
    // Get distances from RSSIs
    const distances = {};
    Object.entries(filteredRSSIs).forEach(([id, rssi]) => { distances[id] = rssiToDistance(rssi); });

    // PREDICT
    let predicted = kf.predict({ previousCorrected: kf.state });

    // OBSERVE
    const projectedPoint = projectToPath(apiCoordinates, prevNode, nextNode); 
    const observation = [[projectedPoint[0]], [projectedPoint[1]], [userDirection]]; 

    // CORRECT
    const corrected = kf.correct({ predicted, observation });

    // CHECK FOR PATH SWITCH
    checkPathSwitch(corrected.mean, nextNode, moveToNextNode);

    // Update states
    setMeasuredPosition(projectedPoint);
    setCorrectedPosition([corrected.mean[0][0], corrected.mean[1][0]]);
    setUserCoordinates([corrected.mean[0][0], corrected.mean[1][0]]);
  }
  
  console.log(`KF Computed in ${(performance.now() - startTime).toFixed(0)}ms`);
};


// HELPER FUNCTIONS
const checkPathSwitch = (state, nextNode, moveToNextNode) => {
  const userPosition = [state[0][0], state[1][0]];
  const distanceToNextNode = distance(point(userPosition), point([rawNodes[nextNode][0], rawNodes[nextNode][1]]));
  //console.log(`Distance to next node: ${distanceToNextNode}`);

  const transitionTolerance = 0.001;
  
  if (distanceToNextNode < transitionTolerance) {
    moveToNextNode();
  }
}

const projectToPath = (coordinates, prevNode, nextNode) => {
  const nextNodePoint = point([rawNodes[nextNode][0], rawNodes[nextNode][1]]);
  const prevNodePoint = point([rawNodes[prevNode][0], rawNodes[prevNode][1]]);

  const line = lineString([prevNodePoint.geometry.coordinates, nextNodePoint.geometry.coordinates]);

  const projectedPoint = nearestPointOnLine(line, point([coordinates[0], coordinates[1]]));

  return projectedPoint.geometry.coordinates;
}

const initializeKF = (initialPosition, userDirection) => {
  constVelKFOptions.dynamic.init = {};
  const newMean = [[initialPosition[0]], [initialPosition[1]], [0], [0], [userDirection], [0], [0], [0], [0], [0], [0], [0], [0], [0], [0]];
  constVelKFOptions.dynamic.init.mean = newMean
  constVelKFOptions.dynamic.init.covariance = initialCovariance;
  kf = new KalmanFilter(constVelKFOptions);
};


