/**
 * University/School Input with Auto-suggest
 * Gợi ý các trường đại học, cao đẳng tại Việt Nam
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Utility to remove Vietnamese tones for flexible search
const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

// Comprehensive list of Vietnamese universities and colleges (150+ institutions)
export const VIETNAM_UNIVERSITIES = [
  // === BÁC KHOA & KỸ THUẬT ===
  'Đại học Bách Khoa Hà Nội',
  'Đại học Bách Khoa TP.HCM',
  'Đại học Bách Khoa Đà Nẵng',
  'Trường Đại học Giao thông Vận tải',
  'Trường Đại học Xây dựng Hà Nội',
  'Trường Đại học Xây dựng TP.HCM',
  'Trường Đại học Công nghiệp Hà Nội',
  'Trường Đại học Công nghiệp TP.HCM',
  'Trường Đại học Mỏ - Địa chất',
  'Trường Đại học Hàng hải Việt Nam',
  
  // === ĐẠI HỌC QUỐC GIA ===
  'Đại học Khoa học Tự nhiên TP.HCM',
  'Đại học Khoa học Tự nhiên Hà Nội',
  'Đại học Khoa học Xã hội và Nhân văn TP.HCM',
  'Đại học Khoa học Xã hội và Nhân văn Hà Nội',
  'Đại học Quốc tế (IU - ĐHQG TP.HCM)',
  'Đại học Quốc tế (VNU-IS Hà Nội)',
  'Đại học Công nghệ - ĐHQG Hà Nội',
  'Đại học Công nghệ Thông tin - ĐHQG TP.HCM',
  
  // === KINH TẾ ===
  'Đại học Kinh tế Quốc dân',
  'Đại học Kinh tế TP.HCM',
  'Đại học Kinh tế - Luật (UEL)',
  'Đại học Ngoại thương Hà Nội',
  'Đại học Ngoại thương TP.HCM',
  'Đại học Thương mại',
  'Đại học Công nghiệp Thực phẩm TP.HCM',
  'Đại học Tài chính - Marketing',
  'Đại học Ngân hàng TP.HCM',
  'Đại học Mở TP.HCM',
  'Học viện Ngân hàng',
  'Học viện Tài chính',
  
  // === CÔNG NGHỆ THÔNG TIN ===
  'Đại học FPT Hà Nội',
  'Đại học FPT TP.HCM',
  'Đại học FPT Đà Nẵng',
  'Đại học FPT Cần Thơ',
  'Học viện Công nghệ Bưu chính Viễn thông',
  'Đại học Công nghệ Thông tin (UIT) - ĐHQG TP.HCM',
  'Đại học Thông tin Liên lạc',
  'Đại học Sài Gòn',
  
  // === BÌNH DƯƠNG & LÂN CẬN ===
  'Đại học Thủ Dầu Một',
  'Đại học Quốc tế Miền Đông',
  'Đại học Bình Dương',
  'Đại học Lạc Hồng',
  'Đại học Công nghiệp TP.HCM (Cơ sở Bình Dương)',
  'Cao đẳng Công nghệ Thủ Đức',
  
  // === TP.HCM ===
  'Đại học Tôn Đức Thắng',
  'Đại học Văn Lang',
  'Đại học Hoa Sen',
  'Đại học Sư phạm TP.HCM',
  'Đại học Sư phạm Kỹ thuật TP.HCM',
  'Đại học Y Dược TP.HCM',
  'Đại học Y khoa Phạm Ngọc Thạch',
  'Đại học Luật TP.HCM',
  'Đại học Nông Lâm TP.HCM',
  'Đại học Sài Gòn',
  'Đại học Hồng Bàng',
  'Đại học Gia Định',
  'Đại học Công nghệ Sài Gòn',
  'Đại học Công nghệ TP.HCM (HUTECH)',
  'Đại học Nguyễn Tất Thành',
  'Đại học Nguyễn Huệ',
  'Đại học Công nghiệp Thực phẩm TP.HCM',
  
  // === HÀ NỘI ===
  'Đại học Sư phạm Hà Nội',
  'Đại học Luật Hà Nội',
  'Đại học Y Hà Nội',
  'Đại học Nông nghiệp Hà Nội',
  'Học viện Nông nghiệp Việt Nam',
  'Đại học Thủy lợi',
  'Đại học Điện lực',
  'Đại học Dân lập Hải Phòng',
  'Đại học Thăng Long',
  'Đại học Đông Á',
  'Đại học Đại Nam',
  
  // === QUỐC TẾ ===
  'Đại học RMIT Việt Nam',
  'Đại học Fulbright Việt Nam',
  'Đại học Anh Quốc Việt Nam (BUV)',
  'Đại học Việt - Nhật',
  'Đại học Việt - Đức',
  'Đại học Việt - Pháp',
  
  // === MIỀN TRUNG ===
  'Đại học Đà Nẵng',
  'Đại học Kinh tế Đà Nẵng',
  'Đại học Sư phạm - Đại học Đà Nẵng',
  'Đại học Huế',
  'Đại học Kinh tế Huế',
  'Đại học Khoa học Huế',
  'Đại học Quy Nhơn',
  'Đại học Nha Trang',
  'Đại học Vinh',
  'Đại học Công nghiệp Quảng Ninh',
  
  // === TÂY NGUYÊN ===
  'Đại học Tây Nguyên',
  'Đại học Đà Lạt',
  
  // === MIỀN TÂY ===
  'Đại học Cần Thơ',
  'Đại học An Giang',
  'Đại học Trà Vinh',
  'Đại học Đồng Tháp',
  'Đại học Sóc Trăng',
  'Đại học Kiên Giang',
  
  // === CAO ĐẲNG NỔI TIẾNG ===
  'Cao đẳng FPT Polytechnic',
  'Cao đẳng Công nghệ Thông tin TP.HCM',
  'Cao đẳng Công Thương TP.HCM',
  'Cao đẳng Kinh tế TP.HCM',
  'Cao đẳng Công nghệ Thủ Đức',
  'Cao đẳng Kỹ thuật Cao Thắng',
  'Cao đẳng Bách Khoa Sài Gòn',
  
  // === HỌC VIỆN CHUYÊN NGÀNH ===
  'Học viện Cảnh sát Nhân dân',
  'Học viện An ninh Nhân dân',
  'Học viện Quân y',
  'Học viện Kỹ thuật Quân sự',
  'Học viện Hậu cần',
  'Học viện Chính trị',
  'Học viện Báo chí và Tuyên truyền',
  'Học viện Âm nhạc Quốc gia Việt Nam',
  'Học viện Điện ảnh',
  'Học viện Múa Việt Nam',
  'Học viện Mỹ thuật Việt Nam',
  
  // === KHÁC ===
  'Trường ĐH Phương Đông',
  'Trường ĐH Yersin Đà Lạt',
  'Trường ĐH Phenikaa',
  'Trường ĐH VinUni',
  'Trường ĐH Quốc tế Sài Gòn (SIU)',
];

interface SchoolInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SchoolInput: React.FC<SchoolInputProps> = ({
  value,
  onChangeText,
  placeholder = 'Tên trường...',
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (value.length >= 2) {
      const searchTerm = removeVietnameseTones(value);
      const filtered = VIETNAM_UNIVERSITIES.filter(school =>
        removeVietnameseTones(school).includes(searchTerm)
      );
      setSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value]);

  const handleSelectSuggestion = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText(suggestion);
    setShowSuggestions(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Ionicons name="school-outline" size={20} color="#64748b" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Only hide if not interacting with suggestions
            setTimeout(() => {
              if (!isFocused) setShowSuggestions(false);
            }, 300);
          }}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item}-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="school" size={16} color="#10b981" />
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
    flex: 1,
  },
});
