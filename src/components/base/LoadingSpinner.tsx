import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

type LoadingSpinnerProps = {
  text?: string;
};

export const LoadingSpinner = ({ text = 'Đang tải...' }: LoadingSpinnerProps) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  text: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
});