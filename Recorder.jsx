import React, { useState } from 'react';
import { View, Button, Text } from 'react-native';
import { calculateMean, calculateVariance } from './statsUtilities';
import { beaconIds } from './beaconUtilities';

export const Recorder = ({isRecording, setIsRecording}) => {
  const initialRSSIState = beaconIds.reduce((acc, id) => {
    acc[id] = [];
    return acc;
  }, {});
  const initialStatsState = beaconIds.reduce((acc, id) => {
    acc[id] = { mean: 0, variance: 0 };
    return acc;
  }, {});

  const [recordedRSSIs, setRecordedRSSIs] = useState(initialRSSIState);
  const [recordedStats, setRecordedStats] = useState(initialStatsState);

  const startRecording = () => {
    console.log('Recording Started');
    setIsRecording(true);
    setRecordedStats(initialStatsState);
    setRecordedRSSIs(initialRSSIState);
  };

  const stopRecording = () => {
    setIsRecording(false);
    console.log('Recording Stopped');
    // Calculate and print the mean and variance for each beacon
    beaconIds.forEach(beaconId => {
      const data = recordedRSSIs[beaconId];
      const mean = calculateMean(data);
      const variance = calculateVariance(data, mean);
      setRecordedStats(prevData => ({
        ...prevData,
        [beaconId]: { mean, variance },
      }));
    });
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Button title="Start Recording" onPress={startRecording} disabled={isRecording} />
        <Button title="Stop Recording" onPress={stopRecording} disabled={!isRecording} />
      </View>
      {beaconIds.map((beaconId, index) => (
        <View key={beaconId} style={{ /* your styles for beaconContainer */ }}>
          <Text style={{ /* your styles for beaconName */ }}>Beacon {index + 1}:</Text>
          <Text>
            {recordedStats[beaconId].variance ? `Mean: ${recordedStats[beaconId].mean.toFixed(3)}   Variance: ${recordedStats[beaconId].variance.toFixed(3)}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};