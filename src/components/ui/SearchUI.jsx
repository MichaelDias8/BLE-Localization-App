import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import axios from 'axios';
import * as turf from '@turf/turf';
import styles from '../../styles/POISearchStyles';

const SearchUI = ({ setShowCompass }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [isFocused, setIsFocused] = useState(false);

  const userLocation = [-81.27661, 43.00827]; // Replace with user's actual location

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleSearch = async () => {
    if (debouncedSearchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          debouncedSearchTerm
        )}.json`,
        {
          params: {
            access_token: 'sk.eyJ1Ijoic3dhZHppIiwiYSI6ImNseWY0dGZjNTA5ZzQyanE4MWllMzZmaTgifQ.l4lyIOk6uziJyyWQyTWkSA',
            proximity: `${userLocation[0]},${userLocation[1]}`, // Use the center coordinate or user's current location
            limit: 10
          }
        }
      );

      const resultsWithDistance = response.data.features.map(feature => {
        const from = turf.point(userLocation);
        const to = turf.point(feature.geometry.coordinates);
        const distance = turf.distance(from, to, { units: 'meters' });

        // Remove postal code from place name
        const placeName = feature.place_name.replace(/,\s*[^,]*\b\d{5}(-\d{4})?\b/g, '').replace(/,\s*[^,]*\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/g, '');

        return {
          ...feature,
          distance,
          place_name: placeName,
        };
      });

      setSearchResults(resultsWithDistance);
    } catch (error) {
      console.error('Error searching POIs: ', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [debouncedSearchTerm]);

  const handleSelectResult = (coordinates) => {
    setSearchResults([]);
    setSearchTerm('');
    setShowCompass(true);
  };

  const handleClearResults = () => {
    Keyboard.dismiss(); // Dismiss the keyboard
    setSearchResults([]);
    setShowCompass(true);
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance / 10) * 10}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowCompass(false);
    if (searchTerm.trim() !== '') {
      setDebouncedSearchTerm(searchTerm); // Trigger the search again if there's saved text
      handleSearch(); // Directly call handleSearch to update results
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      pointerEvents="box-none"
    >
      <View style={styles.searchContainer} pointerEvents="auto">
        <TextInput
          style={[styles.searchInput, isFocused && styles.searchInputFocused]}
          placeholder="Search for a place..."
          placeholderTextColor="black"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={() => setSearchResults(searchResults)} // Shows full list of results
          selection={{ start: searchTerm.length, end: searchTerm.length }} // Prevents text selection
        />
        {isSearching && <Text>Searching...</Text>}
      </View>
      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <View style={styles.centeredContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => handleSelectResult(item.geometry.coordinates)}>
                  <View style={styles.searchResultItem}>
                    <View style={styles.distanceBox}>
                      <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
                    </View>
                    <View style={styles.verticalBar} />
                    <Text style={styles.placeName}>{item.place_name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              style={styles.searchResultsContainer}
              pointerEvents="auto"
            />
          </View>
          <View style={styles.backButtonContainer} pointerEvents="auto">
            <TouchableOpacity style={styles.backButton} onPress={handleClearResults}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default SearchUI;
