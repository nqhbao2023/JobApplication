import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export const SearchBar = ({ value, onChangeText, placeholder = 'Tìm kiếm...' }: SearchBarProps) => {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#64748b" style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={20} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 16,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    padding: 0,
  },
});