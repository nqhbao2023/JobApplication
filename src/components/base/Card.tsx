import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export const Card = ({ children, onPress, style }: CardProps) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {children}
    </Component>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});