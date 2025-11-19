/**
 * Date Input Component for CV
 * Format: MM/YYYY or "Hiện tại"
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface DateInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  allowCurrent?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({
  value,
  onChangeText,
  placeholder = 'MM/YYYY',
  allowCurrent = false,
}) => {
  const handleSetCurrent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('Hiện tại');
  };

  const formatDate = (text: string) => {
    // Auto-format to MM/YYYY
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers;
    }
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 6)}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => {
            if (text === '' || text === 'Hiện tại') {
              onChangeText(text);
            } else {
              onChangeText(formatDate(text));
            }
          }}
          keyboardType="numeric"
          maxLength={7}
        />
        {allowCurrent && value !== 'Hiện tại' && (
          <TouchableOpacity onPress={handleSetCurrent}>
            <Text style={styles.currentButton}>Hiện tại</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  currentButton: {
    fontSize: 13,
    color: '#4A80F0',
    fontWeight: '500',
  },
});

export { DateInput };
export default DateInput;
