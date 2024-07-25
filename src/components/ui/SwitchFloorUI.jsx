import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import styles from '../../styles/floorControlStyles';

const FloorControlButtons = ({ floor, setFloor, useLayerStyle, setUseLayerStyle }) => {
  const [collapsed, setCollapsed] = useState(true);

  const handleToggleLayers = () => {
    if (useLayerStyle) 
      setCollapsed(false);
    
    setUseLayerStyle(!useLayerStyle)
  }

  return (
    <View style={styles.floorControlContainer}>
      {useLayerStyle && !collapsed && (
        <>
          <TouchableOpacity
            style={[styles.floorButton, floor === 1 && styles.selectedFloorButton]}
            onPress={() => setFloor(1)}
          >
            <Text style={styles.floorButtonText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floorButton, floor === 0 && styles.selectedFloorButton]}
            onPress={() => setFloor(0)}
          >
            <Text style={styles.floorButtonText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.floorButton, floor === -1 && styles.selectedFloorButton]}
            onPress={() => setFloor(-1)}
          >
            <Text style={styles.floorButtonText}>-1</Text>
          </TouchableOpacity>
        </>
      )}

      {useLayerStyle && (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setCollapsed(!collapsed)}
        >
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} size={24} color="#000" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.layerToggleButton}
        onPress={handleToggleLayers}
      >
        <Icon name={useLayerStyle ? 'layers-off-outline' : 'layers-outline'} size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

export default FloorControlButtons;
