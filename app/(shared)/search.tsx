/**
 * Trang tìm kiếm việc làm - ViecLam24h Style
 * Flow: Home -> SearchInputPage -> SearchResultsPage
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { VIETNAM_CITIES } from '@/constants/locations';
import { filterJobPositions } from '@/constants/jobPositions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const RECENT_SEARCHES_KEY = '@recent_searches';

interface RecentSearch {
  position: string;
  location: string;
  timestamp: number;
}

export default function SearchInputPage() {
  const [position, setPosition] = useState('');
  const [location, setLocation] = useState('Toàn quốc'); // Default to all Vietnam
  const [showPositionSuggestions, setShowPositionSuggestions] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<string[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Load recent searches
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Filter positions as user types - CHỈ KHI CÓ INPUT
  useEffect(() => {
    if (position.trim().length > 0) {
      const filtered = filterJobPositions(position);
      setFilteredPositions(filtered);
      setShowPositionSuggestions(true);
    } else {
      setFilteredPositions([]);
      setShowPositionSuggestions(false);
    }
  }, [position]);

  const loadRecentSearches = async () => {
    try {
      const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (data) {
        const searches: RecentSearch[] = JSON.parse(data);
        // Sort by timestamp desc, get latest 5
        setRecentSearches(
          searches
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (pos: string, loc: string) => {
    try {
      const newSearch: RecentSearch = {
        position: pos,
        location: loc,
        timestamp: Date.now(),
      };

      // Remove duplicates
      const filtered = recentSearches.filter(
        (s) => !(s.position === pos && s.location === loc)
      );

      const updated = [newSearch, ...filtered].slice(0, 10); // Keep max 10
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 5));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const handleSearch = () => {
    if (!position.trim()) {
      return;
    }

    // Save to recent searches
    saveRecentSearch(position, location);

    // Navigate to results page
    router.push({
      pathname: '/(shared)/searchResults',
      params: {
        position: position.trim(),
        location: location,
      },
    });
  };

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập vị trí',
          'Vui lòng cho phép ứng dụng truy cập vị trí để sử dụng tính năng này.',
          [{ text: 'OK' }]
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current position with timeout
      const currentLocation = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]) as Location.LocationObject;

      // Reverse geocode to get city name
      const geocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const address = geocode[0];
        let cityName = address.city || address.region || address.subregion || '';

        // Map common city names to Vietnam cities list
        const cityMapping: Record<string, string> = {
          'Ho Chi Minh City': 'TP.HCM',
          'Hanoi': 'Hà Nội',
          'Da Nang': 'Đà Nẵng',
          'Can Tho': 'Cần Thơ',
          'Hai Phong': 'Hải Phòng',
        };

        const mappedCity = cityMapping[cityName] || cityName;
        
        // Check if city exists in our list
        const matchedCity = VIETNAM_CITIES.find(
          city => city.toLowerCase().includes(mappedCity.toLowerCase()) ||
                  mappedCity.toLowerCase().includes(city.toLowerCase())
        );

        if (matchedCity) {
          setLocation(matchedCity);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          // Default to TP.HCM if can't match
          setLocation('TP.HCM');
          Alert.alert('Thông báo', `Không xác định được thành phố chính xác. Đã chọn TP.HCM.`);
        }
      } else {
        setLocation('TP.HCM');
        Alert.alert('Thông báo', 'Không xác định được vị trí. Đã chọn TP.HCM.');
      }
      
      setShowLocationPicker(false);
    } catch (error: any) {
      console.log('Location error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // User-friendly error message
      if (error.message === 'Timeout') {
        Alert.alert(
          'Không lấy được vị trí',
          'Không thể xác định vị trí hiện tại. Vui lòng:\n\n1. Bật GPS/Location Services\n2. Cho phép ứng dụng truy cập vị trí\n3. Hoặc chọn thành phố thủ công',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Không lấy được vị trí',
          'Vui lòng bật GPS và cho phép ứng dụng truy cập vị trí, hoặc chọn thành phố thủ công.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleRecentSearchClick = (search: RecentSearch) => {
    router.push({
      pathname: '/(shared)/searchResults',
      params: {
        position: search.position,
        location: search.location,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm kiếm việc làm</Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Position Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            <Ionicons name="briefcase-outline" size={16} color="#64748b" /> Vị trí ứng tuyển
          </Text>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowPositionSuggestions(true)}
            activeOpacity={1}
          >
            <TextInput
              style={styles.input}
              placeholder="Nhập vị trí muốn ứng tuyển"
              placeholderTextColor="#94a3b8"
              value={position}
              onChangeText={(text) => {
                setPosition(text);
                setShowPositionSuggestions(true);
              }}
              onFocus={() => setShowPositionSuggestions(true)}
            />
            {position.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setPosition('');
                  setShowPositionSuggestions(false);
                }}
                style={styles.clearBtn}
              >
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Position Suggestions */}
          {showPositionSuggestions && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={styles.suggestionsContainer}
            >
              <FlatList
                data={filteredPositions}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => {
                      setPosition(item);
                      setShowPositionSuggestions(false);
                    }}
                  >
                    <Ionicons
                      name="briefcase-outline"
                      size={18}
                      color="#64748b"
                    />
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Không tìm thấy vị trí phù hợp
                    </Text>
                  </View>
                }
              />
            </Animated.View>
          )}
        </View>

        {/* Location Picker */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            <Ionicons name="location-outline" size={16} color="#64748b" /> Địa điểm
          </Text>
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowLocationPicker(!showLocationPicker)}
          >
            <Text style={styles.selectedLocation}>{location}</Text>
            <Ionicons
              name={showLocationPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>

          {/* Location Options */}
          {showLocationPicker && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={styles.locationPicker}
            >
              {/* Use Current Location Button */}
              <TouchableOpacity
                style={[
                  styles.currentLocationButton,
                  isLoadingLocation && styles.currentLocationButtonDisabled
                ]}
                onPress={handleUseCurrentLocation}
                disabled={isLoadingLocation}
                activeOpacity={0.7}
              >
                <View style={styles.currentLocationContent}>
                  <View style={styles.currentLocationIcon}>
                    {isLoadingLocation ? (
                      <ActivityIndicator size="small" color="#7c3aed" />
                    ) : (
                      <Ionicons name="navigate" size={20} color="#7c3aed" />
                    )}
                  </View>
                  <Text style={styles.currentLocationText}>
                    {isLoadingLocation ? 'Đang lấy vị trí...' : 'Sử dụng vị trí hiện tại của tôi'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              <ScrollView style={styles.locationScroll} nestedScrollEnabled>
                {/* Toàn quốc option */}
                <TouchableOpacity
                  style={[
                    styles.locationItem,
                    location === 'Toàn quốc' && styles.locationItemActive,
                  ]}
                  onPress={() => {
                    setLocation('Toàn quốc');
                    setShowLocationPicker(false);
                  }}
                >
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={location === 'Toàn quốc' ? '#4A80F0' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.locationText,
                      location === 'Toàn quốc' && styles.locationTextActive,
                    ]}
                  >
                    Toàn quốc
                  </Text>
                  {location === 'Toàn quốc' && (
                    <Ionicons name="checkmark" size={20} color="#4A80F0" />
                  )}
                </TouchableOpacity>

                {VIETNAM_CITIES.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[
                      styles.locationItem,
                      location === city && styles.locationItemActive,
                    ]}
                    onPress={() => {
                      setLocation(city);
                      setShowLocationPicker(false);
                    }}
                  >
                    <Ionicons
                      name="location"
                      size={18}
                      color={location === city ? '#4A80F0' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.locationText,
                        location === city && styles.locationTextActive,
                      ]}
                    >
                      {city}
                    </Text>
                    {location === city && (
                      <Ionicons name="checkmark" size={20} color="#4A80F0" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[
            styles.searchButton,
            !position.trim() && styles.searchButtonDisabled,
          ]}
          onPress={handleSearch}
          disabled={!position.trim()}
        >
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.searchButtonText}>Tìm kiếm</Text>
        </TouchableOpacity>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !showPositionSuggestions && !showLocationPicker && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Tìm kiếm gần đây</Text>
              <TouchableOpacity onPress={() => setRecentSearches([])}>
                <Text style={styles.clearAllText}>Xóa tất cả</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((search, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(index * 50).duration(300)}
              >
                <TouchableOpacity
                  style={styles.recentItem}
                  onPress={() => handleRecentSearchClick(search)}
                >
                  <View style={styles.recentIconContainer}>
                    <Ionicons name="time-outline" size={20} color="#64748b" />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentPosition}>{search.position}</Text>
                    <Text style={styles.recentLocation}>
                      <Ionicons name="location" size={12} color="#94a3b8" />{' '}
                      {search.location}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  clearBtn: {
    padding: 4,
  },
  selectedLocation: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 300,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  locationPicker: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 400,
    overflow: 'hidden',
  },
  currentLocationButton: {
    padding: 16,
    backgroundColor: '#faf5ff',
  },
  currentLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#7c3aed',
  },
  currentLocationButtonDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  locationScroll: {
    maxHeight: 300,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  locationItemActive: {
    backgroundColor: '#f0f7ff',
  },
  locationText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  locationTextActive: {
    color: '#4A80F0',
    fontWeight: '600',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  recentSection: {
    marginTop: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentInfo: {
    flex: 1,
  },
  recentPosition: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recentLocation: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
