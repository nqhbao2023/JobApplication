import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
};

export const EmptyState = ({ icon, message }: EmptyStateProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color="#cbd5e1" />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },
});