import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  size?: number;
};

export const IconButton = ({ icon, color, onPress, size = 22 }: IconButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
});