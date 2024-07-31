import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Barometer } from 'expo-sensors';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const BarometerRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [data, setData] = useState([]);
  const [subscription, setSubscription] = useState(null);

  const startRecording = async () => {
    setIsRecording(true);
    setData([]);

    const subscription = Barometer.addListener(barometerData => {
      setData(currentData => [...currentData, barometerData]);
    });

    Barometer.setUpdateInterval(1000); // Update every second
    setSubscription(subscription);
  };

  const stopRecording = async () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }

    setIsRecording(false);

    const csvData = data.map(({ pressure, relativeAltitude }) => `${pressure},${relativeAltitude}`).join('\n');
    const fileUri = `${FileSystem.documentDirectory}barometer_data.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvData);
    alert(`File saved to ${fileUri}`);
b 
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

export default BarometerRecorder;