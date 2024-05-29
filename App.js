import Mapbox from '@rnmapbox/maps';
Mapbox.setAccessToken('pk.eyJ1Ijoic3dhZHppIiwiYSI6ImNsd3BrZXd6MDFtM3gyanJpbjYwMzBrb2oifQ.sOCmULL3sykqPDj9ZTHwSg');
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity, TextInput, Animated} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { requestBluetoothPermission } from './permissions';
import { rssiToDistance, beaconUUIDs, initBeaconCoords, beaconVariance, beaconAdvFreq } from './beaconUtilities';
import { calculatePosition } from './positioningUtilities';
import { computeRotationWithMag } from './orientationUtilities';
import { ConstPosKFOptions, ConstPosKFInitCov, distanceBetweenPoints, findClosestIntersection, findClosestPath,
processNoise, KFFrequency, projectPointOntoLine, paths, findAllIntersections } from './kalmanFilterUtilities';
import KalmanFilter from 'kalmanjs';
import { KalmanFilter as KF } from 'kalman-filter';
import CustomPuck from './CustomPuck';
import styles from './styles';

// #region GLOBAL VARIABLES
const intersections = findAllIntersections(paths);                    // Find all intersections of paths
requestBluetoothPermission();                                         // Request Bluetooth Permission
const bleManager = new BleManager();                                  // Initialize BLE Manager
var kf2D = null;                                                      // Initialize 2D Kalman Filter
var kf = {};                                                          // Initialize 1D Kalman Filters for all beacons
beaconUUIDs.forEach(id => kf[id] = null);                             
var cb = [];                                                          // Initialize calibration data array
// #endregion           

export default function App() {
  // #region STATE
  // Mapbox
  const [mapZoom, setMapZoom] = useState(21);
  const [mapBearing, setMapBearing] = useState(0);
  // Permission 
  const [locationPermission, setLocationPermission] = useState(null);
  // Beacons
  const [selectedBeacon, setSelectedBeacon] = useState(null);
  const [zCoordinate, setZCoordinate] = useState('');                      // Z coordinate for selected beacon
  const [beaconDistances, setBeaconDistances] = useState({});              // Measured distances for each beacon
  const [beaconCoords, setBeaconCoords] = useState(initBeaconCoords);      // Beacon coordinates 
  const [beaconLastAdvTime, setBeaconLastAdvTime] = useState({})           // Timestamps of last advertisement
  // Kalman Filter information
  const [previousState, setPreviousState] = useState(null);                // 2D Kalman Filter State
  const [filteredDistances, setFilteredDistances] = useState({})           // Smoothed 1D distances

  // User position information
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);        // Measured coordinates
  const [correctedPosition, setCorrectedPosition] = useState([0, 0]);      // Corrected coordinates
  const [userCoordinates, setUserCoordinates] = useState(null);            // Users coordinates
  const [APICoordinates, setAPICoordinates] = useState(null);              // Coordinates received from expo-location
  const [rotation, setRotation] = useState({ w: 0, x: 0, y: 0, z: 0 });    // Users 3D rotation
  const [heading, setHeading] = useState(0);                               // Users 2D heading
  // #endregion
  // #region REFS 
  const currentPath = useRef(null);
  const lastPathSwitchTime = useRef(performance.now());
  const animatedUserCoordinates = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const beaconCoordsRef = useRef(beaconCoords);
  const userCoordinatesRef = useRef(userCoordinates);
  const APICoordinatesRef = useRef(APICoordinates);
  const rotationRef = useRef(rotation);
  const beaconDistancesRef = useRef(beaconDistances);
  const filteredDistancesRef = useRef(filteredDistances);
  const beaconLastAdvTimeRef = useRef(beaconLastAdvTime);
  const previousStateRef = useRef(previousState);
  // REF UPDATE EFFECTS
  useEffect(() => { APICoordinatesRef.current = APICoordinates }, [APICoordinates]);
  useEffect(() => { beaconCoordsRef.current = beaconCoords }, [beaconCoords]);
  useEffect(() => { beaconLastAdvTimeRef.current = beaconLastAdvTime }, [beaconLastAdvTime]);
  useEffect(() => { previousStateRef.current = previousState }, [previousState]);
  useEffect(() => { rotationRef.current = rotation }, [rotation]);
  useEffect(() => { userCoordinatesRef.current = userCoordinates }, [userCoordinates]);
  useEffect(() => { filteredDistancesRef.current = filteredDistances }, [filteredDistances]);
  useEffect(() => { beaconDistancesRef.current = beaconDistances }, [beaconDistances]);
  //#endregion
  // #region EFFECTS
  // Smoothly update animated coordinates
  useEffect(() => {
    if (userCoordinates) {
      Animated.timing(animatedUserCoordinates, {
        toValue: { x: userCoordinates[0], y: userCoordinates[1] },
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [userCoordinates]);
  // Load saved coordinates on component mount
  useEffect(() => {
  const loadCoordinates = async () => {
    try {
      const savedCoords = await AsyncStorage.getItem('beaconCoords');
      if (savedCoords) {
        setBeaconCoords(JSON.parse(savedCoords));
      } else {
        setBeaconCoords(initBeaconCoords);
      }
    } catch (error) {
      console.error('Failed to load beacon coordinates:', error);
    }
  };
  loadCoordinates();
  }, []);
  // Location Permission Effect
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      setLocationPermission(status === 'granted');
    })();
  }, []);
  // Fetch User Location and Heading
  useEffect(() => {
    let locationSubscription;
    let headingSubscription;
  
    if (locationPermission) {
      (async () => {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 200,
            distanceInterval: 0.1
          },
          (location) => {
            const { latitude, longitude } = location.coords;
            setAPICoordinates([longitude, latitude]);
          }
        );
  
        headingSubscription = await Location.watchHeadingAsync((headingData) => {
          setHeading(headingData.trueHeading);
        });
      })();
    }
  
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, [locationPermission]);
  // Start BLE scanning
  useEffect(() => {
    scanForBeacons();
  
    // Setup clean-up function to stop BLE scanning on component unmount
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);
  // Start 2D Kalman Filter
  useEffect(() => {
    const interval = setInterval(() => {
      updateKFWithBLE(previousStateRef.current, filteredDistancesRef.current);
    }, KFFrequency * 1000);
  
    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  // #endregion
  // #region FUNCTIONS
  const scanForBeacons = async () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Error: ', error);
        return;
      }
      // Check if the device name follows the pattern "KBPro_275849", "KBPro_275850", etc.
      const deviceName = device.name;
      if (deviceName && deviceName.startsWith('KBPro_')) {
  
        // Get the UUID of the beacon from the name 
        const uuid = deviceName.split('_')[1]; 
  
        // Update the distance, timestamp, and beacon indicators
        setBeaconDistances(prevDistance => ({
          ...prevDistance,
          [uuid]: rssiToDistance(device.rssi)
        }));
        setBeaconLastAdvTime(prevTimers => ({
          ...prevTimers,
          [uuid]: performance.now()
        }));
  
        // Filter the distance using the Kalman Filter
        filterDistance(uuid, beaconDistancesRef.current, filteredDistancesRef.current, beaconLastAdvTimeRef.current);
      }
    });

    // Stop and restart scanning every 190ms second to ensure continuous updates on iOS
    setTimeout(() => {
      bleManager.stopDeviceScan();
      scanForBeacons();
    }, 190);
  };
  const filterDistance = (beaconId, beaconDistances, filteredDistances, beaconLastAdvTime) => {
    if (!kf[beaconId] && beaconDistances[beaconId] !== 0)
      // If KF is not initialized, initialize it
      kf[beaconId] = new KalmanFilter({R: processNoise, Q: beaconVariance, x: beaconDistances[beaconId]});
    else{ 
      const startTime = performance.now();
      // If KF is initialized, filter the distance 
      // Update measurement noise to trust lower distances more and higher distances less
      let measurementDifference = beaconDistances[beaconId] - filteredDistances[beaconId];      
      let measurementNoise = (measurementDifference > 0) ? 
        measurementNoise = ((0.8 * beaconVariance) * Math.log10(measurementDifference + 1)) + 1
      :
        measurementNoise = 1 / ((beaconVariance * -measurementDifference) + 1);
      
      if(beaconDistances[beaconId] > 5) {
        measurementNoise += (beaconDistances[beaconId] - 5);
      }  
      kf[beaconId].setMeasurementNoise(measurementNoise);

       // Update the process noise value based on the time since the last advertisement
      kf[beaconId].setProcessNoise(processNoise*(performance.now() - beaconLastAdvTime[beaconId])/beaconAdvFreq);

      // Compute the filtered position and update the state
      const computedPosition = kf[beaconId].filter(beaconDistances[beaconId]);
      
      // Check if Computed Position is NaN
      if (isNaN(computedPosition)) {
        console.log('KF Computed NaN');
        return;
      }

      setFilteredDistances(prevDistances => ({...prevDistances, [beaconId]: computedPosition}));
    }
  };
  const updateKFWithBLE = (previousCorrected, filteredDistances) => {
    const startTime = performance.now();
    if (kf2D) {
      // PREDICT
      let predicted = kf2D.predict({ previousCorrected });
  
      // OBSERVE
      var observation = calculatePosition(beaconCoordsRef.current, filteredDistances);
      if (!observation) {
        console.log('BLE observation failed. Not enough beacons in range.');
        return;
      }
      setMeasuredPosition(observation);

      observation = [APICoordinatesRef.current[0], APICoordinatesRef.current[1]];
  
      // CORRECT
      const corrected = kf2D.correct({ predicted, observation });
  
      setCorrectedPosition([corrected.mean[0][0], corrected.mean[1][0]]); 
  
      // CONSTRAIN CORRECTED POSITION TO PATH
      
      // Initialize the current path to the closest path if it is not set
      if (!currentPath.current) {
        const newCurrentPath = findClosestPath(corrected.mean[0][0], corrected.mean[1][0], paths);
        currentPath.current = newCurrentPath;
        lastPathSwitchTime.current = performance.now();
        console.log('Current Path Initialized: ', newCurrentPath);
      }
  
      // Find the closest intersection to the corrected position
      const closestIntersection = findClosestIntersection(corrected.mean[0][0], corrected.mean[1][0], intersections);
      // Check if the closest intersection is within 1.2m of the corrected position
      if (distanceBetweenPoints(corrected.mean[0][0], corrected.mean[1][0], closestIntersection.x, closestIntersection.y) < 0.00003) {
        // Find the closest path to the corrected position
        const closestPath = findClosestPath(corrected.mean[0][0], corrected.mean[1][0], paths);
        // Update the current path to the closest path
        currentPath.current = closestPath;
      }
  
      // Project the corrected position onto the current path
      const projectedPoint = projectPointOntoLine(corrected.mean[0][0], corrected.mean[1][0], currentPath.current[0][0], currentPath.current[0][1], currentPath.current[1][0], currentPath.current[1][1]);
  
      // Update the corrected position to the projected point
      corrected.mean[0][0] = projectedPoint.x;
      corrected.mean[1][0] = projectedPoint.y;
  
      // Update state
      setPreviousState(corrected);
      setUserCoordinates([corrected.mean[0][0], corrected.mean[1][0]]);
      console.log(`BLE KF Computed in ${(performance.now() - startTime).toFixed(0)}ms`);
    } else
    // Initialize the KF if at least 3 beacons are online
    if (Object.keys(filteredDistances).length >= 3) {
      // Get measured position
      const initialPosition = calculatePosition(beaconCoordsRef.current, filteredDistances);
      if (!initialPosition) return;
      // Create the KF object
      ConstPosKFOptions.dynamic.init.mean = [[initialPosition[0]], [initialPosition[1]]];
      ConstPosKFOptions.dynamic.init.covariance = ConstPosKFInitCov;
      kf2D = new KF(ConstPosKFOptions);

      // Update state
      setUserCoordinates(initialPosition);
      setPreviousState(kf2D.state);
    }
  };
  // #endregion
  // #region Control Beacons UI
  const handleBeaconSelect = (beaconId) => {
    setSelectedBeacon(beaconId);
  const zValue = beaconCoords[beaconId][2] != null ? beaconCoords[beaconId][2].toString() : '';
    setZCoordinate(zValue);
  };
  const moveSelectedBeacon = (direction) => {
    if (selectedBeacon) {
      setBeaconCoords((prevCoords) => {
        const [x, y, z] = prevCoords[selectedBeacon];
        const radians = (mapBearing * Math.PI) / 180;
        let dx = 0;
        let dy = 0;
  
        switch (direction) {
          case 'up':
            dx = Math.sin(radians) * 0.000004;
            dy = Math.cos(radians) * 0.000004;
            break;
          case 'down':
            dx = -Math.sin(radians) * 0.000004;
            dy = -Math.cos(radians) * 0.000004;
            break;
          case 'left':
            dx = -Math.cos(radians) * 0.000004;
            dy = Math.sin(radians) * 0.000004;
            break;
          case 'right':
            dx = Math.cos(radians) * 0.000004;
            dy = -Math.sin(radians) * 0.000004;
            break;
          default:
            break;
        }
  
        const newCoords = [x + dx, y + dy, z];
        const updatedCoords = { ...prevCoords, [selectedBeacon]: newCoords };
        saveCoordinates(updatedCoords);
        return updatedCoords;
      });
    }
  };
  const updateZCoordinate = (zValue) => {
    if (selectedBeacon) {
      setBeaconCoords((prevCoords) => {
        const [x, y] = prevCoords[selectedBeacon];
        const updatedCoords = { ...prevCoords, [selectedBeacon]: [x, y, parseFloat(zValue)] };
        saveCoordinates(updatedCoords);
        return updatedCoords;
      });
      setZCoordinate(zValue);
    }
  };
  const handleUnselectBeacon = () => {
    setSelectedBeacon(null);
  };
  const saveCoordinates = async (coords) => {
    try {
      await AsyncStorage.setItem('beaconCoords', JSON.stringify(coords));
    } catch (error) {
      console.error('Failed to save beacon coordinates:', error);
    }
  };
  const handleZCoordinateSubmit = () => {
    updateZCoordinate(zCoordinate);
  };
  //#endregion

  return (
    <View style={styles.container}>
      { /* Map */}
      <Mapbox.MapView
        styleURL={"mapbox://styles/swadzi/clwrgsi0905fr01qgcvys3f3h"}
        compassEnabled={true}
        compassFadeWhenNorth={true}
        style={styles.map}
        onCameraChanged={(region) => {
          setMapBearing(region.properties.heading);
          setMapZoom(region.properties.zoom);
        }}
      >
        { /* Final User Position */}
        { userCoordinates && animatedUserCoordinates.x._value !== 0 && locationPermission && (
          <CustomPuck 
            id="user-location" 
            heading={heading - mapBearing} 
            zoom={mapZoom} 
            coordinates={[animatedUserCoordinates.x._value, animatedUserCoordinates.y._value]}
            type={1} 
          />
        )}
        { /* Measured Position */}
        {measuredPosition && (
          <Mapbox.MarkerView
            id="measured-position"
            coordinate={measuredPosition}
            allowOverlap={true}
          >
            <View style={styles.measuredPositionContainer}>
              <View style={styles.measuredPositionMarker} />
            </View>
          </Mapbox.MarkerView>
        )}
        { /* Corrected Position */}
        {correctedPosition && (
          <Mapbox.MarkerView
            id="corrected-position"
            coordinate={correctedPosition}
            allowOverlap={true}
          >
            <View style={styles.correctedPositionContainer}>
              <View style={styles.correctedPositionMarker} />
            </View>
          </Mapbox.MarkerView>
        )}
        { /* Beacon Markers */}
        {beaconCoords && Object.keys(beaconCoords).map((beaconId) => (
          (performance.now() - beaconLastAdvTime[beaconId] < 3000) && (
            <Mapbox.MarkerView
              id={beaconId}
              key={beaconId}
              coordinate={beaconCoords[beaconId]}
              allowOverlap={true}
            >
              <View style={styles.beaconContainer}>
                <View 
                  style={{
                    backgroundColor: 'red',
                    borderRadius: 50,
                    width: selectedBeacon === beaconId ? 28 : 20,
                    height: selectedBeacon === beaconId ? 28 : 20,
                    borderWidth: selectedBeacon === beaconId ? 4 : 1, 
                    borderColor: 'white', 
                  }}
                  onTouchEnd={() => handleBeaconSelect(beaconId)}
                />
                <Text style={styles.beaconText}>{beaconId}</Text>
              </View>
            </Mapbox.MarkerView>
          )
        ))}
        { /* Camera Component */}
        <Mapbox.Camera zoomLevel={20.8} centerCoordinate={[-81.312420, 43.014216]} />
      </Mapbox.MapView>
      { /* Control Beacon Positions */}
      {selectedBeacon && (  
        <View style={styles.buttonContainer}>
          <View style={styles.zCoordinateContainer}>
            <Text style={styles.zCoordinateLabel}>Height:</Text>
            <TextInput
              style={styles.zCoordinateInput}
              value={zCoordinate} 
              onChangeText={setZCoordinate}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleZCoordinateSubmit}
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.invisibleButton} onPress={handleUnselectBeacon}>
              <Text style={styles.buttonText}></Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => moveSelectedBeacon('up')}>
              <Text style={styles.buttonText}>↑</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.unselectButton} onPress={handleUnselectBeacon}>
              <Text style={styles.buttonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={() => moveSelectedBeacon('left')}>
              <Text style={styles.buttonText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => moveSelectedBeacon('down')}>
              <Text style={styles.buttonText}>↓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => moveSelectedBeacon('right')}>
              <Text style={styles.buttonText}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
} 
