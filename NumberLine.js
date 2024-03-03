import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const NumberLine = ({ measuredDistance, computedDistance }) => {
  const lineWidth = 350; // Total width of the number line
  const maxDistance = 10; // Maximum distance represented on the number line
  const measuredPointPosition = (measuredDistance / maxDistance) * lineWidth;
  const computedPointPosition = (computedDistance / maxDistance) * lineWidth;
  const ticks = Array.from({ length: maxDistance + 1 }, (_, i) => i); // Create an array from 0 to 10

  return (
    <View style={styles.numberLineContainer}>
      <View style={styles.lineLabels}>
        <Text style={[styles.label, { position: 'relative', right: 10}]}>0m</Text>
        <Text style={[styles.label, { position: 'absolute', right: -10 }]}>{maxDistance}m</Text>
      </View>
      <View style={styles.line} />
      <View style={styles.line}>
        {ticks.map((tick) => (
          <View
            key={tick}
            // If the tick is the middle one, make it longer
            style={[styles.tick, { left: `${(tick / maxDistance) * 100}%`, height: tick == maxDistance / 2 ? 18 : 10, transform: [{ translateY: tick == maxDistance / 2 ? -4 : 0}]}]}
          />
        ))}
      </View>
      {/* Measured Distance Point */}
      <View style={[styles.point, { left: measuredPointPosition - 5 /* Adjusting to center the point */, backgroundColor: 'blue' }]} />
      {/* Computed Distance Point */}
      <View style={[styles.point, { left: computedPointPosition - 5 /* Adjusting to center the point */, backgroundColor: 'red' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  numberLineContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    width: 300, // Match the lineWidth
    height: 40, // Adjust as needed to accommodate labels
    marginTop: 2,
    marginLeft: 20,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%', // Match the lineWidth
    marginBottom: 5, // Space between labels and line
  },
  label: {
    fontSize: 12,
    color: 'black',
  },
  line: {
    position: 'relative',
    height: 1,
    width: '100%',
    backgroundColor: 'black',
  },
  point: {
    position: 'absolute',
    top: 18, // Adjusted to position below the line and labels
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tick: {
    position: 'absolute',
    top: -5, // Adjust if needed
    height: 10,
    width: 1,
    backgroundColor: 'black',
  },
});
