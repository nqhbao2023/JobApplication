/**
 * Degree Picker - Select from common degree options
 * Có thể chọn hoặc nhập tay
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export const DEGREE_OPTIONS = [
  // Đại học
  { id: 'cu-nhan', label: 'Cử nhân', category: 'Đại học' },
  { id: 'ky-su', label: 'Kỹ sư', category: 'Đại học' },
  { id: 'cu-nhan-ql', label: 'Cử nhân Quản lý', category: 'Đại học' },
  { id: 'cu-nhan-kt', label: 'Cử nhân Kinh tế', category: 'Đại học' },
  
  // Cao đẳng
  { id: 'cao-dang', label: 'Cao đẳng', category: 'Cao đẳng' },
  { id: 'trung-cap', label: 'Trung cấp', category: 'Trung cấp' },
  
  // Thạc sĩ
  { id: 'thac-si', label: 'Thạc sĩ', category: 'Sau đại học' },
  { id: 'tien-si', label: 'Tiến sĩ', category: 'Sau đại học' },
  
  // Khác
  { id: 'custom', label: 'Nhập tay...', category: 'Khác' },
];

interface DegreePickerProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const DegreePicker: React.FC<DegreePickerProps> = ({
  value,
  onChangeText,
  placeholder = 'Chọn hoặc nhập bằng cấp...',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const handleSelectDegree = (degree: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (degree === 'Nhập tay...') {
      setCustomMode(true);
      setShowPicker(false);
    } else {
      onChangeText(degree);
      setShowPicker(false);
      setCustomMode(false);
    }
  };

  const groupedDegrees = DEGREE_OPTIONS.reduce((acc, degree) => {
    if (!acc[degree.category]) {
      acc[degree.category] = [];
    }
    acc[degree.category].push(degree);
    return acc;
  }, {} as Record<string, typeof DEGREE_OPTIONS>);

  return (
    <View style={styles.container}>
      {!customMode ? (
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPicker(true);
          }}
        >
          <Ionicons name="school-outline" size={20} color="#64748b" />
          <Text style={[styles.pickerText, !value && styles.placeholder]}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>
      ) : (
        <View style={styles.customInputWrapper}>
          <Ionicons name="school-outline" size={20} color="#64748b" style={styles.icon} />
          <TextInput
            style={styles.customInput}
            placeholder={placeholder}
            value={value}
            onChangeText={onChangeText}
            autoFocus
          />
          <TouchableOpacity
            onPress={() => {
              setCustomMode(false);
              setShowPicker(true);
            }}
          >
            <Ionicons name="list-outline" size={20} color="#4A80F0" />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn bằng cấp</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {Object.entries(groupedDegrees).map(([category, degrees]) => (
                <View key={category} style={styles.categoryGroup}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {degrees.map((degree) => (
                    <TouchableOpacity
                      key={degree.id}
                      style={[
                        styles.optionItem,
                        value === degree.label && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelectDegree(degree.label)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          value === degree.label && styles.optionTextSelected,
                        ]}
                      >
                        {degree.label}
                      </Text>
                      {value === degree.label && (
                        <Ionicons name="checkmark" size={20} color="#4A80F0" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 500,
  },
  pickerButton: {
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
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  placeholder: {
    color: '#94a3b8',
  },
  customInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A80F0',
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  icon: {},
  customInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  optionsList: {
    padding: 16,
  },
  categoryGroup: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionItemSelected: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 15,
    color: '#334155',
  },
  optionTextSelected: {
    color: '#4A80F0',
    fontWeight: '500',
  },
});
