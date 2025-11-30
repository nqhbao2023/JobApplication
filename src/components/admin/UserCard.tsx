import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../base/Card';
import { Badge } from '../base/Badge';
import { IconButton } from '../base/IconButton';

type User = {
  $id: string;
  name?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
  phone?: string;
  created_at?: string;
  disabled?: boolean;
  disabledAt?: string;
};

type UserCardProps = {
  user: User;
  onView: (userId: string) => void;
  onToggleDisable: (userId: string, name: string, user: User) => void;
};

const getRoleBadgeVariant = (role?: string) => {
  switch (role) {
    case 'admin': return 'danger';
    case 'employer': return 'warning';
    case 'candidate': return 'primary';
    default: return 'gray';
  }
};

export const UserCard = ({ user, onView, onToggleDisable }: UserCardProps) => {
  const isDisabled = user.disabled === true;

  return (
    <Card style={isDisabled ? styles.disabledCard : undefined}>
      <View style={styles.container}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, isDisabled && styles.disabledText]}>
              {user.name || 'N/A'}
            </Text>
            {isDisabled && (
              <Badge label="Đã khóa" variant="danger" />
            )}
          </View>
          <Text style={styles.email}>{user.email}</Text>
          
          {user.phone && (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={14} color="#475569" />
              <Text style={styles.phone}>{user.phone}</Text>
            </View>
          )}
          
          <View style={styles.badges}>
            <Badge 
              label={user.role || 'candidate'} 
              variant={getRoleBadgeVariant(user.role)} 
            />
            {user.isAdmin && <Badge label="Admin" variant="danger" />}
          </View>

          {user.created_at && (
            <Text style={styles.meta}>
              Tạo: {new Date(user.created_at).toLocaleDateString('vi-VN')}
            </Text>
          )}
          
          {isDisabled && user.disabledAt && (
            <Text style={styles.disabledMeta}>
              🚫 Khóa lúc: {new Date(user.disabledAt).toLocaleDateString('vi-VN')}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <IconButton 
            icon="eye-outline" 
            color="#3b82f6" 
            onPress={() => onView(user.$id)} 
          />
          <IconButton 
            icon={isDisabled ? "checkmark-circle-outline" : "ban-outline"} 
            color={isDisabled ? "#10B981" : "#f59e0b"} 
            onPress={() => onToggleDisable(user.$id, user.name || user.email || '', user)} 
          />
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
  disabledCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  info: { flex: 1, marginRight: 12 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  disabledText: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  email: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  phone: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  disabledMeta: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
});