import { requestBluetoothPermission } from './src/utilities/misc/permissions';
requestBluetoothPermission();
// STYLE IMPORTS
import styles from './src/styles/layoutStyles';
// PACKAGE IMPORTS
import Mapbox from '@rnmapbox/maps';
Mapbox.setAccessToken('pk.eyJ1Ijoic3dhZHppIiwiYSI6ImNseWYzcHFjeDA0YnkyanBya3ExM2hiazMifQ.uSpLcW2LozymWvzI3NR2pw');
import * as Location from 'expo-location';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager } from 'react-native-ble-plx';
// UTILITY IMPORTS
import { NavigationModule } from './src/utilities/nav/NavigationModule';
import { graph, printGraph } from './src/utilities/nav/navigationUtilities'
import { rssiToDistance, initBeaconCoords, } from './src/utilities/beacons/beaconUtilities';
import { KFFrequency } from './src/utilities/kalman-filter/kalmanFilterSettings';
import { filterDistance, updateKFWithBLE } from './src/utilities/kalman-filter/kalmanFilterHelpers';
import { initUserCoords } from './src/utilities/positioning/positioningUtilities';
// COMPONENT IMPORTS
import CustomPuck from './src/components/map/dynamic/CustomPuck';
import NavigationPath from './src/components/map/dynamic/NavigationPath';
import StaticMapComponents from './src/components/map/static/StaticMapComponents';
import BeaconMarkers from './src/components/map/dynamic/BeaconMarkers';
import ControlBeaconUI from './src/components/ui//MoveBeaconUI';
import SearchUI from './src/components/ui/SearchUI';
import FloorControlButtons from './src/components/ui/SwitchFloorUI';
import RectangleBOI from './src/components/map/dynamic/RectangleBOI';
import ThreeJSScene from './src/components/ThreeJSScene';


// GLOBAL
const bleManager = new BleManager();
var navigationManager = new NavigationModule(graph.edges, graph.nodes); 
var testPath = navigationManager.dijkstra("A", "E");

export default function App() {
  // #region STATE & REFS
  // Mapbox
  const [POICoordinates, setPOICoordinates] = useState(null);               // Coordinates of the selected POI
  const [mapZoom, setMapZoom] = useState(21);                               // Camera zoom level
  const [mapBearing, setMapBearing] = useState(0);                          // Camera bearing
  const [mapPitch, setMapPitch] = useState(0);                              // Camera pitch
  const [mapCenter, setMapCenter] = useState([-81.276640, 43.008250]);      // Camera center
  const [showCompass, setShowCompass] = useState(true);                     // Whether to show compass
  const [floor, setFloor] = useState(1);                                    // Which floor to display
  const [useLayerStyle, setUseLayerStyle] = useState(true);                // Whether to use floor specific style
  // User Location
  const [userCoordinates, setUserCoordinates] = useState(initUserCoords);   // Final User coordinates
  const [correctedPosition, setCorrectedPosition] = useState([0, 0]);       // Corrected coordinates
  const [measuredPosition, setMeasuredPosition] = useState([0, 0]);         // Measured coordinates
  const [APICoordinates, setAPICoordinates] = useState(null);               // Coordinates from Apple API
  const [heading, setHeading] = useState(0);                                // Users heading
  const [userFloor, setUserFloor] = useState(1);                            // Users floor
  // Beacons
  const [selectedBeacon, setSelectedBeacon] = useState(null);               // Selected beacon for adjusting coordinates
  const [zCoordinate, setZCoordinate] = useState('');                       // Z coordinate for selected beacon
  const [beaconCoords, setBeaconCoords] = useState(initBeaconCoords);       // Coordinates of each beacon (synched to storage)
  const [navigationPath, setNavigationPath] = useState(testPath);           // Navigation Path
  // Permission
  const [locationPermission, setLocationPermission] = useState(null);       // Location Permission Status

  // REFS
  const beaconCoordsRef = useRef(beaconCoords);
  const userCoordinatesRef = useRef(userCoordinates);
  const APICoordinatesRef = useRef(APICoordinates);
  const beaconDistancesRef = useRef({});
  const filteredDistancesRef = useRef({});
  const beaconLastAdvTimeRef = useRef({});

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
  // Start 2D Localization Kalman Filter
  useEffect(() => {
    const interval = setInterval(() => {
      updateKFWithBLE(filteredDistancesRef.current, beaconCoordsRef.current, setMeasuredPosition, setCorrectedPosition, setUserCoordinates);
    }, KFFrequency * 1000);

    // Clear interval on component unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  // Fetch User Location and Heading from Apple API
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
  // Load in saved beacon coordinates
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
  //#endregion
  // #region HANDLERS
  const receiveBLEAdvertisments = async () => {
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) { console.log('Error starting BLE scan: ', error); return; }

      const deviceName = device.name;
      if (deviceName && deviceName.startsWith('KBPro_')) {

        // Get the ID of the beacon from its name
        const id = deviceName.split('_')[1];

        // Update the distance, timestamp, and beacon indicators
        beaconDistancesRef.current[id] = rssiToDistance(device.rssi);
        beaconLastAdvTimeRef.current[id] = performance.now();

        // Filter the distance using the Kalman Filter
        const filteredValue = filterDistance(id, beaconDistancesRef.current[id], filteredDistancesRef.current[id], beaconLastAdvTimeRef.current[id]);
        if (filteredValue !== undefined) {
          filteredDistancesRef.current[id] = filteredValue;
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
        styleURL={useLayerStyle ? "mapbox://styles/swadzi/clyytqr6p019s01nx8vq2110o" : "mapbox://styles/swadzi/clxo1law802qp01qm30cz1u9a"}
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
        {/*<NavigationPath navigationPath={navigationPath} floor={floor} />*/}

        <CustomPuck floor={floor} userFloor={userFloor} coordinates={userCoordinates} heading={heading} />

        <BeaconMarkers beaconCoords={beaconCoords} beaconLastAdvTime={beaconLastAdvTimeRef.current} selectedBeacon={selectedBeacon} handleBeaconSelect={handleBeaconSelect} />
        
        {useLayerStyle && ( <StaticMapComponents floor={floor} pitch={mapPitch} zoom={mapZoom} bearing={mapBearing} center={mapCenter}/> )}
        
        <Mapbox.Camera zoomLevel={19} centerCoordinate={[-81.276640, 43.008250]} animationDuration={4000} animationMode={'flyTo'} />
        
        <RectangleBOI cameraCenter={mapCenter} mapBearing={mapBearing} />
      </Mapbox.MapView>

      <FloorControlButtons floor={floor} setFloor={setFloor} useLayerStyle={useLayerStyle} setUseLayerStyle={handleStyleChange} />

      {/*<SearchUI setPOICoordinates={setPOICoordinates} setShowCompass={setShowCompass} />*/}

      <ControlBeaconUI
        selectedBeacon={selectedBeacon}
        setSelectedBeacon={setSelectedBeacon}
        beaconCoords={beaconCoords}
        setBeaconCoords={setBeaconCoords}
        mapBearing={mapBearing}
        setZCoordinate={setZCoordinate}
        zCoordinate={zCoordinate}
      />

      <ThreeJSScene floor={floor} pitch={mapPitch} zoom={mapZoom} bearing={mapBearing} center={mapCenter} />

      <View style={styles.debugTextContainer}> 
        <Text style={styles.debugTextStyle}>
          Pitch: {mapPitch.toFixed(6)} {"\n"}
          Zoom: {mapZoom.toFixed(6)} {"\n"}
        </Text>
      </View>
    </View>
  );
}