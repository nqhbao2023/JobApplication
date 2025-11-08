import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

type FilterTabsProps<T extends string> = {
  options: readonly T[];
  active: T;
  onChange: (value: T) => void;
  labels?: Record<T, string>;
};

export function FilterTabs<T extends string>({ 
  options, 
  active, 
  onChange, 
  labels 
}: FilterTabsProps<T>) {
  const getLabel = (option: T) => {
    return labels?.[option] || option.charAt(0).toUpperCase() + option.slice(1);
  };

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.tab, active === option && styles.tabActive]}
          onPress={() => onChange(option)}
        >
          <Text style={[styles.text, active === option && styles.textActive]}>
            {getLabel(option)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  textActive: {
    color: '#fff',
  },
});