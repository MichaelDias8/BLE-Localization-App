import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';

const BeaconMarkers = ({ beaconCoords, beaconLastAdvTime, selectedBeacon, handleBeaconSelect }) => {
  return (
    <>
      {beaconCoords && Object.keys(beaconCoords).map((beaconId) => (
        (performance.now() - beaconLastAdvTime[beaconId] < 800) && (
          <Mapbox.MarkerView
            id={beaconId}
            key={beaconId}
            coordinate={beaconCoords[beaconId]}
            allowOverlap={true}
          >
            <View style={styles.beaconContainer}>
              <View
                style={styles.touchableArea}
                onTouchEnd={() => handleBeaconSelect(beaconId)}
              >
                <View
                  style={[
                    styles.beacon,
                    {
                      width: selectedBeacon === beaconId ? 22 : 15,
                      height: selectedBeacon === beaconId ? 22 : 15,
                      borderWidth: selectedBeacon === beaconId ? 2 : 1,
                    }
                  ]}
                />
              </View>
              <Text style={styles.beaconText}>{beaconId}</Text>
            </View>
          </Mapbox.MarkerView>
        )
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  beaconContainer: {
    alignItems: 'center',
    position: 'relative',
    width: 50,
  },
  beaconText: {
    position: 'absolute',
    top: 20,
    textAlign: 'center',
    color: 'black',
    fontSize: 7,
  },
  beacon: {
    backgroundColor: 'red',
    borderRadius: 30,
    borderColor: 'white',
  },
  touchableArea: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  }
});

export default BeaconMarkers;
