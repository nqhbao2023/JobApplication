/**
 * Optimized Education Section for CV Editor
 * With auto-complete for school, degree, and major
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { EducationEntry } from '@/types/cv.types';
import { SchoolInput } from './SchoolInput';
import { DegreePicker } from './DegreePicker';
import { MajorPicker } from './MajorPicker';
import DateInput from './DateInput';

interface EducationSectionProps {
  education: EducationEntry[];
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: any) => void;
  onRemove: (id: string) => void;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  education,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <View style={styles.container}>
      {education.map((edu, index) => (
        <View key={edu.id} style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <Text style={styles.cardTitle}>Học vấn {index + 1}</Text>
            {education.length > 1 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  onRemove(edu.id);
                }}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          {/* School Name - with autocomplete */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Tên trường <Text style={styles.required}>*</Text>
            </Text>
            <SchoolInput
              value={edu.school}
              onChangeText={(text) => onUpdate(edu.id, 'school', text)}
              placeholder="Bắt đầu nhập tên trường..."
            />
            <Text style={styles.hint}>Gợi ý tự động khi bạn nhập</Text>
          </View>

          {/* Degree - with picker */}
          <View style={styles.field}>
            <Text style={styles.label}>
              Bằng cấp <Text style={styles.required}>*</Text>
            </Text>
            <DegreePicker
              value={edu.degree}
              onChangeText={(text) => onUpdate(edu.id, 'degree', text)}
              placeholder="Chọn bằng cấp..."
            />
            <Text style={styles.hint}>📜 Tap để chọn hoặc nhập tay</Text>
          </View>

          {/* Major - with picker and search */}
          <View style={styles.field}>
            <Text style={styles.label}>Chuyên ngành</Text>
            <MajorPicker
              value={edu.major || ''}
              onChangeText={(text) => onUpdate(edu.id, 'major', text)}
              placeholder="Chọn chuyên ngành..."
            />
            <Text style={styles.hint}>🔍 Tìm kiếm hoặc chọn từ danh sách</Text>
          </View>

          {/* Date Range */}
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>
                Từ <Text style={styles.required}>*</Text>
              </Text>
              <DateInput
                value={edu.startDate}
                onChangeText={(text: string) => onUpdate(edu.id, 'startDate', text)}
                placeholder="MM/YYYY"
              />
            </View>

            <View style={styles.dateField}>
              <Text style={styles.label}>Đến</Text>
              <DateInput
                value={edu.endDate || ''}
                onChangeText={(text: string) => onUpdate(edu.id, 'endDate', text)}
                placeholder="Hiện tại"
                allowCurrent
              />
            </View>
          </View>

          {/* GPA (optional) */}
          <View style={styles.field}>
            <Text style={styles.label}>GPA (tùy chọn)</Text>
            <View style={styles.gpaInput}>
              <Ionicons name="star-outline" size={20} color="#64748b" />
              <TextInput
                style={styles.gpaField}
                placeholder="3.5"
                value={edu.gpa?.toString() || ''}
                onChangeText={(text: string) => {
                  const val = parseFloat(text);
                  onUpdate(edu.id, 'gpa', isNaN(val) ? undefined : val);
                }}
                keyboardType="decimal-pad"
              />
              <Text style={styles.gpaScale}>/ 4.0</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onAdd();
        }}
      >
        <Ionicons name="add-circle-outline" size={24} color="#4A80F0" />
        <Text style={styles.addButtonText}>Thêm học vấn</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A80F0',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 8,
  },
  gpaInput: {
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
  gpaField: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  gpaScale: {
    fontSize: 14,
    color: '#64748b',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4A80F0',
  },
});
