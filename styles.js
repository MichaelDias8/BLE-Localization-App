import { StyleSheet } from 'react-native';

export default styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  measuredPositionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  measuredPositionMarker: {
    backgroundColor: 'blue',
    borderRadius: 50,
    width: 15,
    height: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  correctedPositionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctedPositionMarker: {
    backgroundColor: 'black',
    borderRadius: 50,
    width: 15,
    height: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  beaconContainer: {
    alignItems: 'center',
    position: 'relative',
    width: 50,
  },
  beaconText: {
    position: 'absolute',
    bottom: -20,
    textAlign: 'center',
    color: 'black',
    fontSize: 12,
  },
  beaconName: {
    fontWeight: 'bold',
  },
  beaconInfo: {
    textAlign: 'right',
  },
  userPositionContainer: {
    alignItems: 'center', 
    justifyContent: 'center', 
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'column',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    margin: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
  },
  unselectButton: {
    margin: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 69, 0, 0.7)', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  invisibleButton: {
    margin: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zCoordinateContainer: {
    marginBottom: 450,
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5,
  },
  zCoordinateLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  zCoordinateInput: {
    width: 100,
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    textAlign: 'center',
    backgroundColor: 'white',
  },
  webview: {
    flex: 1,
  },
  map: {
    flex: 1
  },
});