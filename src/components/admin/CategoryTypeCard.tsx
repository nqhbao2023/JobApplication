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
  };
  onEdit: () => void;
  onDelete: () => void;
};

export const CategoryTypeCard = ({ item, onEdit, onDelete }: CategoryTypeCardProps) => {
  const name = item.type_name || item.category_name || 'N/A';
  const icon = (item.icon || item.icon_name || 'briefcase') as keyof typeof Ionicons.glyphMap;
  const color = item.color || '#3b82f6';

  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconBadge, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color="#fff" />
          </View>
          <Text style={styles.title}>{name}</Text>
        </View>
        <View style={styles.actions}>
          <IconButton icon="pencil" color="#3b82f6" onPress={onEdit} />
          <IconButton icon="trash-outline" color="#ef4444" onPress={onDelete} />
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
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
});