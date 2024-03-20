// #region IMPORTS
// Bluetooth Imports
import { BleManager } from 'react-native-ble-plx';
import { requestBluetoothPermission } from './permissions';
// Custom component Imports
import { NumberLine } from './NumberLine';
import { Recorder } from './Recorder';
// React, React Native, and Expo Imports
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
// Sensor Imports
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
// Utility Imports
import { rssiToDistance, BEACON_1_UUID, BEACON_2_UUID, BEACON_3_UUID, 
  beaconCoords, beaconVariances, beaconAdvertisingFrequency, colors} from './beaconUtilities';
import { calculatePosition, reduceToTwoDimensions } from './positioningUtilities';
import { ConstantPosition2DKFilterOptions, ConstantPositionInitialCovariance, processNoise} from './kalmanFilterUtilities';
import { computeDirections, calibrateMagnetometer } from './orientationUtilities';  
// Three.js Imports
import { PhoneDirectionCanvas } from './ThreeJSComponents';
import * as THREE from 'three';
// #endregion
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const saveAndShareCalibrationData = async (calibrationData) => {
  const fileName = 'calibrationData.json';
  const fileInfo = `${FileSystem.documentDirectory}${fileName}`;

  try {
    const dataString = JSON.stringify(calibrationData);
    await FileSystem.writeAsStringAsync(fileInfo, dataString, { encoding: FileSystem.EncodingType.UTF8 });
    console.log(`Calibration data saved to ${fileInfo}`);

    // Check if sharing is available
    if (!(await Sharing.isAvailableAsync())) {
      console.error("Sharing is not available on this device");
      return;
    }

    // Share the file
    await Sharing.shareAsync(fileInfo);
  } catch (error) {
    console.error('Failed to save or share calibration data:', error);
  }
};

requestBluetoothPermission();         // Request Bluetooth Permission
const bleManager = new BleManager();  // Initialize BLE Manager
var kf2D = null;                      // Initialize 2D Kalman Filter
var kf = {                            // Initialize 1D Kalman Filters
  [BEACON_1_UUID]: null,
  [BEACON_2_UUID]: null,
  [BEACON_3_UUID]: null,
};
var cb = [];                          // Initialize calibration data array

export default function App() {
  // #region STATE AND REFS
  // STATE
  const [isRecording, setIsRecording] = useState(false);
  // Beacon information
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
  // User position information
  const [previousState, setPreviousState] = useState(null);                // 2D Kalman Filter State
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);        // Measured position
  const [userCoordinates, setUserCoordinates] = useState({ x: 0, y: 0 });  // Filtered position
  // Phone orientation information
  const [north, setNorth] = useState(new THREE.Vector3(0, 0, 0));
  const [east, setEast] = useState(new THREE.Vector3(0, 0, 0));
  const [down, setDown] = useState(new THREE.Vector3(0, 0, 0));
  const [rotation, setRotation] = useState([0, 0, 0, 0]); // Rotation of the phone
  const [magnetometerReadings, setMagnetometerReadings] = useState([]);
  const [hasCollectedData, setHasCollectedData] = useState(false);
  
  // REFS 
  const accelerometerDataRef = useRef({ x: 0, y: 0, z: 0 });
  const gyroscopeDataRef = useRef({ x: 0, y: 0, z: 0 });
  const magnetometerDataRef = useRef({ x: 0, y: 0, z: 0 });
  const beaconDistancesRef = useRef(beaconDistances);
  const filteredDistancesRef = useRef(filteredDistances);
  const isRecordingRef = useRef(isRecording);
  const beaconLastAdvTimeRef = useRef(beaconLastAdvTime);
  const previousStateRef = useRef(previousState);
  const accelerometerSubscription = useRef(null); 
  const gyroscopeSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  useEffect(() => { beaconDistancesRef.current = beaconDistances }, [beaconDistances]);
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording]);
  useEffect(() => { beaconLastAdvTimeRef.current = beaconLastAdvTime }, [beaconLastAdvTime]);
  useEffect(() => { filteredDistancesRef.current = filteredDistances }, [filteredDistances]);
  useEffect(() => { previousStateRef.current = previousState }, [previousState]);
  
  //#endregion

  // #region CALLBACKS
  // Start asynchronous BLE scanning
  useEffect(() => {
    //scanForBeacons();
  
    // Setup clean-up function to stop BLE scanning on component unmount
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);
  // Start the 2D Kalman Filter
  useEffect(() => {
    const interval = setInterval(() => {
      //updatePositionWith2DKFilter(previousStateRef.current, filteredDistancesRef.current);
    }, 500);
  
    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  // Subscribe to accelerometer, gyroscrope, and magnetometer data 
  useEffect(() => {
    const subscribeToAccelerometer = () => {
      Accelerometer.setUpdateInterval(200); 

      // Assign the accelerometerSubscription to the current property of the ref
      accelerometerSubscription.current = Accelerometer.addListener(accelerometerData => {
        accelerometerDataRef.current = accelerometerData;
      });
    };

    const subscribeToGyroscope = () => {
      Gyroscope.setUpdateInterval(10000); 

      // Assign the gyroscopeSubscription to the current property of the ref
      gyroscopeSubscription.current = Gyroscope.addListener(gyroscopeData => {
        gyroscopeDataRef.current = gyroscopeData;
      });
    };

    // Subscribe to magnetometer
    const subscribeToMagnetometer = () => {
      Magnetometer.setUpdateInterval(100); // Adjust the update interval as needed

      // Assign the magnetometerSubscription to the current property of the ref
      magnetometerSubscription.current = Magnetometer.addListener(magnetometerData => {
        magnetometerDataRef.current = magnetometerData;
        // Only collect data if we haven't already collected 100 points
        if (!hasCollectedData) {
          setMagnetometerReadings(prevReadings => {
            const updatedReadings = [...prevReadings, magnetometerData];
            if (updatedReadings.length === 400) {
              // We've collected 500 readings, now we save the data
              saveAndShareCalibrationData(calibrateMagnetometer(updatedReadings));
              // Set the hasCollectedData flag to true
              setHasCollectedData(true);
            }
            return updatedReadings;
          });
        }
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
  // Compute the north, east, and down directions with a 800ms interval.
  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = performance.now();
      const { north, east, down, quaternion } = computeDirections(accelerometerDataRef.current, magnetometerDataRef.current);
      setRotation(quaternion);
      setNorth(north);
      setEast(east);
      setDown(down);
      //console.log(`Device rotation computed in ${(performance.now() - startTime).toFixed(0)}ms`);
    }, 2000);
  
    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  // #endregion

  // #region FUNCTIONS
  const scanForBeacons = async () => {  // Trigger 1D Kalman Filter updates on beacon advertisements
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
    }
  };

  const updatePositionWith2DKFilter = (previousState, filteredDistances) => {
    // Initialize the 2D KF if all the 1D KFs have been initialized
    if(!kf2D && Object.values(kf).every(kf => kf !== null)){
      initialPosition = reduceToTwoDimensions(calculatePosition(beaconCoords, filteredDistances));
      ConstantPosition2DKFilterOptions.dynamic.init.mean = [[initialPosition[0]], [initialPosition[1]]]
      ConstantPosition2DKFilterOptions.dynamic.init.covariance = ConstantPositionInitialCovariance;
      kf2D = new KF(ConstantPosition2DKFilterOptions);
    }else 
    // Update Kalman Filter if new measurements are available
    if (kf2D && Object.values(beaconLastAdvTimeRef.current).every(time => performance.now() - time < 3000)){ 
      const startTime = performance.now();
      // Get the observation
      const observation = reduceToTwoDimensions(calculatePosition(beaconCoords, filteredDistances));
      setMeasuredPosition(observation);
      // Get the current state prediction
      const predictedState = kf2D.predict({previousCorrected: previousState}); // Get the current state prediction

      // If the observation is within 10 meters of the state prediction, correct using the measurement vector
      if(Math.abs(observation[0] - predictedState.mean[0][0]) < 7 && Math.abs(observation[1] - predictedState.mean[1][0]) < 7){
        const correctedState = kf2D.correct({observation: observation, predicted: predictedState}); // Correct using the measurement vector
        // Set userCoordinates and previous state
        setUserCoordinates({
          x: correctedState.mean[0][0], 
          y: correctedState.mean[1][0], 
        });
        setPreviousState(correctedState);
      }

      console.log(`Kalman Filter Computed in ${performance.now() - startTime}ms`);
    }
  };
  //#endregion

  // #region CANVAS SETUP
  const canvasSize = { width: 200, height: 200 };
  // Function to scale user and beacon coordinates to canvas size
  const scaleToCanvas = (coord) => {
    const scale = canvasSize.width / (16); 
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
  // #endregion

  return (
    <View style={styles.container}>
      {/* Beacon distances information */}
      <View>
        <View style={styles.beaconContainer}>
          <Text style={styles.beaconName}>Beacon 1:</Text>
            <NumberLine 
              measuredDistance={beaconDistances[BEACON_1_UUID].toFixed(3)} 
              computedDistance={filteredDistances[BEACON_1_UUID].toFixed(3)}
              color = {beaconIndicatorColors[BEACON_1_UUID]}
            />
        </View>
        <View style={styles.beaconContainer}>
          <Text style={styles.beaconName}>Beacon 2:</Text>
          <NumberLine 
            measuredDistance={beaconDistances[BEACON_2_UUID].toFixed(3)} 
            computedDistance={filteredDistances[BEACON_2_UUID].toFixed(3)}
            color = {beaconIndicatorColors[BEACON_2_UUID]}
          />
        </View>
        <View style={styles.beaconContainer}>
          <Text style={styles.beaconName}>Beacon 3:</Text>
          <NumberLine 
            measuredDistance={beaconDistances[BEACON_3_UUID].toFixed(3)} 
            computedDistance={filteredDistances[BEACON_3_UUID].toFixed(3)}
            color = {beaconIndicatorColors[BEACON_3_UUID]}
          />
        </View>
      </View>
      {/* User position information */}
      <View style={styles.userPositionContainer}>
        <Text style={styles.userPositionText}>
          User Position: {userCoordinates.x.toFixed(3)}, {userCoordinates.y.toFixed(3)}
        </Text>
      </View>
      {/* SVG canvas for 2D map */}
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

      {/* Three js canvas */}
      <View style={styles.container}>
        <PhoneDirectionCanvas 
          position={[0, 0, 0]}
          rotation={rotation}
          down={down}
          north={north}
          east={east}
          magnetometerDirection={magnetometerDataRef.current}
          dataPoints={cb? cb : []}
        />
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
    marginTop: 0,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  beaconContainer: {
    flexDirection: 'column',
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
  webview: {
    flex: 1,
  },
});