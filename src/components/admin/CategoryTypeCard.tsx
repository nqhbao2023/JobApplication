import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../base/Card';
import { IconButton } from '../base/IconButton';

type CategoryTypeCardProps = {
  item: {
    $id: string;
    type_name?: string;
    category_name?: string;
    icon?: string;
    icon_name?: string;
    color?: string;
    isSystem?: boolean; // Thêm flag để đánh dấu system type
  };
  onEdit: () => void;
  onDelete: () => void;
};

// Helper function to check if a string is an emoji
// Ionicons names are typically lowercase with hyphens (e.g., "briefcase-outline")
// So if the string contains emoji characters, it's an emoji
const isEmoji = (str: string): boolean => {
  // Check for common emoji ranges in Unicode
  // This covers most emoji including symbols, flags, and various emoji ranges
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/u;
  return emojiRegex.test(str);
};

export const CategoryTypeCard = ({ item, onEdit, onDelete }: CategoryTypeCardProps) => {
  const name = item.type_name || item.category_name || 'N/A';
  const iconValue = item.icon_name || item.icon || 'briefcase';
  const color = item.color || '#3b82f6';
  const isSystem = item.isSystem ?? false; // Kiểm tra nếu là system type
  
  // Check if the icon is an emoji or an Ionicons name
  const isIconEmoji = isEmoji(iconValue);
  const iconName = isIconEmoji ? 'briefcase' : (iconValue as keyof typeof Ionicons.glyphMap);

  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: color }]}>
            {isIconEmoji ? (
              <Text style={styles.emojiIcon}>{iconValue}</Text>
            ) : (
              <Ionicons name={iconName} size={20} color="#fff" />
            )}
          </View>
          <View style={styles.textContent}>
            <Text style={styles.title}>{name}</Text>
            {isSystem && (
              <View style={styles.systemBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                <Text style={styles.systemText}>Hệ thống</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          {/* Chỉ hiển thị nút edit nếu không phải system type */}
          {!isSystem && (
            <IconButton icon="pencil" color="#3b82f6" onPress={onEdit} />
          )}
          {/* Chỉ hiển thị nút xóa nếu không phải system type */}
          {!isSystem && (
            <IconButton icon="trash-outline" color="#ef4444" onPress={onDelete} />
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    fontSize: 20,
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  systemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  systemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
});