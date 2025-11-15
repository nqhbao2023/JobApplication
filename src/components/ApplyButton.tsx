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
  jobSource: 'crawled' | 'quick-post' | 'featured';
  sourceUrl?: string;
  contactInfo?: ContactInfo;
  onApplyFeatured?: () => void; // Callback để gửi CV
}

const ApplyButton: React.FC<ApplyButtonProps> = ({
  jobSource,
  sourceUrl,
  contactInfo,
  onApplyFeatured,
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
      'Công việc này từ nguồn bên ngoài. Bạn sẽ được chuyển đến trang gốc để ứng tuyển.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xem chi tiết',
          onPress: () => Linking.openURL(sourceUrl),
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

    if (contactInfo.email) {
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
    switch (jobSource) {
      case 'crawled':
        return (
          <TouchableOpacity style={styles.button} onPress={handleCrawledJobApply}>
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Xem chi tiết trên web</Text>
          </TouchableOpacity>
        );

      case 'quick-post':
        return (
          <TouchableOpacity
            style={[styles.button, styles.quickPostButton]}
            onPress={handleQuickPostApply}
          >
            <Ionicons name="call-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Liên hệ ngay</Text>
          </TouchableOpacity>
        );

      case 'featured':
        return (
          <TouchableOpacity
            style={[styles.button, styles.featuredButton]}
            onPress={handleFeaturedJobApply}
          >
            <Ionicons name="send-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Gửi CV ứng tuyển</Text>
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
    marginVertical: 16,
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
  quickPostButton: {
    backgroundColor: '#34C759',
  },
  featuredButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ApplyButton;
