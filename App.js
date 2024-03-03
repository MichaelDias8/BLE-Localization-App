import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, PermissionsAndroid, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { BleManager } from 'react-native-ble-plx';
import { rssiToDistance, BEACON_1_UUID, BEACON_2_UUID, BEACON_3_UUID, beaconCoords, beaconVariances, beaconAdvertisingFrequency} from './beaconUtilities';
import { calculatePosition, reduceToTwoDimensions } from './positioningUtilities';
import { ConstantPosition1DKFilterOptions, ConstantPosition2DKFilterOptions, ConstantPositionInitialCovariance } from './kalmanFilterUtilities';
import { calculateMean, calculateVariance } from './statsUtilities';
import { NumberLine } from './NumberLine';
//import { KalmanFilter } from 'kalman-filter';
import KalmanFilter from 'kalmanjs';

// Request Bluetooth Permission
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

// Initialize the ble manager and Kalman Filter
const bleManager = new BleManager();
var kf = {
  [BEACON_1_UUID]: null,
  [BEACON_2_UUID]: null,
  [BEACON_3_UUID]: null,
};

export default function App() {
  // State values
  const [previousState, setPreviousState] = useState(null); // State of Kalman Filter
  const [beaconLastAdvTime, setBeaconLastAdvTime] = useState({    // State of 1D Kalman Filters 
    [BEACON_1_UUID]: null,
    [BEACON_2_UUID]: null,
    [BEACON_3_UUID]: null,
  });
  const [beaconDistances, setBeaconDistances] = useState({
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  const [filteredDistances, setFilteredDistances] = useState({
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  const [initialBeaconDistances, setInitialBeaconDistances] = useState({
    [BEACON_1_UUID]: [],
    [BEACON_2_UUID]: [],
    [BEACON_3_UUID]: [],
  });
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);
  const [userCoordinates, setUserCoordinates] = useState({ x: 0, y: 0 });
  const [showMeasurement, setShowMeasurement] = useState(true); //show the measured position circle
  const [beaconStates, setBeaconStates] = useState({
    [BEACON_1_UUID]: 'Scanning...',
    [BEACON_2_UUID]: 'Scanning...',
    [BEACON_3_UUID]: 'Scanning...',
  });
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedStats, setRecordedStats] = useState({
    [BEACON_1_UUID]: { mean: 0, variance: 0 },
    [BEACON_2_UUID]: { mean: 0, variance: 0 },
    [BEACON_3_UUID]: { mean: 0, variance: 0 },
  });
  const [recordedRSSIS, setRecordedRSSIS] = useState({
    [BEACON_1_UUID]: [],
    [BEACON_2_UUID]: [],
    [BEACON_3_UUID]: [],
  }); 

  // Refs for state values
  const beaconDistancesRef = useRef(beaconDistances);
  const initalBeaconDistancesRef = useRef(initialBeaconDistances);
  const isRecordingRef = useRef(isRecording);
  const beaconStatesRef = useRef(beaconStates);
  const beaconLastAdvTimeRef = useRef(beaconLastAdvTime);

  // Recording Event Handlers
  const startRecording = () => {
    console.log('Recording Started');
    setIsRecording(true);
    setRecordedStats({
      [BEACON_1_UUID]: { mean: 0, variance: 0 },
      [BEACON_2_UUID]: { mean: 0, variance: 0 },
      [BEACON_3_UUID]: { mean: 0, variance: 0 },
    });
    // Reset Data for a new recording session
    setRecordedRSSIS({
      [BEACON_1_UUID]: [],
      [BEACON_2_UUID]: [],
      [BEACON_3_UUID]: [],
    });
  };
  const stopRecording = () => {
    setIsRecording(false);
    console.log('Recording Stopped');
    // Calculate and print the mean and variance for each beacon
    Object.keys(recordedRSSIS).forEach(beaconId => {
      const data = (recordedRSSIS[beaconId]);
      const mean = calculateMean(data);
      const variance = calculateVariance(data, mean);
      setRecordedStats(prevData => ({
        ...prevData,
        [beaconId]: { mean, variance },
      }));
    });
  };
  
  // Effects to update refs with the latest state values
  useEffect(() => {
    beaconDistancesRef.current = beaconDistances; 
  }, [beaconDistances]);
  useEffect(() => {
    beaconStatesRef.current = beaconStates;     
  }, [beaconStates]);
  useEffect(() => {
    isRecordingRef.current = isRecording;      
  }, [isRecording]);
  useEffect(() => {
    initalBeaconDistancesRef.current = initialBeaconDistances;      
  }, [initialBeaconDistances]);
  useEffect(() => {
    beaconLastAdvTimeRef.current = beaconLastAdvTime;      
  }, [beaconLastAdvTime]);

  // Effect to begin scanning for beacons and updating the user position
  useEffect(() => {
    scanForBeacons();
    // Set up the interval using a function that references the latest beaconDistances through the ref
    const interval = setInterval(() => {
      //updatePositionWith2DKFilter(beaconDistancesRef.current);
    }, 500);
    return () => {
      clearInterval(interval);
      bleManager.stopDeviceScan();
    };
  }, []); // Only run once

  // Function to start scanning for beacons and update the beacon states and RSSI values
  const scanForBeacons = async () => {
    let beaconTimeouts = {};
  
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Error: ', error);
        return;
      }
      if (device.name === 'Test beacon') {
        // Get the UUID of the beacon
        let uuid = device.serviceUUIDs[0];
        // If recording, add the RSSI value from the beacon to the recorded data
        if (isRecordingRef.current) {
          setRecordedRSSIS(prevData => {
            const newRSSIData = {
              ...prevData,
              [uuid]: [...prevData[uuid], device.rssi],
            };
            return newRSSIData;
          });
        }
        // If the initial distance array is not full, add the current distance to it
        if (initalBeaconDistancesRef.current[uuid].length < 10) {
          setInitialBeaconDistances(prevData => {
            const newDistances = {
              ...prevData,
              [uuid]: [...prevData[uuid], rssiToDistance(device.rssi, uuid)],
            };
            return newDistances;
          });
        }
        // Update the status and distance of the found beacon
        setBeaconStates(prevStatus => ({
          ...prevStatus,
          [uuid]: 'Detected',
        }));
        setBeaconDistances(prevDistance => {
          const newDistance = {
            ...prevDistance,
            [uuid]: rssiToDistance(device.rssi, uuid),
          };
          return newDistance;
        });
        // Update the beacon timestamp to the current time
        setBeaconLastAdvTime(prevTimers => ({
          ...prevTimers,
          [uuid]: performance.now(),
        }));
        
        // Update the computed distance with the 1D Kalman Filter
        //updatePositionWith1DKFilters(uuid, beaconDistancesRef.current, beaconLastAdvTimeRef.current, initalBeaconDistancesRef.current);        
        
        // Clear any existing timeout for this beacon and set a new one to reset the beacon state after 2 seconds
        if (beaconTimeouts[uuid]) {
          clearTimeout(beaconTimeouts[uuid]);
        }
        // Set a new timeout to reset the beacon state after 2 seconds
        beaconTimeouts[uuid] = setTimeout(() => {
          setBeaconStates(prevStatus => ({
            ...prevStatus,
            [uuid]: 'Not Detected',
          }));
        }, 2000);
      }
    });
  };

  const updatePositionWith1DKFilters = (beaconId, beaconDistances, beaconLastAdvTime, initBeaconDistances) => {
    let processNoise = 0.01;
    if (kf[beaconId] !== null) {
      console.log(`kf for beacon ${beaconId.substring(0, 3)} x: ${kf[beaconId].x} cov: ${kf[beaconId].cov}`);
    }    
    // If the Kalman Filter has been initialized for the current beacon then filter the distance measurement
    if (kf[beaconId]){
      // Update the property of the kf object for the current beacon based on the beaconLastAdvTime state  
      kf[beaconId].setProcessNoise(processNoise*(performance.now() - beaconLastAdvTime[beaconId])/beaconAdvertisingFrequency);
      // Run the Kalman Filter for the current beacon
      const computedPosition = kf[beaconId].filter(beaconDistances[beaconId]);
      // Update filtered distances state with the new estimated position
      setFilteredDistances(prevDistances => ({...prevDistances, [beaconId]: computedPosition}));
    } // Initialize the kalman filter when the inital measurements are complete 
    else if (initBeaconDistances[beaconId].length == 10){
      console.log(`Initializing Kalman Filter for beacon ${beaconId}...`);
      const mean = calculateMean(initBeaconDistances[beaconId]);
      const variance = calculateVariance(initBeaconDistances[beaconId], mean);
      //Update the property of the kf object for the current beacon
      kf[beaconId] = new KalmanFilter({R: processNoise, Q: beaconVariances[beaconId], x: mean});
    }
  };

  const updatePositionWith2DKFilter = (beaconDistances) => {
    // If all beacons are not detected, do not update the user position
    if (Object.values(beaconStatesRef.current).some(status => status !== 'Detected')) return;
    
    // If the Kalman Filter has not been initialized, initialize it with the first measurement
    if (!kf) {
      console.log('Initializing 2D Kalman Filter...');
      const distances = beaconDistances;
      initialPosition = reduceToTwoDimensions(calculatePosition(beaconCoords, distances));
      ConstantPosition2DKFilterOptions.dynamic.init = {
        mean: [[initialPosition[0]], [initialPosition[1]]],
        covariance: ConstantPositionInitialCovariance,
      };
      kf = new KalmanFilter(ConstantPosition2DKFilterOptions);
    }else{
      // Convert RSSI values to distances
      const distances = beaconDistances;
      // Assuming you have a function to convert distances to a measurement vector
      const observation = reduceToTwoDimensions(calculatePosition(beaconCoords, distances));
      setMeasuredPosition(observation);
      const startTime = performance.now();
      const predictedState = kf.predict({previousCorrected: previousState}); // Predict the next state
      // If the observation is within 20 meters of the predicted state, correct using the measurement vector
      if(Math.abs(observation[0] - predictedState.mean[0][0]) < 14.14 && Math.abs(observation[1] - predictedState.mean[1][0]) < 14.14){
        const correctedState = kf.correct({observation: observation, predicted: predictedState}); // Correct using the measurement vector
        setPreviousState(correctedState); // Update the previous state
        // Update userCoordinates state with the new estimated position
        setUserCoordinates({
          x: Math.round(correctedState.mean[0][0] * 1000) / 1000, // correctedState.mean = [x, y]
          y: Math.round(correctedState.mean[1][0] * 1000) / 1000, // Round to 2 decimal places
        });
      }
      const endTime = performance.now();
      const timeTaken = endTime - startTime;

      console.log(`Kalman Filter Computed in ${timeTaken}ms`);
    }
  };

  // Set up canvas size and scaling function
  const canvasSize = { width: 300, height: 300 };
  // Function to scale beacon coordinates to canvas size
  const scaleToCanvas = (coord) => {
    const scale = canvasSize.width / (20); 
    const xOffSet = 10;
    const yOffSet = 10;
    // Adjust the coordinate origin to the center of the canvas and apply scaling
    const x = canvasSize.width - ((coord[0] + xOffSet)  * scale);
    //invert the y axis
    const y = canvasSize.height - ((coord[1] + yOffSet) * scale);
    return { x, y };
  };
  // Scale the user coordinates and measured coordinates to the canvas size
  const scaledUserCoordinates = scaleToCanvas([userCoordinates.x, userCoordinates.y]);
  const scaledMeasuredPosition = measuredPosition && scaleToCanvas([measuredPosition[0], measuredPosition[1]]);
  
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.beaconName}>Beacon 1:</Text>
          <NumberLine measuredDistance={beaconDistances[BEACON_1_UUID].toFixed(3)} computedDistance={filteredDistances[BEACON_1_UUID].toFixed(3)}/>
      </View>
      <View>
        <Text style={styles.beaconName}>Beacon 2:</Text>
        <NumberLine measuredDistance={beaconDistances[BEACON_2_UUID].toFixed(3)} computedDistance={filteredDistances[BEACON_2_UUID].toFixed(3)}/>
      </View>
      <View>
        <Text style={styles.beaconName}>Beacon 3:</Text>
        <NumberLine measuredDistance={beaconDistances[BEACON_3_UUID].toFixed(3)} computedDistance={filteredDistances[BEACON_3_UUID].toFixed(3)}/>
      </View>
      <Svg height={canvasSize.height} width={canvasSize.width} style={styles.mapContainer}>
        {beaconCoords.map((coord, index) => {
          const { x, y } = scaleToCanvas(coord);
          const uuid = Object.keys(kf)[index]; 
          return (
            <React.Fragment key={`beacon-group-${index}`}>
              <SvgText
                key={`beacon-label-${index}`}
                x={x + 15}
                y={y  + 5}
                fill="black"
                fontSize="10"
              >
                Beacon {index + 1} {beaconStates[uuid] == 'Detected' ? '' : '(Not Detected)'}
              </SvgText>
              <Circle
                key={`beacon-${index}`}
                cx={x} 
                cy={y} 
                r="3"
                fill="blue"
              />
            </React.Fragment>
          );
        })}
        <SvgText
          x={scaledUserCoordinates.x + 15}
          y={scaledUserCoordinates.y  + 15}
          fill="black"
          fontSize="10"
        >
          User
        </SvgText>
        <Circle
          cx={scaledUserCoordinates.x } 
          cy={scaledUserCoordinates.y } 
          r="5"
          fill="red"
        />
        {showMeasurement && (
        <Circle
          cx={scaledMeasuredPosition.x } // Use the calculated position
          cy={scaledMeasuredPosition.y } // Use the calculated position
          r="5"
          stroke="green"
          strokeWidth="3"
          fill="none"
        />
        )}
        <SvgText
          x={canvasSize.width / 2} // Center horizontally
          y={canvasSize.height - 10} // Position towards the bottom of the canvas
          fontSize="16"
          textAnchor="middle" // This centers the text at the specified x position
          fill="black"
        >
          x→ 
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
          y→
        </SvgText>
      </Svg>
      <View style={styles.userPositionContainer}>
        <Text style={styles.userPositionText}>
          User Position: {userCoordinates.x}, {userCoordinates.y}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Start Recording" onPress={startRecording} disabled={isRecording} />
        <Button title="Stop Recording" onPress={stopRecording} disabled={!isRecording} />
      </View>
      <View style={styles.beaconContainer}>
        <Text style={styles.beaconName}>Beacon 1:</Text>
        <Text>{recordedStats[BEACON_1_UUID].variance? `Mean: ${recordedStats[BEACON_1_UUID].mean.toFixed(3)}   Variance: ${recordedStats[BEACON_1_UUID].variance.toFixed(3)}` : ''}</Text>
      </View>
      <View style={styles.beaconContainer}>
        <Text style={styles.beaconName}>Beacon 2:</Text>
        <Text>{recordedStats[BEACON_2_UUID].variance? `Mean: ${recordedStats[BEACON_2_UUID].mean.toFixed(3)}   Variance: ${recordedStats[BEACON_2_UUID].variance.toFixed(3)}` : ''}</Text>
      </View>
      <View style={styles.beaconContainer}>
        <Text style={styles.beaconName}>Beacon 3:</Text>
        <Text>{recordedStats[BEACON_3_UUID].variance? `Mean: ${recordedStats[BEACON_3_UUID].mean.toFixed(3)}   Variance: ${recordedStats[BEACON_3_UUID].variance.toFixed(3)}` : ''}</Text>
      </View>
      <StatusBar style="auto"/>
    </View>

  );
} 

const styles = StyleSheet.create({
  numberLineContainer: {
    marginBottom: 10, 
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
    marginTop: 30,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 20,
  },
});