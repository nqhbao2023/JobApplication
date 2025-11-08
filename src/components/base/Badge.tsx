import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'gray';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
};

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: '#eff6ff', text: '#3b82f6' },
  success: { bg: '#ecfdf5', text: '#10b981' },
  warning: { bg: '#fef3c7', text: '#f59e0b' },
  danger: { bg: '#fee2e2', text: '#ef4444' },
  gray: { bg: '#f1f5f9', text: '#64748b' },
};

export const Badge = ({ label, variant = 'primary', style }: BadgeProps) => {
  const colors = variantColors[variant];
  
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});