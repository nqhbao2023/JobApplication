import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ContactInfo {
  phone?: string;
  zalo?: string;
  facebook?: string;
  email?: string;
}

interface ApplyButtonProps {
  jobSource: 'crawled' | 'quick-post' | 'featured' | 'internal';
  sourceUrl?: string;
  contactInfo?: ContactInfo;
  onApplyFeatured?: () => void; // Callback để gửi CV
  onApplyQuickPost?: () => void; // Callback để gửi CV qua email cho quick-post
  compact?: boolean; // Compact mode for bottom bar
  jobId?: string; // Job ID for quick-post notification
  isApplied?: boolean; // Đã nộp CV hay chưa
  applyLoading?: boolean; // Đang xử lý nộp CV
}

const ApplyButton: React.FC<ApplyButtonProps> = ({
  jobSource,
  sourceUrl,
  contactInfo,
  onApplyFeatured,
  onApplyQuickPost,
  compact = false,
  jobId,
  isApplied = false,
  applyLoading = false,
}) => {
  /**
   * Type 1: Crawled Jobs - Redirect to source
   */
  const handleCrawledJobApply = () => {
    if (!sourceUrl) {
      Alert.alert('Lỗi', 'Không tìm thấy link công việc gốc');
      return;
    }

    Alert.alert(
      'Ứng tuyển công việc',
      'Bạn sẽ được chuyển đến trang nguồn để ứng tuyển',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục',
          onPress: () => {
            Linking.openURL(sourceUrl).catch(() => {
              Alert.alert('Lỗi', 'Không thể mở link');
            });
          },
        },
      ]
    );
  };

  /**
   * Type 2: Quick Post Jobs - Show contact options
   */
  const handleQuickPostApply = () => {
    if (!contactInfo) {
      Alert.alert('Lỗi', 'Không có thông tin liên hệ');
      return;
    }

    const buttons: any[] = [];

    // Option: Send CV via email (ưu tiên)
    if (contactInfo.email && onApplyQuickPost) {
      buttons.push({
        text: `📧 Gửi CV qua Email`,
        onPress: onApplyQuickPost,
      });
    }

    if (contactInfo.phone) {
      buttons.push({
        text: `📞 Gọi: ${contactInfo.phone}`,
        onPress: () => Linking.openURL(`tel:${contactInfo.phone}`),
      });
    }

    if (contactInfo.zalo) {
      buttons.push({
        text: `💬 Zalo: ${contactInfo.zalo}`,
        onPress: () => {
          const zaloUrl = Platform.OS === 'ios'
            ? `zalo://conversation?phone=${contactInfo.zalo}`
            : `https://zalo.me/${contactInfo.zalo}`;
          Linking.openURL(zaloUrl);
        },
      });
    }

    if (contactInfo.facebook) {
      buttons.push({
        text: `📘 Facebook`,
        onPress: () => Linking.openURL(contactInfo.facebook!),
      });
    }

    if (contactInfo.email && !onApplyQuickPost) {
      buttons.push({
        text: `📧 Email: ${contactInfo.email}`,
        onPress: () => Linking.openURL(`mailto:${contactInfo.email}`),
      });
    }

    buttons.push({ text: 'Hủy', style: 'cancel' });

    Alert.alert('Liên hệ tuyển dụng', 'Chọn cách liên hệ:', buttons);
  };

  /**
   * Type 3: Featured Jobs - Send CV in app
   */
  const handleFeaturedJobApply = () => {
    if (onApplyFeatured) {
      onApplyFeatured();
    } else {
      Alert.alert('Thông báo', 'Chức năng gửi CV đang được phát triển');
    }
  };

  const renderButton = () => {
    const buttonStyle = compact ? styles.compactButton : styles.button;
    const iconSize = compact ? 18 : 20;
    const textStyle = compact ? styles.compactButtonText : styles.buttonText;

    switch (jobSource) {
      case 'crawled':
        return (
          <TouchableOpacity style={buttonStyle} onPress={handleCrawledJobApply}>
            <Ionicons name="open-outline" size={iconSize} color="#fff" />
            <Text style={textStyle}>Xem chi tiết trên web</Text>
          </TouchableOpacity>
        );

      case 'quick-post':
        return (
          <TouchableOpacity
            style={[buttonStyle, styles.quickPostButton]}
            onPress={handleQuickPostApply}
          >
            <Ionicons name="call-outline" size={iconSize} color="#fff" />
            <Text style={textStyle}>Liên hệ ngay</Text>
          </TouchableOpacity>
        );

      case 'featured':
      case 'internal':
        return (
          <TouchableOpacity
            style={[
              buttonStyle, 
              styles.featuredButton,
              (isApplied || applyLoading) && styles.disabledButton
            ]}
            onPress={handleFeaturedJobApply}
            disabled={isApplied || applyLoading}
          >
            <Ionicons 
              name={isApplied ? "checkmark-circle-outline" : "send-outline"} 
              size={iconSize} 
              color="#fff" 
            />
            <Text style={textStyle}>
              {isApplied ? '✅ Đã nộp CV' : applyLoading ? 'Đang xử lý...' : 'Gửi CV ứng tuyển'}
            </Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderButton()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  compactButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  quickPostButton: {
    backgroundColor: '#34C759',
  },
  featuredButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  compactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ApplyButton;
