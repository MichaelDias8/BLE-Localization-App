import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { BleManager } from 'react-native-ble-plx';
import { rssiToDistance, BEACON_1_ID, BEACON_2_ID, BEACON_3_ID, beaconCoords} from './beaconUtilities';
import { calculatePosition, reduceToTwoDimensions } from './positioningUtilities';
import { ConstantVelocityDiscrete2DKFilterOptions, ConstantVelocityInitialCovariance } from './kalmanFilterUtilities';
import { KalmanFilter } from 'kalman-filter';

requestBluetoothPermission = async () => {
  if (Platform.OS === 'ios') {
    return true
  }
  if (Platform.OS === 'android' && PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
    const apiLevel = parseInt(Platform.Version.toString(), 10)

    if (apiLevel < 31) {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      return granted === PermissionsAndroid.RESULTS.GRANTED
    }
    if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN && PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ])

      return (
        result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      )
    }
  }

  this.showErrorToast('Permission have not been granted')

  return false
}
requestBluetoothPermission();

const bleManager = new BleManager();
var kf = null;

export default function App() {
  // States for distance history, Kalman Filter, beacon connection states, beacon RSSI values, and user coordinates
  const [distanceData, setDistanceData] = useState({
    [BEACON_1_ID]: [],
    [BEACON_2_ID]: [],
    [BEACON_2_ID]: [],
  });
  const [previousState, setPreviousState] = useState(null);
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);
  const [beaconStates, setBeaconStates] = useState({
    [BEACON_1_ID]: 'Scanning...',
    [BEACON_2_ID]: 'Scanning...',
    [BEACON_3_ID]: 'Scanning...',
  });
  const [beaconRSSIVals, setBeaconRSSIVals] = useState({
    [BEACON_1_ID]: 0,
    [BEACON_2_ID]: 0,
    [BEACON_3_ID]: 0,
  });
  const [userCoordinates, setUserCoordinates] = useState({ x: 0, y: 0 });
  // Ref to hold the latest beacon RSSI values and states
  const beaconRSSIValsRef = useRef(beaconRSSIVals);
  const beaconStatesRef = useRef(beaconStates);

  // Effects for updating the beacon RSSI values and states
  useEffect(() => {
    beaconRSSIValsRef.current = beaconRSSIVals; // Update the ref whenever beaconRSSIVals changes
  }, [beaconRSSIVals]);
  useEffect(() => {
    beaconStatesRef.current = beaconStates; // Update the ref whenever beaconStates changes
  }, [beaconStates]);
  // Effect for scanning for beacons and updating the user position
  useEffect(() => {
    scanForBeacons();
    // Set up the interval using a function that references the latest beaconRSSIVals through the ref
    const interval = setInterval(() => {
      updatePosition(beaconRSSIValsRef.current);
    }, 500);
    return () => {
      clearInterval(interval);
      bleManager.stopDeviceScan();
    };
  }, []); // No dependencies here, so it runs only once

  // Stop scanning when a beacon is found and connect to it.
  const scanForBeacons = async () => {
    let beaconTimeouts = {};
  
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Error: ', error);
        return;
      }
      if (device.name === 'Test beacon') {
        // Update the status of the found beacon
        setBeaconStates(prevStatus => ({
          ...prevStatus,
          [device.id]: 'Detected',
        }));
        // Update the RSSI value of the found beacon
        setBeaconRSSIVals(prevRSSI => {
          const newRSSI = {
            ...prevRSSI,
            [device.id]: device.rssi,
          };
          return newRSSI;
        });
        // Update the distance data for the found beacon
        updateDistanceData(device.id, rssiToDistance(device.rssi));
        // Clear any existing timeout for this beacon
        if (beaconTimeouts[device.id]) {
          clearTimeout(beaconTimeouts[device.id]);
        }
        // Set a new timeout to reset the beacon state after 2 seconds
        beaconTimeouts[device.id] = setTimeout(() => {
          setBeaconStates(prevStatus => ({
            ...prevStatus,
            [device.id]: 'Not Detected',
          }));
        }, 2000);
      }
    });
  };

  const updateDistanceData = (beaconId, newDistance) => {
    setDistanceData(prevData => {
      const newData = [...prevData[beaconId], newDistance];
      // Keep only the last 5 seconds of data, assuming an update rate of 1 Hz
      if (newData.length > 10) {
        newData.shift(); // Remove the oldest distance if we have more than 5 seconds of data
      }
      return { ...prevData, [beaconId]: newData };
    });
  };
  
  // Function to calculate mean
  const calculateMean = (data) => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  };
  
  // Function to calculate variance
  const calculateVariance = (data, mean) => {
    if (data.length === 0) return 0;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  };

  // Function to update the user position using the Kalman Filter every 1 second
  const updatePosition = (beaconRSSIValues) => {
    // If all beacons are not detected, do not update the user position
    if (
      Object.values(beaconStatesRef.current).some(status => status !== 'Detected')
      ) 
    return;
    
    // If the Kalman Filter has not been initialized, initialize it with the first measurement
    if (!kf) {
      console.log('Initializing Kalman Filter...');
      const distances = rssiToDistance(beaconRSSIValues);
      initialPosition = reduceToTwoDimensions(calculatePosition(beaconCoords, distances));
      console.log('Kf options', ConstantVelocityDiscrete2DKFilterOptions);
      ConstantVelocityDiscrete2DKFilterOptions.dynamic.init = {
        mean: [[initialPosition[0]], [0], [initialPosition[1]], [0]],
        covariance: ConstantVelocityInitialCovariance,
      };
      kf = new KalmanFilter(ConstantVelocityDiscrete2DKFilterOptions);
      return;
    }else{
      // Convert RSSI values to distances
      const distances = rssiToDistance(beaconRSSIValues);
      // Assuming you have a function to convert distances to a measurement vector
      const observation = reduceToTwoDimensions(calculatePosition(beaconCoords, distances));
      setMeasuredPosition(observation);
      const predictedState = kf.predict({previousCorrected: previousState}); // Predict the next state
      // If the observation is within 5 meters of the predicted state, correct using the measurement vector
      if(Math.abs(observation[0] - predictedState.mean[0]) < 5 && Math.abs(observation[1] - predictedState.mean[1]) < 5){
        const correctedState = kf.correct({observation: observation, predicted: predictedState}); // Correct using the measurement vector
        setPreviousState(correctedState); // Update the previous state
        // Update userCoordinates state with the new estimated position
        setUserCoordinates({
          x: Math.round(correctedState.mean[0] * 1000) / 1000, // correctedState.mean = [x, y]
          y: Math.round(correctedState.mean[1] * 1000) / 1000, // Round to 2 decimal places
        });
      }
    }
  };

  const canvasSize = { width: 300, height: 300 };
  // Function to scale beacon coordinates to canvas size
  const scaleToCanvas = (coord) => {
    const scale = canvasSize.width / (20); 
    const xOffSet = 9;
    const yOffSet = 7;
    // Adjust the coordinate origin to the center of the canvas and apply scaling
    const x = canvasSize.width - ((coord[0] + xOffSet)  * scale);
    // Invert the y-axis to match the canvas coordinate system
    const y = canvasSize.height - ((coord[1] + yOffSet) * scale);
    return { x, y };
  };

  const scaledUserCoordinates = scaleToCanvas([userCoordinates.x, userCoordinates.y]);
  const scaledMeasuredPosition = measuredPosition && scaleToCanvas(measuredPosition);
  const scaledPreviousState = previousState && scaleToCanvas([previousState.mean[0], previousState.mean[1]]);
  return (
    <View style={styles.container}>
      <View style={styles.beaconContainer}>
        <Text style={styles.beaconName}>Beacon 1:</Text>
        <Text style={styles.beaconInfo}>
          {`Status: ${beaconStates[BEACON_1_ID]}
          RSSI: ${beaconRSSIVals[BEACON_1_ID]}
          Distance: ${rssiToDistance(beaconRSSIVals[BEACON_1_ID]).toFixed(3)}m
          Mean: ${calculateMean(distanceData[BEACON_1_ID]).toFixed(3)}m
          Variance: ${calculateVariance(distanceData[BEACON_1_ID], calculateMean(distanceData[BEACON_1_ID])).toFixed(3)}`}
        </Text>
      </View>
      <View style={styles.beaconContainer}>
        <Text style={styles.beaconName}>Beacon 2:</Text>
        <Text style={styles.beaconInfo}>
          {`Status: ${beaconStates[BEACON_2_ID]}\nRSSI: ${beaconRSSIVals[BEACON_2_ID]}\nDistance: ${rssiToDistance(beaconRSSIVals[BEACON_2_ID]).toFixed(3)}m`}
        </Text>
      </View>
      <View style={styles.beaconContainer}>
        <Text style={styles.beaconName}>Beacon 3:</Text>
        <Text style={styles.beaconInfo}>
          {`Status: ${beaconStates[BEACON_3_ID]}\nRSSI: ${beaconRSSIVals[BEACON_3_ID]}\nDistance: ${rssiToDistance(beaconRSSIVals[BEACON_3_ID]).toFixed(3)}m`}
        </Text>
      </View>
      <Svg height={canvasSize.height} width={canvasSize.width} style={styles.mapContainer}>
        {beaconCoords.map((coord, index) => {
          const { x, y } = scaleToCanvas(coord);
          return (
            <React.Fragment key={`beacon-group-${index}`}>
              <SvgText
                key={`beacon-label-${index}`}
                x={x + 30} // Shifted right by 15px already, adjust y similarly if needed
                y={y + 15 + 5} // Shifted down by 15px + original 5px adjustment
                fill="black"
                fontSize="10"
              >
                Beacon {index + 1}
              </SvgText>
              <Circle
                key={`beacon-${index}`}
                cx={x + 15} // Shifted right by 15px
                cy={y + 15} // Shifted down by 15px
                r="10"
                fill="blue"
              />
            </React.Fragment>
          );
        })}
        <Circle
          cx={scaledUserCoordinates.x + 15} // Shifted right by 15px
          cy={scaledUserCoordinates.y + 15} // Shifted down by 15px
          r="5"
          fill="red"
        />
        <Circle
          cx={scaledMeasuredPosition.x + 15} // Shifted right by 15px
          cy={scaledMeasuredPosition.y + 15} // Shifted down by 15px
          r="5"
          fill="green"
        />
        {scaledPreviousState && (
          <Circle
            cx={scaledPreviousState.x + 15} // Shifted right by 15px
            cy={scaledPreviousState.y + 15} // Shifted down by 15px
            r="5"
            fill="orange"
          />
        )}
        
        <SvgText
          x={canvasSize.width / 2} // Center horizontally
          y={canvasSize.height - 10} // Position towards the bottom of the canvas
          fontSize="16"
          textAnchor="middle" // This centers the text at the specified x position
          fill="black"
        >
          x
        </SvgText>

        {/* Add y-axis label */}
        <SvgText
          x={10} // Position towards the left of the canvas
          y={canvasSize.height / 2} // Center vertically
          fontSize="16"
          textAnchor="middle"
          fill="black"
          transform={`rotate(-90, ${10}, ${canvasSize.height / 2})`} // Rotate the text for the y-axis
        >
          y
        </SvgText>
      </Svg>
      <View style={styles.userPositionContainer}>
        <Text style={styles.userPositionText}>
          User Position: {userCoordinates.x}, {userCoordinates.y}
        </Text>
      </View>
      <View style={styles.userPositionContainer}>
        <Text style={styles.userPositionText}>
          Measured Position: {measuredPosition ? `${measuredPosition[0].toFixed(3)}, ${measuredPosition[1].toFixed(3)}` : 'Not available'}
        </Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
} 

function scalarMultiply2DArray(matrix, scalar) {
  // Iterate through each row of the matrix
  for (let i = 0; i < matrix.length; i++) {
      // Iterate through each column in the current row
      for (let j = 0; j < matrix[i].length; j++) {
          // Multiply the current element by the scalar and update the element
          matrix[i][j] *= scalar;
      }
  }
  return matrix;
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    borderWidth: 1,
    borderColor: '#000',
    margin: 10,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  beaconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  svgContainer: {
    marginTop: 20,
  },
  beaconName: {
    fontWeight: 'bold',
  },
  beaconInfo: {
    textAlign: 'right',
  },
  userPositionContainer: {
    alignItems: 'center', // Center align items horizontally in the container
    justifyContent: 'center', // Center content vertically in the container
    marginTop: 0, // Optional: adds some space above the user position text
  },
});
