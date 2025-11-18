import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * StatusBadge Component
 * Hiển thị trạng thái với màu sắc tương ứng
 * 
 * @param status - Trạng thái: 'active', 'pending', 'closed', 'rejected'
 * @param size - Kích thước: 'small' | 'medium' | 'large'
 * 
 * Cách sử dụng:
 * <StatusBadge status="active" />
 * <StatusBadge status="pending" size="small" />
 */

type Status = 'active' | 'pending' | 'closed' | 'rejected' | 'approved';
type Size = 'small' | 'medium' | 'large';

interface StatusBadgeProps {
  status: Status;
  size?: Size;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  // Định nghĩa màu sắc cho từng trạng thái
  const getStatusColor = (): { bg: string; text: string } => {
    switch (status) {
      case 'active':
      case 'approved':
        return { bg: '#dcfce7', text: '#15803d' }; // Green
      case 'pending':
        return { bg: '#fef3c7', text: '#d97706' }; // Yellow/Orange
      case 'rejected':
        return { bg: '#fee2e2', text: '#dc2626' }; // Red
      case 'closed':
        return { bg: '#f1f5f9', text: '#64748b' }; // Gray
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  // Định nghĩa kích thước
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingH: 8, paddingV: 4, fontSize: 11 };
      case 'large':
        return { paddingH: 16, paddingV: 8, fontSize: 15 };
      case 'medium':
      default:
        return { paddingH: 12, paddingV: 6, fontSize: 13 };
    }
  };

  const colors = getStatusColor();
  const sizes = getSizeStyles();

  // Chuyển status thành text hiển thị (capitalize first letter)
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: sizes.paddingH,
          paddingVertical: sizes.paddingV,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: sizes.fontSize,
          },
        ]}
      >
        {statusText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
