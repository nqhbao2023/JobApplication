/**
 * Salary Prediction Badge - AI-powered salary estimation
 * Shows predicted salary range for a job
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiApiService, SalaryPrediction } from '@/services/aiApi.service';
import * as Haptics from 'expo-haptics';

/**
 * Map category name (from database) to salary database key
 * Supports Vietnamese category names, English names, and common variations
 */
const mapCategoryToSalaryKey = (categoryName: string): string => {
  const normalized = categoryName.toLowerCase().trim();
  
  // Direct matches
  const categoryMap: Record<string, string> = {
    // F&B / Food & Beverage
    'f&b': 'f&b',
    'food & beverage': 'f&b',
    'food and beverage': 'f&b',
    'ẩm thực': 'f&b',
    'nhà hàng': 'f&b',
    'quán ăn': 'f&b',
    'cafe': 'f&b',
    'coffee': 'f&b',
    'đồ uống': 'f&b',
    'phục vụ': 'f&b',
    'bếp': 'f&b',
    'bartender': 'f&b',
    'barista': 'f&b',
    
    // IT / Software
    'it-software': 'it-software',
    'it/software': 'it-software',
    'it': 'it-software',
    'software': 'it-software',
    'công nghệ thông tin': 'it-software',
    'cntt': 'it-software',
    'lập trình': 'it-software',
    'developer': 'it-software',
    'programmer': 'it-software',
    'phần mềm': 'it-software',
    
    // Marketing
    'marketing': 'marketing',
    'tiếp thị': 'marketing',
    'digital marketing': 'marketing',
    'online marketing': 'marketing',
    'content': 'marketing',
    'seo': 'marketing',
    'social media': 'marketing',
    
    // Sales / Bán hàng
    'sales': 'sales',
    'bán hàng': 'sales',
    'kinh doanh': 'sales',
    'bán hàng / kinh doanh': 'sales',
    'bán hàng/ kinh doanh': 'sales',
    'sales/kinh doanh': 'sales',
    'telesales': 'sales',
    'nhân viên bán hàng': 'sales',
    
    // Retail
    'retail': 'retail',
    'bán lẻ': 'retail',
    'cửa hàng': 'retail',
    'thu ngân': 'retail',
    'cashier': 'retail',
    'siêu thị': 'retail',
    
    // Design
    'design': 'design',
    'thiết kế': 'design',
    'graphic design': 'design',
    'đồ họa': 'design',
    'ui/ux': 'design',
    'creative': 'design',
    
    // Education
    'education': 'education',
    'giáo dục': 'education',
    'gia sư': 'education',
    'tutor': 'education',
    'giảng viên': 'education',
    'teaching': 'education',
    'đào tạo': 'education',
    
    // Logistics
    'logistics': 'logistics',
    'vận chuyển': 'logistics',
    'giao hàng': 'logistics',
    'shipper': 'logistics',
    'delivery': 'logistics',
    'kho vận': 'logistics',
    'warehouse': 'logistics',
    
    // Other common categories - fallback to closest match
    'admin': 'sales', // Office/Admin work similar to sales
    'hành chính': 'sales',
    'văn phòng': 'sales',
    'office': 'sales',
    'truyền thông': 'marketing',
    'pr': 'marketing',
    'sự kiện': 'marketing',
    'event': 'marketing',
    'tổ chức sự kiện': 'marketing',
    'báo chí': 'marketing',
    'biên tập': 'marketing',
    'báo chí / biên tập': 'marketing',
  };
  
  // Try exact match first
  if (categoryMap[normalized]) {
    return categoryMap[normalized];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(categoryMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Default fallback - use 'sales' as it has middle-range salaries
  return 'sales';
};

interface SalaryPredictionBadgeProps {
  jobData: {
    title: string;
    category: string;
    location: string;
    type: 'part-time' | 'full-time' | 'internship' | 'freelance';
  };
  autoLoad?: boolean;
}

export const SalaryPredictionBadge: React.FC<SalaryPredictionBadgeProps> = ({
  jobData,
  autoLoad = false,
}) => {
  const [prediction, setPrediction] = useState<SalaryPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (autoLoad) {
      predictSalary();
    }
  }, [autoLoad]);

  const predictSalary = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Map category to salary database key
      const mappedCategory = mapCategoryToSalaryKey(jobData.category);
      
      if (__DEV__) {
        console.log('[SalaryPrediction] Input category:', jobData.category);
        console.log('[SalaryPrediction] Mapped to:', mappedCategory);
      }
      
      const result = await aiApiService.predictSalary({
        ...jobData,
        category: mappedCategory,
      });
      setPrediction(result);
      setExpanded(true);
      
      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error predicting salary:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (amount: number, unit: string) => {
    if (unit === 'VNĐ/giờ') {
      return `${amount.toLocaleString('vi-VN')} đ/giờ`;
    } else if (unit === 'VNĐ/tháng') {
      return `${(amount / 1000000).toFixed(1)}M đ/tháng`;
    }
    return `${amount.toLocaleString('vi-VN')} ${unit}`;
  };

  if (!prediction && !loading && !expanded) {
    // Compact button to trigger prediction
    return (
      <TouchableOpacity style={styles.compactButton} onPress={predictSalary}>
        <Ionicons name="sparkles" size={16} color="#7c3aed" />
        <Text style={styles.compactButtonText}>Dự đoán lương bởi AI</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="cash" size={20} color="#10b981" />
          <Text style={styles.title}>Mức Lương Ước Tính</Text>
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#7c3aed" />
            <Text style={styles.aiText}>AI</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#64748b"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text style={styles.loadingText}>Đang phân tích...</Text>
            </View>
          ) : prediction ? (
            <View style={styles.predictionContent}>
              {/* Salary Range */}
              <View style={styles.salaryRange}>
                <Text style={styles.salaryLabel}>Khoảng lương:</Text>
                <Text style={styles.salaryValue}>
                  {formatSalary(prediction.min, prediction.unit)} - {formatSalary(prediction.max, prediction.unit)}
                </Text>
                <Text style={styles.salaryAvg}>
                  Trung bình: {formatSalary(prediction.avg, prediction.unit)}
                </Text>
              </View>

              {/* Confidence */}
              <View style={styles.confidence}>
                <Ionicons
                  name={
                    prediction.confidence === 'high'
                      ? 'checkmark-circle'
                      : prediction.confidence === 'medium'
                      ? 'alert-circle'
                      : 'help-circle'
                  }
                  size={16}
                  color={
                    prediction.confidence === 'high'
                      ? '#10b981'
                      : prediction.confidence === 'medium'
                      ? '#f59e0b'
                      : '#94a3b8'
                  }
                />
                <Text style={styles.confidenceText}>
                  Độ tin cậy:{' '}
                  {prediction.confidence === 'high'
                    ? 'Cao'
                    : prediction.confidence === 'medium'
                    ? 'Trung bình'
                    : 'Thấp'}
                </Text>
              </View>

              {/* Note */}
              <Text style={styles.note}>
                💡 Dựa trên dữ liệu thị trường và phân tích AI
              </Text>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Không thể dự đoán lương cho công việc này</Text>
              <TouchableOpacity style={styles.retryButton} onPress={predictSalary}>
                <Ionicons name="refresh" size={16} color="#7c3aed" />
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignSelf: 'flex-start',
  },
  compactButtonText: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '600',
  },
  container: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f5f3ff',
    borderRadius: 6,
  },
  aiText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
  content: {
    marginTop: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  predictionContent: {
    gap: 10,
  },
  salaryRange: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  salaryLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  salaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  salaryAvg: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  confidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceText: {
    fontSize: 13,
    color: '#475569',
  },
  note: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  retryText: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '600',
  },
});
