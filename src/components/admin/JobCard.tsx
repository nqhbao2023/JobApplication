import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../base/Card';
import { Badge } from '../base/Badge';
import { IconButton } from '../base/IconButton';

type Job = {
  $id: string;
  title?: string;
  location?: string;
  salary?: string;
  status?: string;
  ownerName?: string;
  ownerEmail?: string;
  created_at?: string;
};

type JobCardProps = {
  job: Job;
  onEdit: (jobId: string) => void;
  onDelete: (jobId: string, title: string) => void;
};

const getStatusBadgeVariant = (status?: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'pending': return 'warning';
    case 'closed': return 'gray';
    default: return 'primary';
  }
};

export const JobCard = ({ job, onEdit, onDelete }: JobCardProps) => {
  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {job.title || 'N/A'}
            </Text>
            <Badge 
              label={job.status || 'active'} 
              variant={getStatusBadgeVariant(job.status)} 
            />
          </View>

          <View style={styles.owner}>
            <Ionicons name="person-circle-outline" size={16} color="#64748b" />
            <Text style={styles.ownerText} numberOfLines={1}>
              {job.ownerName} • {job.ownerEmail}
            </Text>
          </View>

          <View style={styles.detailRow}>
  <Ionicons name="location-outline" size={14} color="#64748b" />
  <Text style={styles.detail}>{job.location || 'Chưa có'}</Text>
</View>

<View style={styles.detailRow}>
  <Ionicons name="cash-outline" size={14} color="#64748b" />
  <Text style={styles.detail}>{job.salary || 'Thỏa thuận'}</Text>
</View>

          {job.created_at && (
            <Text style={styles.meta}>
              📅 {new Date(job.created_at).toLocaleDateString('vi-VN')}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <IconButton 
            icon="pencil" 
            color="#3b82f6" 
            onPress={() => onEdit(job.$id)} 
          />
          <IconButton 
            icon="trash-outline" 
            color="#ef4444" 
            onPress={() => onDelete(job.$id, job.title || '')} 
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
    alignItems: 'flex-start',
  },
  info: { flex: 1, marginRight: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  owner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 8,
  },
  ownerText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
  },
  detail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
});