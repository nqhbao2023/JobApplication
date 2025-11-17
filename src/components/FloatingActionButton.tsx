/**
 * Floating Action Button Component
 * Modern UX pattern cho save/submit actions
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface FloatingActionButtonProps {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  color?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  label,
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  color = '#4A80F0',
}) => {
  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { backgroundColor: color },
        disabled && styles.fabDisabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {icon && !loading && (
        <Ionicons name={icon} size={20} color="#fff" style={styles.icon} />
      )}
      <Text style={[styles.fabText, textStyle]}>
        {loading ? 'Đang xử lý...' : label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  fabDisabled: {
    opacity: 0.5,
  },
  icon: {
    marginRight: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
