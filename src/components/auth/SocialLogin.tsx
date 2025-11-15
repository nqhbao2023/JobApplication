import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
type SocialLoginProps = {
  onGooglePress?: () => void;
  onFacebookPress?: () => void;
  disabled?: boolean;
};

export const SocialLogin = ({ onGooglePress, onFacebookPress, disabled }: SocialLoginProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.socialButtons}>
        {onGooglePress && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={onGooglePress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>
        )}

        {onFacebookPress && (
          <TouchableOpacity
            style={styles.socialButton}
            onPress={onFacebookPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            <Text style={styles.socialButtonText}>Facebook</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#94a3b8',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
});

