// #region IMPORTS
import { requestBluetoothPermission } from './src/utilities/misc/permissions';
requestBluetoothPermission();
// STYLE IMPORTS
import styles from './src/styles/layoutStyles';
// PACKAGE IMPORTS
import { point } from '@turf/helpers';
import { getCoords, destination, distance, bearing as turfBearing } from '@turf/turf';
import Mapbox from '@rnmapbox/maps';
Mapbox.setAccessToken('pk.eyJ1Ijoic3dhZHppIiwiYSI6ImNseWYzcHFjeDA0YnkyanBya3ExM2hiazMifQ.uSpLcW2LozymWvzI3NR2pw');
import * as Location from 'expo-location';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx';
// UTILITY IMPORTS
import { NavigationModule } from './src/utilities/nav/NavigationModule';
import { graph, printGraph } from './src/utilities/nav/navigationUtilities'
import { rssiToDistance, initBeaconCoords, } from './src/utilities/beacons/beaconUtilities';
import { dtBLE, dtAPI } from './src/utilities/kalman-filter/kalmanFilterSettings';
import { filterRSSI, updateKFWithBLE, updateKFWithAPI } from './src/utilities/kalman-filter/kalmanFilterHelpers';
// COMPONENT IMPORTS
import CustomPuck from './src/components/map/dynamic/CustomPuck';
import NavigationPath from './src/components/map/dynamic/NavigationPath';
import StaticMapComponents from './src/components/map/static/StaticMapComponents';
import BeaconMarkers from './src/components/map/dynamic/BeaconMarkers';
import ControlBeaconUI from './src/components/ui//MoveBeaconUI';
import SearchUI from './src/components/ui/SearchUI';
import FloorControlButtons from './src/components/ui/SwitchFloorUI';
// #endregion

// GLOBAL
const bleManager = new BleManager();
const navigationManager = new NavigationModule(graph.edges, graph.nodes); 
const testPath = navigationManager.dijkstra("-1A", "-1E");

const initDistToNextNode = distance(point(testPath[1].coordinates), point(testPath[2].coordinates), { units: 'meters' }) / 2;
const initUserCoords = destination(point(testPath[1].coordinates), initDistToNextNode / 1000, turfBearing(point(testPath[1].coordinates), point(testPath[2].coordinates))).geometry.coordinates;

export default function App() {
  // #region STATE & REFS
  // User Location
  const [userCoordinates, setUserCoordinates] = useState(initUserCoords);            // State for User coordinates
  const userCoordinatesRef = useRef(userCoordinates);                                // Ref for User coordinates
  const [userFloor, setUserFloor] = useState(-1);                                    // Users floor
  const userFloorRef = useRef(userFloor);                                            // Ref for users floor
  const [heading, setHeading] = useState(0);                                         // Users heading
  const [correctedPosition, setCorrectedPosition] = useState([0, 0]);                // KF Corrected coordinates
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);                  // Measured coordinates
  const [APICoordinates, setAPICoordinates] = useState(null);                        // Coordinates from Apple API
  const APICoordinatesRef = useRef(APICoordinates);                                  // Ref for API coordinates
  // Navigation        
  const [navigationPath, setNavigationPath] = useState(testPath);                    // Navigation Path
  const [nextNode, setNextNode] = useState(testPath[2].id)                           // Next Node in Navigation Path
  const nextNodeRef = useRef(nextNode);                                              // Ref for next node
  const [prevNode, setPrevNode] = useState(testPath[1].id)                           // Previous Node in Navigation Path
  const prevNodeRef = useRef(prevNode);                                              // Ref for previous node
  // Beacons         
  const [selectedBeacon, setSelectedBeacon] = useState(null);                        // Selected beacon for adjusting coordinates
  const [zCoordinate, setZCoordinate] = useState('');                                // Z coordinate for selected beacon
  const [beaconCoords, setBeaconCoords] = useState(initBeaconCoords);                // Coordinates of each beacon (synched to storage)
  const beaconCoordsRef = useRef(beaconCoords);                                      // Ref for beacon coordinates
  const RSSIsRef = useRef({});                                                       // Ref for beacon RSSIs          
  const filteredRSSIsRef = useRef({});                                               // Ref for filtered RSSIs
  const beaconLastAdvTimeRef = useRef({});                                           // Ref for last advertisement time 
   // Mapbox         
   const [useLayerStyle, setUseLayerStyle] = useState(true);                         // Whether to use floor specific styles
   const [floor, setFloor] = useState(-1);                                           // Which floor to display
   const [mapZoom, setMapZoom] = useState(21);                                       // Camera zoom level
   const [mapBearing, setMapBearing] = useState(0);                                  // Camera bearing
   const [mapPitch, setMapPitch] = useState(0);                                      // Camera pitch
   const [mapCenter, setMapCenter] = useState([-81.276640, 43.008250]);              // Camera center
   const [showCompass, setShowCompass] = useState(true);                             // Whether to show compass
  // Perms        
  const [locationPermission, setLocationPermission] = useState(null);                // Location Permission Status
  
  useEffect(() => { nextNodeRef.current = nextNode }, [nextNode]);
  useEffect(() => { prevNodeRef.current = prevNode }, [prevNode]);
  useEffect(() => { userFloorRef.current = userFloor }, [userFloor]);
  useEffect(() => { APICoordinatesRef.current = APICoordinates }, [APICoordinates]);
  useEffect(() => { beaconCoordsRef.current = beaconCoords }, [beaconCoords]);
  useEffect(() => { userCoordinatesRef.current = userCoordinates }, [userCoordinates]);
  //#endregion
  // #region EFFECTS
  // Start BLE scanning
  useEffect(() => {
    receiveBLEAdvertisments();

    // Setup clean-up function to stop BLE scanning on component unmount
    return () => {
      bleManager.stopDeviceScan();
    };
  }, []);
  // Start Kalman Filtering with BLE
  useEffect(() => {
    const interval = setInterval(() => {
      //updateKFWithBLE(filteredRSSIsRef.current, beaconCoordsRef.current, userFloorRef.current, userCoordinatesRef.current, setUserCoordinates, setMeasuredPosition, setCorrectedPosition, nextNode, setNextNode);
    }, dtBLE * 1000);

    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  // Start Kalman Filtering with API
  useEffect(() => {
    if(APICoordinatesRef.current) {
      updateKFWithAPI(APICoordinatesRef.current, setMeasuredPosition, setCorrectedPosition, setUserCoordinates, prevNodeRef.current, setPrevNode, nextNodeRef.current, setNextNode);
    }
  }, [APICoordinates]);
  // Start retrieving location and heading from API
  useEffect(() => {
    let locationSubscription;
    let headingSubscription;

    if (locationPermission) {
      (async () => {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: dtAPI * 1000,
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
  // Load saved beacon coordinates
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
  // Get Location Permission
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
  //#endregion
  // #region HANDLERS
  const receiveBLEAdvertisments = async () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) { console.log('Error starting BLE scan: ', error); return; }

      const deviceName = device.name;
      if (deviceName && deviceName.startsWith('KBPro_')) {

        // Get the ID of the beacon from its name
        const id = deviceName.split('_')[1];

        // Update the beacons RSSI and timestamp
        RSSIsRef.current[id] = device.rssi;
        beaconLastAdvTimeRef.current[id] = performance.now();

        // Filter the distance using the Kalman Filter
        const filteredValue = filterRSSI(id, RSSIsRef.current[id], filteredRSSIsRef.current[id], beaconLastAdvTimeRef.current[id]);
        if (filteredValue !== undefined) {
          filteredRSSIsRef.current[id] = filteredValue;
        }
      }
    });

    // Stop and restart scanning every 190ms second to ensure continuous updates on iOS
    setTimeout(() => {
      bleManager.stopDeviceScan();
      receiveBLEAdvertisments();
    }, 190);
  };

  const handleBeaconSelect = (beaconId) => {
    setSelectedBeacon(beaconId);
    const zValue = beaconCoords[beaconId][2] != null ? beaconCoords[beaconId][2].toString() : '';
    setZCoordinate(zValue);
  };

  const handleStyleChange = (useLayerStyle) => {

    // Override console.error to suppress Mapbox errors
    const originalConsoleError = console.error;
    console.error = (message) => {
      if (typeof message === 'string' && (message.includes('Mapbox'))) 
        return; // Suppress Mapbox errors
      
      // Allow other errors to be logged
      originalConsoleError(message);
    };

    setUseLayerStyle(useLayerStyle);

    setTimeout(() => {
      console.error = originalConsoleError; // Restore the original console.error method
    }, 1000); // Allow time for style change and possible errors
  };
  //#endregion

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        styleURL={useLayerStyle ? "mapbox://styles/swadzi/clxy37bk9002m01qrgjtk51f0" : "mapbox://styles/swadzi/clxo1law802qp01qm30cz1u9a"}
        compassFadeWhenNorth={true}
        compassEnabled={showCompass}
        compassPosition={{ top: 80, right: 25 }}
        scaleBarEnabled={true}
        scaleBarPosition={{ bottom: 0, right: 75 }}
        style={styles.map}
        onCameraChanged={(region) => {
          setMapBearing(region.properties.heading);
          setMapZoom(region.properties.zoom);
          setMapPitch(region.properties.pitch);
          setMapCenter(region.properties.center);
        }}
      >
        <NavigationPath navigationPath={navigationPath} floor={floor} nextNode={nextNode} userCoordinates={userCoordinates} />

        <CustomPuck floor={floor} userFloor={userFloor} coordinates={userCoordinates} heading={heading} />

        {APICoordinates && (
          <Mapbox.MarkerView
            id="api-coordinates"
            coordinate={APICoordinates}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={true}
          >
            <TouchableOpacity
              style={{ backgroundColor: 'red', padding: 2, borderRadius: 3 }}
              onPress={() => console.log('API Coordinates Marker Pressed')}
            >
              <Text style={{ color: 'white', fontSize: 10 }}>API</Text>
            </TouchableOpacity>
          </Mapbox.MarkerView>
        )}

        {measuredPosition && (
          <Mapbox.MarkerView
            id="measured-position"
            coordinate={measuredPosition}
            anchor={{ x: 0.5, y: 0.5 }}
            allowOverlap={true}
          >
            <TouchableOpacity
              style={{ backgroundColor: 'blue', padding: 2, borderRadius: 3 }}
              onPress={() => console.log('Measured Position Marker Pressed')}
            >
              <Text style={{ color: 'white', fontSize: 10 }}>Measured</Text>
            </TouchableOpacity>
          </Mapbox.MarkerView>
        )}

        <BeaconMarkers beaconCoords={beaconCoords} beaconLastAdvTime={beaconLastAdvTimeRef.current} selectedBeacon={selectedBeacon} handleBeaconSelect={handleBeaconSelect} />
        
        {useLayerStyle && ( <StaticMapComponents floor={floor} pitch={mapPitch} zoom={mapZoom} bearing={mapBearing} center={mapCenter}/> )}
        
        <Mapbox.Camera zoomLevel={19} centerCoordinate={[-81.312396521, 43.014162449]} animationDuration={4000} animationMode={'flyTo'} />
        
      </Mapbox.MapView>

      <FloorControlButtons floor={floor} setFloor={setFloor} useLayerStyle={useLayerStyle} setUseLayerStyle={handleStyleChange} />

      <SearchUI setShowCompass={setShowCompass} />

      <ControlBeaconUI
        selectedBeacon={selectedBeacon}
        setSelectedBeacon={setSelectedBeacon}
        beaconCoords={beaconCoords}
        setBeaconCoords={setBeaconCoords}
        mapBearing={mapBearing}
        setZCoordinate={setZCoordinate}
        zCoordinate={zCoordinate}
      />

      {/*<View style={styles.debugTextContainer}> 
        <Text style={styles.debugTextStyle}>
          Pitch: {mapPitch.toFixed(6)} {"\n"}
          Zoom: {mapZoom.toFixed(6)} {"\n"}
        </Text>
      </View>*/}
    </View>
  );
}