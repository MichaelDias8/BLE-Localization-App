import { StyleSheet } from 'react-native';

export default styles = StyleSheet.create({
    floorControlContainer: {
      position: 'absolute',
      bottom: 65,
      left: 20,
      alignItems: 'center',
    },
    floorButton: {
      backgroundColor: 'white',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 5,
      borderWidth: 1,
      borderColor: 'gray',
    },
    selectedFloorButton: {
      borderColor: 'blue',
      borderWidth: 5,
    },
    floorButtonText: {
      color: 'black',
      fontSize: 18,
    },
    toggleButton: {
      backgroundColor: 'white',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 5,
      borderWidth: 1,
      borderColor: 'gray',
    },
    layerToggleButton: {
      backgroundColor: 'white',
      borderRadius: 25,
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 5,
      borderWidth: 1,
      borderColor: 'gray',
    },
    toggleButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
});