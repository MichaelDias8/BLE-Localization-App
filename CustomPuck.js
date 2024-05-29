import React from 'react';
import { View, StyleSheet, Image as RNImage } from 'react-native';
import { MarkerView } from '@rnmapbox/maps';

const CustomPuck = ({ coordinates, id, heading, zoom, type }) => {
  const imageSource = type === 1 
    ? require(`./assets/UserPuck.png`)
    : require(`./assets/APIPuck.png`);

  const zoomScale = 1.0001 ** (zoom - 21);

  const size = 100 * zoomScale;

  return (
    <MarkerView 
      id={id} 
      coordinate={coordinates}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap={true}
    >
      <View style={{ transform: [{ rotate: `${heading}deg` }] }}>
        <RNImage 
          source={imageSource} 
          style={[styles.puckImage, { width: size, height: size }]} 
        />
      </View>
    </MarkerView>
  );
};

const styles = StyleSheet.create({
  puckImage: {
    width: 50, 
    height: 50,
    resizeMode: 'contain'
  }
});

export default CustomPuck;
