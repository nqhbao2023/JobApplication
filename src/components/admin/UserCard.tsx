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
};

type UserCardProps = {
  user: User;
  onEdit: (userId: string) => void;
  onDelete: (userId: string, name: string, user: User) => void;
};

const getRoleBadgeVariant = (role?: string) => {
  switch (role) {
    case 'admin': return 'danger';
    case 'employer': return 'warning';
    case 'candidate': return 'primary';
    default: return 'gray';
  }
};

export const UserCard = ({ user, onEdit, onDelete }: UserCardProps) => {
  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.info}>
          <Text style={styles.name}>{user.name || 'N/A'}</Text>
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
        </View>

        <View style={styles.actions}>
          <IconButton 
            icon="pencil" 
            color="#3b82f6" 
            onPress={() => onEdit(user.$id)} 
          />
          <IconButton 
            icon="trash-outline" 
            color="#ef4444" 
            onPress={() => onDelete(user.$id, user.name || user.email || '', user)} 
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
  info: { flex: 1, marginRight: 12 },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: 0.2,
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