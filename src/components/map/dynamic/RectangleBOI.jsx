import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, Button, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { point } from '@turf/helpers';
import { getCoords, destination, distance } from '@turf/turf';

const RectangleBOI = ({ cameraCenter, mapBearing }) => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const [height, setHeight] = useState('2');
  const [length, setLength] = useState('2');
  const [polygon, setPolygon] = useState(null);
  const [realLength, setRealLength] = useState(0);

  useEffect(() => {
    if (!cameraCenter || typeof mapBearing !== 'number') return;

    const width = 0.002; 

    // Adjust the map bearing to extend in the correct direction
    const adjustedBearing = (mapBearing + 180) % 360;

    const start = cameraCenter;
    const end = getCoords(destination(point(cameraCenter), (length === '' ? 1 : parseFloat(length)) / 1000, adjustedBearing));

    const leftStart = getCoords(destination(point(start), width / 2, adjustedBearing - 90));
    const rightStart = getCoords(destination(point(start), width / 2, adjustedBearing + 90));
    const leftEnd = getCoords(destination(point(end), width / 2, adjustedBearing - 90));
    const rightEnd = getCoords(destination(point(end), width / 2, adjustedBearing + 90));

    setPolygon([
      leftStart,
      rightStart,
      rightEnd,
      leftEnd,
      leftStart
    ]);

    // Calculate real length 
    const realLengthValue = distance(point(leftStart), point(leftEnd), { units: 'meters' });
    setRealLength(realLengthValue);
  }, [cameraCenter, mapBearing, length]);

  if (!polygon) return null;

  const featureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [polygon]
      },
      properties: {
        id: 'rectangleBOI'
      }
    }]
  };

  return (
    <>
      {/*<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Text>Height:</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={(text) => {
                if (/^\d*\.?\d*$/.test(text)) {
                  setHeight(text);
                }
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputRow}>
            <Text>Length:</Text>
            <TextInput
              style={styles.input}
              value={length}
              onChangeText={(text) => {
                if (/^\d*\.?\d*$/.test(text)) {
                  setLength(text);
                }
              }}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputRow}>
            <Text>Distance: {Math.sqrt((realLength * realLength) + ((height === '' ? 1 : parseFloat(height)) * (height === '' ? 1 : parseFloat(height)))).toFixed(2)}</Text>
          </View>
          {keyboardVisible && Platform.OS === 'ios' && (
            <View style={styles.buttonContainer}>
              <Button title="Dismiss Keyboard" onPress={Keyboard.dismiss} />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>*/}
      <Mapbox.ShapeSource id="rectangleSource" shape={featureCollection}>
        <Mapbox.FillExtrusionLayer
          id="rectangleLayer"
          sourceID="rectangleSource"
          style={{
            fillExtrusionColor: '#05F205',
            fillExtrusionOpacity: 0.9,
            fillExtrusionHeight: parseFloat(height === '' ? '1' : height),
            fillExtrusionBase: 0,
          }}
        />
      </Mapbox.ShapeSource>
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    position: 'absolute',
    top: 20,
    left: 10,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    zIndex: 10, // Ensure the input container is above the map
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginLeft: 10,
    paddingHorizontal: 5,
    width: 60,
  },
  buttonContainer: {
    marginTop: 10,
  },
});

export default RectangleBOI;
