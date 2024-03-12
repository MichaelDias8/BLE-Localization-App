import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, PermissionsAndroid, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { BleManager } from 'react-native-ble-plx';
import { rssiToDistance, BEACON_1_UUID, BEACON_2_UUID, BEACON_3_UUID, beaconCoords, beaconVariances, beaconAdvertisingFrequency} from './beaconUtilities';
import { calculatePosition, reduceToTwoDimensions } from './positioningUtilities';
import { ConstantPosition2DKFilterOptions, ConstantPositionInitialCovariance } from './kalmanFilterUtilities';
import { NumberLine } from './NumberLine';
import { Recorder } from './Recorder';  
import { KalmanFilter as KF } from 'kalman-filter';
import KalmanFilter from 'kalmanjs';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';

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

var colors = ['blue', 'green', 'magenta', 'yellow', 'purple', 'orange', 'pink', 'brown', 'cyan'];
var processNoise = 0.25; // 1D Kalman Filter process noise
// Initialize the ble manager and Kalman Filter
const bleManager = new BleManager();
var kf = {
  [BEACON_1_UUID]: null,
  [BEACON_2_UUID]: null,
  [BEACON_3_UUID]: null,
};
var kf2D = null;

export default function App() {
  // STATE
  const [beaconDistances, setBeaconDistances] = useState({  // Measured distances
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  const [beaconLastAdvTime, setBeaconLastAdvTime] = useState({ // Timestamps of last advertisement
    [BEACON_1_UUID]: null,
    [BEACON_2_UUID]: null,
    [BEACON_3_UUID]: null,
  });
  const [beaconIndicatorColors, setBeaconIndicatorColors] = useState({ // Indicator colors of each beacon
    [BEACON_1_UUID]: 'blue',
    [BEACON_2_UUID]: 'blue',
    [BEACON_3_UUID]: 'blue',
  })
  const [filteredDistances, setFilteredDistances] = useState({  // Smoothed distances
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [previousState, setPreviousState] = useState(null); // State of 2D Kalman Filter
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);        // Measured position
  const [userCoordinates, setUserCoordinates] = useState({ x: 0, y: 0 });  // Smoothed position
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });
  const [magnetometerData, setMagnetometerData] = useState({ x: 0, y: 0, z: 0 });
  const [north, setNorth] = useState([0, 0, 0]);

  // REFS
  const beaconDistancesRef = useRef(beaconDistances);
  const filteredDistancesRef = useRef(filteredDistances);
  const isRecordingRef = useRef(isRecording);
  const beaconLastAdvTimeRef = useRef(beaconLastAdvTime);
  const previousStateRef = useRef(previousState);
  const accelerometerSubscription = useRef(null); 
  const gyroscopeSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  
  // REF EFFECTS
  useEffect(() => { beaconDistancesRef.current = beaconDistances }, [beaconDistances]);
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording]);
  useEffect(() => { beaconLastAdvTimeRef.current = beaconLastAdvTime }, [beaconLastAdvTime]);
  useEffect(() => { filteredDistancesRef.current = filteredDistances }, [filteredDistances]);
  useEffect(() => { previousStateRef.current = previousState }, [previousState]);
  // EFFECTS
  // Start asynchronous BLE scanning
  useEffect(() => {
    scanForBeacons();
  
    // Setup clean-up function to stop BLE scanning on component unmount
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);
  // Start the 2D Kalman Filter
  useEffect(() => {
    const interval = setInterval(() => {
      updatePositionWith2DKFilter(previousStateRef.current, filteredDistancesRef.current);
    }, 500);
  
    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  // Subscribe to accelerometer, gyroscrope, and magnetometer data 
  useEffect(() => {
    const subscribeToAccelerometer = () => {
      Accelerometer.setUpdateInterval(250); // Set update interval to 1000 ms

      // Assign the accelerometerSubscription to the current property of the ref
      accelerometerSubscription.current = Accelerometer.addListener(accelerometerData => {
        setAccelerometerData(accelerometerData);
      });
    };

    const subscribeToGyroscope = () => {
      Gyroscope.setUpdateInterval(250); // Set update interval to 1000 ms

      // Assign the gyroscopeSubscription to the current property of the ref
      gyroscopeSubscription.current = Gyroscope.addListener(gyroscopeData => {
        setGyroscopeData(gyroscopeData);
      });
    };

    const subscribeToMagnetometer = () => {
      Magnetometer.setUpdateInterval(250); // Set update interval to 1000 ms

      // Assign the magnetometerSubscription to the current property of the ref
      magnetometerSubscription.current = Magnetometer.addListener(magnetometerData => {
        setMagnetometerData(magnetometerData);
      });
    };

    subscribeToAccelerometer();
    subscribeToGyroscope();
    subscribeToMagnetometer();

    // Cleanup function to unsubscribe from the accelerometer data
    return () => {
      accelerometerSubscription.current && accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
      gyroscopeSubscription.current && gyroscopeSubscription.current.remove();
      gyroscopeSubscription.current = null;
      magnetometerSubscription.current && magnetometerSubscription.current.remove();
      magnetometerSubscription.current = null;
    };
  }, []);

  // FUNCTIONS
  // Listen for beacon advertisements and update the beacon distances
  const scanForBeacons = async () => {
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
        // Update the distance, timestamp, and beacon indicators
        setBeaconDistances(prevDistance => ({...prevDistance, [uuid]: rssiToDistance(device.rssi, uuid)}));
        setBeaconLastAdvTime(prevTimers => ({...prevTimers, [uuid]: performance.now()}));
        setBeaconIndicatorColors(prevColors => ({
          ...prevColors,
          [uuid]: colors[colors.indexOf(prevColors[uuid]) + 1] || 'blue',
        }));
        
        // Update the computed distance with the 1D Kalman Filter
        updatePositionWith1DKFilters(uuid, beaconDistancesRef.current, filteredDistancesRef.current, beaconLastAdvTimeRef.current, initalBeaconDistancesRef.current);        
      }
    });
  };

  const updatePositionWith1DKFilters = (beaconId, beaconDistances, filteredDistances, beaconLastAdvTime) => {
    if (!kf[beaconId] && beaconDistances[beaconId] !== 0)
      // If KF is not initialized, initialize it
      kf[beaconId] = new KalmanFilter({R: processNoise, Q: beaconVariances[beaconId], x: beaconDistances[beaconId]});
    else{ 
      // If KF is initialized, filter the distance 
      // Update measurement noise to trust lower distances more and higher distances less
      let measurementDifference = beaconDistances[beaconId] - filteredDistances[beaconId];      
      let measurementNoise = (measurementDifference > 0) ? 
        measurementNoise = ((3.5 * beaconVariances[beaconId]) * Math.log10(measurementDifference + 1)) + 1
      :
        measurementNoise = 1 / ((beaconVariances[beaconId] * -measurementDifference) + 1);
      
      kf[beaconId].setMeasurementNoise(measurementNoise);

       // Update the process noise value based on the time since the last advertisement
      kf[beaconId].setProcessNoise(processNoise*(performance.now() - beaconLastAdvTime[beaconId])/beaconAdvertisingFrequency);

      // Compute the filtered position and update the state
      const computedPosition = kf[beaconId].filter(beaconDistances[beaconId]);
      setFilteredDistances(prevDistances => ({...prevDistances, [beaconId]: computedPosition}));
      // Log
      console.log(`kf for beacon ${beaconId.substring(0, 3)} x: ${kf[beaconId].x.toFixed(1)} cov: ${kf[beaconId].cov.toFixed(2)}`);
      console.log(`Measurement Noise for beacon ${beaconId.substring(0, 3)}: ${measurementNoise}`);
    }
  };

  const updatePositionWith2DKFilter = (previousState, filteredDistances) => {
    // Initialize the 2D KF ifthe 1D KFs have been initialized
    if(!kf2D && Object.values(kf).every(kf => kf !== null)){
    console.log('Initializing 2D Kalman Filter...');
      initialPosition = reduceToTwoDimensions(calculatePosition(beaconCoords, filteredDistances));
      ConstantPosition2DKFilterOptions.dynamic.init = {
        mean: [[initialPosition[0]], [initialPosition[1]]],
        covariance: ConstantPositionInitialCovariance,
      };
      kf2D = new KF(ConstantPosition2DKFilterOptions);
    }else if (kf2D){ // Update Kalman Filter if its initialized
      const observation = reduceToTwoDimensions(calculatePosition(beaconCoords, filteredDistances));
      setMeasuredPosition(observation);
      const startTime = performance.now();
      const predictedState = kf2D.predict({previousCorrected: previousState}); // Predict the next state
      // If the observation is within 20 meters of the predicted state, correct using the measurement vector
      if(Math.abs(observation[0] - predictedState.mean[0][0]) < 14.14 && Math.abs(observation[1] - predictedState.mean[1][0]) < 14.14){
        const correctedState = kf2D.correct({observation: observation, predicted: predictedState}); // Correct using the measurement vector
        setPreviousState(correctedState); // Update the previous state
        // Update userCoordinates state with the new estimated position
        setUserCoordinates({
          x: Math.round(correctedState.mean[0][0] * 1000) / 1000, // correctedState.mean = [x, y]
          y: Math.round(correctedState.mean[1][0] * 1000) / 1000, // Round to 2 decimal places
        });
      }
      const endTime = performance.now();
      const timeTaken = endTime - startTime;
      console.log(`Kalman Filter Computed in ${timeTaken.toFixed(0)}ms`);
    }
  };

  // CANVAS SETUP
  const canvasSize = { width: 300, height: 250 };
  // Function to scale user and beacon coordinates to canvas size
  const scaleToCanvas = (coord) => {
    const scale = canvasSize.width / (20); 
    const xOffSet = 8;
    const yOffSet = 6;
    // Adjust the coordinate origin to the center of the canvas and apply scaling
    const x = ((coord[0] + xOffSet)  * scale);
    //invert the y axis
    const y = ((coord[1] + yOffSet) * scale);
    return { x, y };
  };
  // Scale user and measured coordinates to canvas size
  const scaledUserCoordinates = scaleToCanvas([userCoordinates.x, userCoordinates.y]);
  const scaledMeasuredPosition = measuredPosition && scaleToCanvas([measuredPosition[0], measuredPosition[1]]);
  
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.beaconName}>Beacon 1:</Text>
          <NumberLine 
            measuredDistance={beaconDistances[BEACON_1_UUID].toFixed(3)} 
            computedDistance={filteredDistances[BEACON_1_UUID].toFixed(3)}
            color = {beaconIndicatorColors[BEACON_1_UUID]}
          />
      </View>
      <View>
        <Text style={styles.beaconName}>Beacon 2:</Text>
        <NumberLine 
          measuredDistance={beaconDistances[BEACON_2_UUID].toFixed(3)} 
          computedDistance={filteredDistances[BEACON_2_UUID].toFixed(3)}
          color = {beaconIndicatorColors[BEACON_2_UUID]}
        />
      </View>
      <View>
        <Text style={styles.beaconName}>Beacon 3:</Text>
        <NumberLine 
          measuredDistance={beaconDistances[BEACON_3_UUID].toFixed(3)} 
          computedDistance={filteredDistances[BEACON_3_UUID].toFixed(3)}
          color = {beaconIndicatorColors[BEACON_3_UUID]}
        />
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
                B_{index + 1} 
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
        {true && (
        <Circle
          cx={scaledMeasuredPosition.x }
          cy={scaledMeasuredPosition.y }
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
      <View style={styles.userPositionContainer}>
        <Text>Accelerometer: {accelerometerData.x.toFixed(3)} Y: {accelerometerData.y.toFixed(3)} Z: {accelerometerData.z.toFixed(3)}</Text>
      </View>
      <View style={styles.userPositionContainer}>
        <Text>Gyroscope: X: {accelerometerData.x.toFixed(2)} Y: {gyroscopeData.y.toFixed(2)} Z: {gyroscopeData.z.toFixed(2)}</Text>
      </View>
      <View style={styles.userPositionContainer}>
        <Text>Magnetometer: X: {magnetometerData.x.toFixed(0)} Y: {magnetometerData.y.toFixed(0)} Z: {magnetometerData.z.toFixed(0)}</Text>
      </View>
      
      {/*<Recorder
        isRecording={isRecording}
        setIsRecording={setIsRecording}
      />*/}
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
    marginTop: 0,
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
    alignItems: 'center', 
    justifyContent: 'center', 
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    margin: 20,
  },
});