import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'primary' | 'success' | 'danger' | 'warning' | 'ghost';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
};

const variantColors: Record<ButtonVariant, string> = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  ghost: 'transparent',
};

export const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  icon, 
  loading, 
  disabled,
  fullWidth,
  size = 'medium'
}: ButtonProps) => {
  const sizeStyles = {
    small: { padding: 10, fontSize: 14, iconSize: 16 },
    medium: { padding: 14, fontSize: 16, iconSize: 20 },
    large: { padding: 16, fontSize: 18, iconSize: 24 },
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { 
          backgroundColor: variantColors[variant],
          paddingVertical: sizeStyles[size].padding,
          paddingHorizontal: sizeStyles[size].padding + 4,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        variant === 'ghost' && styles.ghost,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? variantColors.primary : '#fff'} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={sizeStyles[size].iconSize} color={variant === 'ghost' ? variantColors.primary : '#fff'} />}
          <Text style={[
            styles.text, 
            { fontSize: sizeStyles[size].fontSize },
            variant === 'ghost' && styles.ghostText
          ]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  ghost: { borderWidth: 1.5, borderColor: '#3b82f6' },
  text: { fontWeight: '600', color: '#fff' },
  ghostText: { color: '#3b82f6' },
});