// ControlBeaconsUI.js
import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../../styles/beaconStyles';

const MoveBeaconUI = ({
  selectedBeacon,
  setSelectedBeacon,
  beaconCoords,
  setBeaconCoords,
  mapBearing,
  zCoordinate,
  setZCoordinate,
}) => {
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

  return (
    selectedBeacon && (
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
    )
  );
};

export default MoveBeaconUI;