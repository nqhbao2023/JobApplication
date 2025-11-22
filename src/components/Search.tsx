import { StyleSheet, TouchableOpacity, View, Text } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Search = () => {
  const router = useRouter();
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.12);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
    shadowOpacity.value = withTiming(0.18, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    shadowOpacity.value = withTiming(0.12, { duration: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(shared)/search',
      params: { animated: 'true' },
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  return (
    <AnimatedTouchable 
      style={[styles.searchbar, animatedStyle]} 
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <View style={styles.searchContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="search" color={'#4A80F0'} size={20} />
        </View>
        <Text style={styles.placeholder}>Tìm công việc tại đây...</Text>
      </View>
      <View style={styles.filterBadge}>
        <Ionicons name="options" size={18} color="#4A80F0" />
      </View>
    </AnimatedTouchable>
  );
};

export default Search;

const styles = StyleSheet.create({
  searchbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 16,
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 128, 240, 0.08)',
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '400',
  },
  filterBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 128, 240, 0.12)',
  },
});
