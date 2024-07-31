import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Barometer } from 'expo-sensors';

const AltitudeMonitor = () => {
  const [altitudeData, setAltitudeData] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const subscription = Barometer.addListener(({ relativeAltitude }) => {
      setAltitudeData(prevData => [...prevData.slice(-2), relativeAltitude]);
    });

    Barometer.setUpdateInterval(1000);

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (altitudeData.length >= 2) {
      const altitudeChange = altitudeData[altitudeData.length - 1] - altitudeData[0];
      if (Math.abs(altitudeChange) >= 0.3) {
        setMessage(altitudeChange > 0 ? 'Ascending' : 'Descending');
      } else {
        setMessage('');
      }
    }
  }, [altitudeData]);

  if (!message) {
    return null; // Return null if there is no message, making the component invisible
  }

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'lightgray',
    borderRadius: 5,
    alignItems: 'center',
  },
  message: {
    fontSize: 18,
    color: 'black',
  },
});

export default AltitudeMonitor;