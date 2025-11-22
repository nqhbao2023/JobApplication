/**
 * Component Search Input Button
 * Hiển thị ở home page, khi click sẽ navigate sang trang search
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface SearchInputButtonProps {
  placeholder?: string;
  style?: any;
}

export default function SearchInputButton({ 
  placeholder = 'Tìm công việc tại đây...', 
  style 
}: SearchInputButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => router.push('/(shared)/search')}
      activeOpacity={0.7}
    >
      <Ionicons name="search" size={20} color="#94a3b8" />
      <Text style={styles.placeholder}>{placeholder}</Text>
      <View style={styles.badge}>
        <Ionicons name="filter" size={16} color="#7c3aed" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: '#94a3b8',
    marginLeft: 12,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f3ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
