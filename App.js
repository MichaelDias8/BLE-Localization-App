import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid } from 'react-native';
import { useState, useEffect } from 'react';
import { BleManager } from 'react-native-ble-plx';
import { KalmanFilter } from 'kalman-filter';
import { reduceToTwoDimensions, getBeaconDistances} from './utilities';
import { ConstantVelocityDiscrete2DKFilterOptions } from './kalmanFilterOptions';
import { calculatePosition } from './trilateration';

async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This App needs access to your location ' +
          'so we can know where you are.'
      }
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('You can use the location');
    } else {
      console.log('Location permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
}
requestLocationPermission();

const manager = new BleManager();
const KalmanFilter = new KalmanFilter(ConstantVelocityDiscrete2DKFilterOptions);

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('Searching...');
  const [deviceID, setDeviceID] = useState();
  const [userCoordinates, setUserCoordinates] = useState({ x: 0, y: 0 });
  const [beaconCoords, setBeaconCoords] = useState([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  useEffect(() => {


    const initialPosition = reduceToTwoDimensions(calculatePosition(beaconCoords, getBeaconDistances()));
    setUserCoordinates(initialPosition);
    KalmanFilter.dynamic.init.mean = [initialPosition.x, initialPosition.y];
  }, []);

  return (
    <View style={styles.container}>
      <Text>Test3</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
