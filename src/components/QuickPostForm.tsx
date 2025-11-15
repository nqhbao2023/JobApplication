import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { quickPostService, QuickPostJobData } from '@/services/quickPostApi.service';

const QuickPostForm = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<QuickPostJobData>({
    title: '',
    description: '',
    company: '',
    location: '',
    workSchedule: '',
    hourlyRate: undefined,
    type: 'part-time',
    category: '',
    contactInfo: {
      phone: '',
      zalo: '',
      email: '',
    },
  });

  const handleSubmit = async () => {
    // Validation
    if (!formData.title || !formData.description || !formData.location) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!formData.contactInfo.phone && !formData.contactInfo.email) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất số điện thoại hoặc email');
      return;
    }

    try {
      setLoading(true);
      await quickPostService.createQuickPost(formData);
      
      Alert.alert(
        'Thành công!',
        'Tin tuyển dụng của bạn đã được gửi. Admin sẽ duyệt trong vòng 24h.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo tin tuyển dụng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng tin tuyển dụng</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Đăng tin nhanh, không cần tạo tài khoản
          </Text>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Tiêu đề <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Phục vụ quán cafe gần TDMU"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Mô tả công việc <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Mô tả chi tiết công việc, yêu cầu..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Company */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên công ty/Cửa hàng</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Cafe Highlands"
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
            />
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Địa điểm <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Bình Dương, gần TDMU"
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
            />
          </View>

          {/* Work Schedule */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Lịch làm việc</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: Thứ 2,4,6 tối (6h-9h)"
              value={formData.workSchedule}
              onChangeText={(text) => setFormData({ ...formData, workSchedule: text })}
            />
          </View>

          {/* Hourly Rate */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Lương theo giờ (VNĐ)</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: 25000"
              value={formData.hourlyRate?.toString() || ''}
              onChangeText={(text) =>
                setFormData({ ...formData, hourlyRate: parseInt(text) || undefined })
              }
              keyboardType="numeric"
            />
          </View>

          {/* Contact Info */}
          <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: 0909123456"
              value={formData.contactInfo.phone}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, phone: text },
                })
              }
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Zalo</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: 0909123456"
              value={formData.contactInfo.zalo}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, zalo: text },
                })
              }
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="VD: contact@example.com"
              value={formData.contactInfo.email}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  contactInfo: { ...formData.contactInfo, email: text },
                })
              }
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Đang gửi...' : 'Đăng tin'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            * Tin của bạn sẽ được admin kiểm duyệt trong vòng 24h
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#ff4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default QuickPostForm;
