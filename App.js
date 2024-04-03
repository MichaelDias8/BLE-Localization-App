// #region IMPORTS
import { BleManager } from 'react-native-ble-plx';
import { requestBluetoothPermission} from './permissions';
// React, React Native, and Expo Imports
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
// Sensor Imports
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
// Custom component Imports
import { NumberLine } from './NumberLine';
import { Recorder } from './Recorder';
import { SvgCanvas } from './SvgCanvas';
// Utility Imports
import { rssiToDistance, BEACON_1_UUID, BEACON_2_UUID, BEACON_3_UUID, 
  beaconCoords, beaconVariances, beaconAdvertisingFrequency, colors} from './beaconUtilities';
import { calculatePosition, reduceTo2D, clampUserPosition } from './positioningUtilities';
import { computeRotationWithMag, computeRotationWithGyro } from './orientationUtilities'
import { saveAndShareCalibrationData, calibrateMagnetometer } from './calibration';
// Kalman Filter Imports
import { ConstantPosition2DKFOptions, ConstantPositionInitialCovariance, processNoise, beaconMeasurementVariance, IMUMeasurementVariance} from './kalmanFilterUtilities';
import KalmanFilter from 'kalmanjs';
import { KalmanFilter as KF } from 'kalman-filter';

// #endregion

// #region GLOBAL VARIABLES
requestBluetoothPermission();         // Request Bluetooth Permission
const bleManager = new BleManager();  // Initialize BLE Manager
var kf2D = null;                      // Initialize 2D Kalman Filter
var kf = {                            // Initialize 1D Kalman Filters
  [BEACON_1_UUID]: null,
  [BEACON_2_UUID]: null,
  [BEACON_3_UUID]: null,
};
var cb = [];                          // Initialize calibration data array
// #endregion

export default function App() {
  // #region STATE AND REFS
  // STATE
  const [isRecording, setIsRecording] = useState(false);
  // Beacon information
  const [beaconDistances, setBeaconDistances] = useState({                 // Measured distances
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  const [beaconLastAdvTime, setBeaconLastAdvTime] = useState({             // Timestamps of last advertisement
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  const [beaconIndicatorColors, setBeaconIndicatorColors] = useState({     // Indicator colors of each beacon
    [BEACON_1_UUID]: 'blue',
    [BEACON_2_UUID]: 'blue',
    [BEACON_3_UUID]: 'blue',
  })
  const [filteredDistances, setFilteredDistances] = useState({             // Smoothed distances
    [BEACON_1_UUID]: 0,
    [BEACON_2_UUID]: 0,
    [BEACON_3_UUID]: 0,
  });
  // User position information
  const [gpsCoordinates, setGPSCoordinates] = useState(null);              // GPS coordinates
  const [previousState, setPreviousState] = useState(null);                // 2D Kalman Filter State
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);        // Measured position
  const [userCoordinates, setUserCoordinates] = useState({ x: 5, y: 5.5});  // Filtered position
  // User orientation information
  const [rotation, setRotation] = useState({ w: 0, x: 0, y: 0, z: 0 });    // Quaternion for the phones rotation
  const [direction2D, setDirection2D] = useState({ x: 0, y: 0 });          // Accelerometer projection to 2D
  // Magnetometer calibration information
  const [magnetometerReadings, setMagnetometerReadings] = useState([]);
  const [hasCollectedData, setHasCollectedData] = useState(false);
  // REFS 
  const direction2DRef = useRef(direction2D);
  const userCoordinatesRef = useRef(userCoordinates);
  const accelerometerDataRef = useRef({ x: 0, y: 0, z: 0 });
  const gyroscopeDataRef = useRef({ x: 0, y: 0, z: 0 });
  const magnetometerDataRef = useRef({ x: 0, y: 0, z: 0 });
  const rotationRef = useRef(rotation);
  const beaconDistancesRef = useRef(beaconDistances);
  const filteredDistancesRef = useRef(filteredDistances);
  const isRecordingRef = useRef(isRecording);
  const beaconLastAdvTimeRef = useRef(beaconLastAdvTime);
  const previousStateRef = useRef(previousState);
  const accelerometerSubscription = useRef(null); 
  const gyroscopeSubscription = useRef(null);
  const magnetometerSubscription = useRef(null);
  // REF UPDATE EFFECTS
  useEffect(() => { beaconDistancesRef.current = beaconDistances }, [beaconDistances]);
  useEffect(() => { isRecordingRef.current = isRecording }, [isRecording]);
  useEffect(() => { beaconLastAdvTimeRef.current = beaconLastAdvTime }, [beaconLastAdvTime]);
  useEffect(() => { filteredDistancesRef.current = filteredDistances }, [filteredDistances]);
  useEffect(() => { previousStateRef.current = previousState }, [previousState]);
  useEffect(() => { rotationRef.current = rotation }, [rotation]);
  useEffect(() => { userCoordinatesRef.current = userCoordinates }, [userCoordinates]);
  useEffect(() => { direction2DRef.current = direction2D }, [direction2D]);
  //#endregion
  
  // #region CALLBACKS
  // Start asynchronous BLE scanning
  useEffect(() => {
    scanForBeacons();
  
    // Setup clean-up function to stop BLE scanning on component unmount
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);
  // Start the 2D Kalman Filter with a 400ms interval
  useEffect(() => {
    const interval = setInterval(() => {
      updatePositionWith2DKFilter(previousStateRef.current, filteredDistancesRef.current, 2);
    }, 500);
  
    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  {/* 
  // Subscribe to GPS location data with a 500ms interval
  useEffect(() => {
    let locationSubscription;

    async function subscribeToLocationUpdates() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      } 

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 500,
          distanceInterval: 4,
        },
        (location) => {
          setGPSCoordinates(location);
          console.log(location);
        }
      );
    }

    subscribeToLocationUpdates();

    // Clean-up function to unsubscribe from location updates when the component unmounts
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);
  */}
  // Subscribe to accelerometer, gyroscrope, and magnetometer data 
  useEffect(() => {
    const gyroRate = 10000;
    const accRate = 350;
    const magRate = 350;
    
    const subscribeToAccelerometer = () => {
      Accelerometer.setUpdateInterval(accRate); 

      // Assign the accelerometerSubscription to the current property of the ref
      accelerometerSubscription.current = Accelerometer.addListener(accelerometerData => {
        accelerometerDataRef.current = accelerometerData;
      });
    };

    const subscribeToMagnetometer = () => {
      Magnetometer.setUpdateInterval(magRate); // Adjust the update interval as needed

      // Assign the magnetometerSubscription to the current property of the ref
      magnetometerSubscription.current = Magnetometer.addListener(magnetometerData => {
        magnetometerDataRef.current = magnetometerData;
        // Only collect data if we haven't already collected 100 points
        if (!hasCollectedData) {
          setMagnetometerReadings(prevReadings => {
            const updatedReadings = [...prevReadings, magnetometerData];
            if (updatedReadings.length === 10) {
              // We've collected 400 readings, now we save the data
              //cb = calibrateMagnetometer(updatedReadings)
              //saveAndShareCalibrationData(updatedReadings);
              // Set the hasCollectedData flag to true
              setHasCollectedData(true);
            }
            return updatedReadings;
          });
        }
      });
    };

    const subscribeToGyroscope = () => {
      Gyroscope.setUpdateInterval(gyroRate); 

      // Assign the gyroscopeSubscription to the current property of the ref
      gyroscopeSubscription.current = Gyroscope.addListener(gyroscopeData => {
        gyroscopeDataRef.current = gyroscopeData;
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
  // Compute device rotation with a 350 ms interval.
  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = performance.now();
      var { quaternion, dir2D, linearAcceleration } = computeRotationWithMag(accelerometerDataRef.current, magnetometerDataRef.current);
      if (linearAcceleration < 0.0001) linearAcceleration = 0;
      var newCoords;
      if(dir2D && quaternion) {
        setRotation(quaternion);
        setDirection2D(dir2D);
        newCoords = {
          x: userCoordinatesRef.current.x - dir2D.x * linearAcceleration * 10,
          y: userCoordinatesRef.current.y - dir2D.y * linearAcceleration * 10,
        };
      } else {
        newCoords = {
          x: userCoordinatesRef.current.x - direction2D.x * linearAcceleration * 10,
          y: userCoordinatesRef.current.y - direction2D.y * linearAcceleration * 10,
        };
        }
      }
    );
      console.log(`Device rotation computed in ${(performance.now() - startTime).toFixed(0)}ms`);
    }, 350);
  
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
        updatePositionWith1DKFilters(uuid, beaconDistancesRef.current, filteredDistancesRef.current, beaconLastAdvTimeRef.current);        
      }
    });
  };

  const updatePositionWith1DKFilters = (beaconId, beaconDistances, filteredDistances, beaconLastAdvTime) => {
    if (!kf[beaconId] && beaconDistances[beaconId] !== 0){
      // If KF is not initialized, initialize it
      kf[beaconId] = new KalmanFilter({R: processNoise, Q: beaconVariances[beaconId], x: beaconDistances[beaconId]});
    }else{ 
      const startTime = performance.now();
      // If KF is initialized, filter the distance 
      // Update measurement noise to trust lower distances more and higher distances less
      let measurementDifference = beaconDistances[beaconId] - filteredDistances[beaconId];      
      let measurementNoise = (measurementDifference > 0) ? 
        measurementNoise = ((0.8 * beaconVariances[beaconId]) * Math.log10(measurementDifference + 1)) + 1
      :
        measurementNoise = 1 / ((beaconVariances[beaconId] * -measurementDifference) + 1);
      
      if(beaconDistances[beaconId] > 5) {
        measurementNoise += (beaconDistances[beaconId] - 5);
      }  
      kf[beaconId].setMeasurementNoise(measurementNoise);

       // Update the process noise value based on the time since the last advertisement
      kf[beaconId].setProcessNoise(processNoise*(performance.now() - beaconLastAdvTime[beaconId])/beaconAdvertisingFrequency);

      // Compute the filtered position and update the state
      const computedPosition = kf[beaconId].filter(beaconDistances[beaconId]);
      setFilteredDistances(prevDistances => ({...prevDistances, [beaconId]: computedPosition}));
      //console.log(`1D Kalman Filter Computed in ${(performance.now() - startTime).toFixed(2)}ms`);
    }
  };

  const updatePositionWith2DKFilter = (previousState, filteredDistances, dt) => {
    // Initialize the 2D KF if all the 1D KFs have been initialized
    if(!kf2D && Object.values(kf).every(kf => kf !== null)){
      console.log("Initializing 2D Kalman Filter")
      initialPosition = reduceTo2D(calculatePosition(beaconCoords, filteredDistances));
      ConstantPosition2DKFOptions.dynamic.init.mean = [[userCoordinatesRef.current.x], [userCoordinatesRef.current.y]];
      ConstantPosition2DKFOptions.dynamic.init.covariance = ConstantPositionInitialCovariance;
      kf2D = new KF(ConstantPosition2DKFOptions);
    }else 
    // Update Kalman Filter if new measurements are available
    if (kf2D){ 
      const startTime = performance.now();
      // Get the observation
      const observation = reduceTo2D(calculatePosition(beaconCoords, filteredDistances));
      setMeasuredPosition(observation);
      // Get the current state prediction
      var predictedState;
      try {
        predictedState = kf2D.predict({previousCorrected: previousState}); // Get the current state prediction
      } catch (error) {
        console.log("Error: ", error);
      }
      // If the observation is within 10 meters of the state prediction, correct using the measurement vector
      if(Math.abs(observation[0] - predictedState.mean[0][0]) < 10 && Math.abs(observation[1] - predictedState.mean[1][0]) < 10){
        kf2D.observation.covariance = [[beaconMeasurementVariance, 0], [0, beaconMeasurementVariance]];
        kf2D.dynamic.covariance = [[processNoise * dt, 0], [0, processNoise * dt]];
        var correctedState;
        try {
          correctedState = kf2D.correct({observation, predicted: predictedState}); // Correct using the measurement vector
        } catch (error) {
          console.log("Error: ", error);
        }
        const clampedCoords = clampUserPosition(correctedState.mean[0][0], correctedState.mean[1][0]);
        correctedState.mean[0][0] = clampedCoords[0];
        correctedState.mean[1][0] = clampedCoords[1];
        setUserCoordinates({
          x: clampedCoords[0],
          y: clampedCoords[1],
        });
        setPreviousState(correctedState);
      }
      console.log(`2D Kalman Filter Computed in ${(performance.now() - startTime).toFixed(0)}ms`);
    }
  };
  //#endregion

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
      {/* SVG canvas for 2D map */}
      <View style={styles.svgContainer}>
        <SvgCanvas
          beaconCoords={beaconCoords}
          beaconDistances={filteredDistances}
          userCoordinates={userCoordinates}
          measurementCoords={measuredPosition}
          userDirection={direction2D}
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
    marginTop: 130,
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