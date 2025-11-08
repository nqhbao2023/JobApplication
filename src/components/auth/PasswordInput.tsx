import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

type PasswordInputProps = TextInputProps & {
  error?: string;
  label?: string;
  showStrength?: boolean;
  strength?: { label: string; color: string; progress: number };
};

export const PasswordInput = ({ error, label, showStrength, strength, style, ...props }: PasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <Ionicons name="lock-closed-outline" size={20} color={error ? '#ef4444' : '#64748b'} style={styles.icon} />
        <TextInput style={[styles.input, style]} placeholderTextColor="#94a3b8" secureTextEntry={!isVisible} {...props} />
        <TouchableOpacity onPress={() => setIsVisible(!isVisible)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={isVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      {showStrength && strength && strength.label && (
        <View style={styles.strengthContainer}>
          <View style={styles.strengthBar}>
            <View style={[styles.strengthProgress, { width: `${strength.progress * 100}%`, backgroundColor: strength.color }]} />
          </View>
          <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

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
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  strengthProgress: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 12, fontWeight: '600' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 6, marginLeft: 4 },
});