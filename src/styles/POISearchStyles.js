import { StyleSheet } from 'react-native';

export default styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  searchContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10, // Reduced padding at the bottom
    backgroundColor: 'transparent',
  },
  searchInput: {
    height: 50,
    borderColor: 'black',
    borderWidth: 3,
    paddingLeft: 16,
    marginBottom: 10,
    borderRadius: 16,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  searchInputFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  searchResultsContainer: {
    width: '90%',
    maxHeight: '100%', // Adjust as needed to ensure back button is visible
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    marginTop: 0, // Reduced margin top
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  distanceBox: {
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 5,
    marginRight: 10,
    flexBasis: 60, // Ensure equal horizontal space
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 14,
    color: '#333',
  },
  verticalBar: {
    width: 1,
    height: '100%',
    backgroundColor: '#ccc',
    marginRight: 10,
  },
  placeName: {
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  separator: {
    height: 10, // Space between results
  },
  backButtonContainer: {
    width: '100%',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
