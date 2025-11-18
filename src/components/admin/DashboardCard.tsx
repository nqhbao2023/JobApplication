import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * DashboardCard Component - Enhanced version
 * Hiển thị card trong dashboard với metrics và growth trend
 * 
 * @param title - Tiêu đề card
 * @param icon - Icon từ Ionicons
 * @param color - Màu chủ đạo
 * @param onPress - Callback khi nhấn vào card
 * @param value - Giá trị hiển thị (optional) - VD: 1250 users
 * @param subtitle - Text phụ (optional) - VD: "45 new this week"
 * @param trend - Xu hướng: 'up' | 'down' | 'stable' (optional)
 * @param change - % thay đổi (optional) - VD: 12 nghĩa là +12%
 */
type DashboardCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  value?: number | string; // Giá trị chính
  subtitle?: string; // Text phụ
  trend?: 'up' | 'down' | 'stable'; // Xu hướng
  change?: number; // % thay đổi
};

export const DashboardCard = ({ 
  title, 
  icon, 
  color, 
  onPress,
  value,
  subtitle,
  trend,
  change,
}: DashboardCardProps) => {
  // Chọn icon trend dựa trên xu hướng
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'stable':
        return 'remove';
      default:
        return null;
    }
  };

  // Màu của trend
  const getTrendColor = () => {
    if (!trend) return '#fff';
    switch (trend) {
      case 'up':
        return '#86efac'; // Green
      case 'down':
        return '#fca5a5'; // Red
      case 'stable':
        return '#d1d5db'; // Gray
      default:
        return '#fff';
    }
  };

  const trendIcon = getTrendIcon();
  const trendColor = getTrendColor();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={[color, color + 'dd']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={28} color="#fff" />
          </View>
          
          {/* Hiển thị trend nếu có */}
          {trend && trendIcon && (
            <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={trendIcon as any} size={14} color={trendColor} />
              {change !== undefined && (
                <Text style={[styles.changeText, { color: trendColor }]}>
                  {change > 0 ? '+' : ''}{change}%
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Hiển thị value nếu có */}
          {value !== undefined && (
            <Text style={styles.value}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
          )}
          
          <Text style={styles.title}>{title}</Text>
          
          {/* Hiển thị subtitle nếu có */}
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};


const styles = StyleSheet.create({
  container: {
    width: '47%',
    minHeight: 140,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.95,
  },
  subtitle: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.75,
    marginTop: 2,
  },
});