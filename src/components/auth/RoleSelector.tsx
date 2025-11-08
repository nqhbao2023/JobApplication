import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppRole } from '@/types';

type RoleSelectorProps = {
  selected: Exclude<AppRole, 'admin'>;
  onChange: (role: Exclude<AppRole, 'admin'>) => void;
  disabled?: boolean;
};

export const RoleSelector = ({ selected, onChange, disabled }: RoleSelectorProps) => {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <TouchableOpacity
        style={[styles.option, selected === 'candidate' && styles.optionActive]}
        onPress={() => onChange('candidate')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="person" size={20} color={selected === 'candidate' ? '#fff' : '#64748b'} />
        <Text style={[styles.optionText, selected === 'candidate' && styles.optionTextActive]}>
          Người tìm việc
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, selected === 'employer' && styles.optionActive]}
        onPress={() => onChange('employer')}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="briefcase" size={20} color={selected === 'employer' ? '#fff' : '#64748b'} />
        <Text style={[styles.optionText, selected === 'employer' && styles.optionTextActive]}>
          Nhà tuyển dụng
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 12, gap: 4 },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  optionActive: {
    backgroundColor: '#4A80F0',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  optionTextActive: { color: '#fff' },
});