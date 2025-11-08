import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type StatCardProps = {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const StatCard = ({ title, value, icon, color }: StatCardProps) => {
  return (
    <View style={styles.container}>
      <LinearGradient colors={[color, color + 'dd']} style={styles.gradient}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={28} color="#fff" />
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '47%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
});