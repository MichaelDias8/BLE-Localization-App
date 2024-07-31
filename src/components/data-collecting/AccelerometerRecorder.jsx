import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const AccelerometerRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [data, setData] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const startRecording = async () => {
    setIsRecording(true);
    setData([]);

    const subscription = Accelerometer.addListener(accelerometerData => {
      setData(currentData => [...currentData, accelerometerData]);
    });

    Accelerometer.setUpdateInterval(50); // Update every 50ms
    setSubscription(subscription);
  };

  const stopRecording = async () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    setIsRecording(false);

    const csvData = data.map(({ x, y, z }) => `${x},${y},${z}`).join('\n');
    const fileUri = `${FileSystem.documentDirectory}accelerometer_data.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvData);
    alert(`File saved to ${fileUri}`);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      alert('Sharing is not available on this device');
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        style={{
          backgroundColor: isRecording ? 'red' : 'green',
          padding: 10,
          margin: 10,
          borderRadius: 5,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AccelerometerRecorder;