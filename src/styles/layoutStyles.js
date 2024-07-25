import { StyleSheet } from 'react-native';

export default styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  map: {
    flex: 1
  },
  debugTextContainer: {
    position: 'absolute',
    bottom: 50,
    left: 60,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  debugTextStyle: {
    color: 'black', 
  },
});