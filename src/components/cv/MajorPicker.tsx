/**
 * Major Picker - Common majors in Vietnam universities
 * Có thể chọn hoặc nhập tay
 */

import React, { useState, useEffect } from 'react';
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

export const MAJOR_OPTIONS = {
  'Công nghệ thông tin': [
    'Công nghệ thông tin',
    'Khoa học máy tính',
    'Kỹ thuật phần mềm',
    'An toàn thông tin',
    'Trí tuệ nhân tạo',
    'Khoa học dữ liệu',
    'Hệ thống thông tin',
  ],
  'Kinh tế': [
    'Kinh tế',
    'Quản trị kinh doanh',
    'Marketing',
    'Kế toán',
    'Tài chính - Ngân hàng',
    'Kinh doanh quốc tế',
    'Quản lý nhân lực',
  ],
  'Kỹ thuật': [
    'Kỹ thuật điện',
    'Kỹ thuật cơ khí',
    'Kỹ thuật xây dựng',
    'Kỹ thuật hóa học',
    'Tự động hóa',
    'Cơ điện tử',
  ],
  'Khoa học tự nhiên': [
    'Toán học',
    'Vật lý',
    'Hóa học',
    'Sinh học',
  ],
  'Khoa học xã hội': [
    'Luật',
    'Xã hội học',
    'Tâm lý học',
    'Báo chí',
    'Quan hệ quốc tế',
  ],
  'Sư phạm': [
    'Sư phạm Toán',
    'Sư phạm Văn',
    'Sư phạm Anh',
    'Sư phạm Tin học',
  ],
  'Nghệ thuật': [
    'Thiết kế đồ họa',
    'Thiết kế nội thất',
    'Kiến trúc',
    'Nghệ thuật đa phương tiện',
  ],
  'Y - Dược': [
    'Y khoa',
    'Dược học',
    'Điều dưỡng',
    'Y tế công cộng',
  ],
  'Khác': [
    'Nhập tay...',
  ],
};

interface MajorPickerProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const MajorPicker: React.FC<MajorPickerProps> = ({
  value,
  onChangeText,
  placeholder = 'Chọn hoặc nhập chuyên ngành...',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMajors, setFilteredMajors] = useState(MAJOR_OPTIONS);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered: Record<string, string[]> = {};
      Object.entries(MAJOR_OPTIONS).forEach(([category, majors]) => {
        const matchedMajors = majors.filter(major =>
          major.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (matchedMajors.length > 0) {
          filtered[category] = matchedMajors;
        }
      });
      setFilteredMajors(filtered as typeof MAJOR_OPTIONS);
    } else {
      setFilteredMajors(MAJOR_OPTIONS);
    }
  }, [searchQuery]);

  const handleSelectMajor = (major: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (major === 'Nhập tay...') {
      setCustomMode(true);
      setShowPicker(false);
      setSearchQuery('');
    } else {
      onChangeText(major);
      setShowPicker(false);
      setCustomMode(false);
      setSearchQuery('');
    }
  };

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
          <Ionicons name="flask-outline" size={20} color="#64748b" />
          <Text style={[styles.pickerText, !value && styles.placeholder]}>
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>
      ) : (
        <View style={styles.customInputWrapper}>
          <Ionicons name="flask-outline" size={20} color="#64748b" style={styles.icon} />
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
              <Text style={styles.modalTitle}>Chọn chuyên ngành</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm chuyên ngành..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.optionsList}>
              {Object.entries(filteredMajors).map(([category, majors]) => (
                <View key={category} style={styles.categoryGroup}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {majors.map((major, index) => (
                    <TouchableOpacity
                      key={`${major}-${index}`}
                      style={[
                        styles.optionItem,
                        value === major && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelectMajor(major)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          value === major && styles.optionTextSelected,
                        ]}
                      >
                        {major}
                      </Text>
                      {value === major && (
                        <Ionicons name="checkmark" size={20} color="#4A80F0" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              
              {Object.keys(filteredMajors).length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Không tìm thấy chuyên ngành</Text>
                  <TouchableOpacity
                    style={styles.customButton}
                    onPress={() => {
                      setCustomMode(true);
                      setShowPicker(false);
                      onChangeText(searchQuery);
                    }}
                  >
                    <Text style={styles.customButtonText}>Nhập tay: "{searchQuery}"</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    maxHeight: '85%',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    margin: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  optionsList: {
    padding: 16,
    paddingTop: 8,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 12,
    marginBottom: 16,
  },
  customButton: {
    backgroundColor: '#4A80F0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  customButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
