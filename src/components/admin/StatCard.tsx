import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * StatCard Component - Enhanced Version
 * Hiển thị thống kê với growth metrics và trend
 */
type StatCardProps = {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  growth?: number; // % tăng/giảm
  trend?: 'up' | 'down' | 'stable'; // Xu hướng
  subtitle?: string; // Text phụ
};

export const StatCard = ({ 
  title, 
  value, 
  icon, 
  color,
  growth,
  trend,
  subtitle,
}: StatCardProps) => {
  // Icon cho trend
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      case 'stable': return 'remove';
      default: return null;
    }
  };

  const trendIcon = getTrendIcon();

  return (
    <View style={styles.container}>
      <LinearGradient colors={[color, color + 'dd']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={28} color="#fff" />
          </View>
          
          {/* Trend Badge */}
          {trend && trendIcon && growth !== undefined && (
            <View style={styles.trendBadge}>
              <Ionicons name={trendIcon as any} size={12} color="#fff" />
              <Text style={styles.trendText}>
                {growth > 0 ? '+' : ''}{growth}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.value}>{value.toLocaleString()}</Text>
          <Text style={styles.title}>{title}</Text>
          
          {/* Subtitle */}
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </LinearGradient>
    </View>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  title: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.75,
    marginTop: 2,
  },
});
