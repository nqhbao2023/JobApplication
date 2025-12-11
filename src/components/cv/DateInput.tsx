/**
 * Date Input Component for CV
 * Format: MM/YYYY or "Hiện tại"
 */

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [showPicker, setShowPicker] = useState(false);

  const handleSetCurrent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('Hiện tại');
  };

  const getDateFromValue = () => {
    if (!value || value === 'Hiện tại') return new Date();
    const parts = value.split('/');
    if (parts.length === 2) {
      // MM/YYYY
      const month = parseInt(parts[0]);
      const year = parseInt(parts[1]);
      if (!isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, 1);
      }
    }
    return new Date();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    
    // On Android, event.type can be 'set' or 'dismissed'
    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      onChangeText(`${month}/${year}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.inputWrapper} 
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color="#64748b" />
        <Text style={[styles.inputText, !value && styles.placeholder]}>
          {value || placeholder}
        </Text>
        
        {allowCurrent && (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleSetCurrent();
            }}
            style={styles.currentBtnWrapper}
          >
            <Text style={[
              styles.currentButton, 
              value === 'Hiện tại' && styles.currentButtonActive
            ]}>
              Hiện tại
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={getDateFromValue()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
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
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  placeholder: {
    color: '#94a3b8',
  },
  currentBtnWrapper: {
    padding: 4,
  },
  currentButton: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  currentButtonActive: {
    color: '#4A80F0',
    fontWeight: '700',
  },
});

export { DateInput };
export default DateInput;
