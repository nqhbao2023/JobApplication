import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

type AuthInputProps = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  label?: string;
};

export const AuthInput = ({ icon, error, label, style, ...props }: AuthInputProps) => {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <Ionicons name={icon} size={20} color={error ? '#ef4444' : '#64748b'} style={styles.icon} />
        <TextInput style={[styles.input, style]} placeholderTextColor="#94a3b8" {...props} />
      </View>
      {error && (
        <Animated.Text entering={FadeInDown.duration(200)} style={styles.errorText}>
          {error}
        </Animated.Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0f172a', padding: 0 },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 4 },
});