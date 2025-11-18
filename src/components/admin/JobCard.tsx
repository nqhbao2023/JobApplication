import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../base/Card';
import { Badge } from '../base/Badge';
import { IconButton } from '../base/IconButton';

type Salary = {
  currency?: string;
  min?: number;
  max?: number;
};

type Job = {
  $id: string;
  title?: string;
  company_name?: string;
  location?: string;
  salary?: string | Salary;
  salary_text?: string;
  salary_min?: number;
  salary_max?: number;
  status?: string;
  source?: string;
  job_type_id?: string;
  category?: string;
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

const formatSalary = (job: Job): string => {
  // Ưu tiên salary_text từ crawler
  if (job.salary_text) return job.salary_text;
  
  // Nếu có salary_min/max từ crawler
  if (job.salary_min || job.salary_max) {
    const min = job.salary_min ? (job.salary_min / 1_000_000).toFixed(0) : '';
    const max = job.salary_max ? (job.salary_max / 1_000_000).toFixed(0) : '';
    
    if (min && max) return `${min}-${max} triệu`;
    if (min) return `Từ ${min} triệu`;
    if (max) return `Tối đa ${max} triệu`;
  }
  
  // Legacy salary format
  const salary = job.salary;
  if (!salary) return 'Thỏa thuận';
  
  if (typeof salary === 'string') return salary;
  
  const { currency = 'VND', min, max } = salary;
  
  if (min && max) {
    return `${min.toLocaleString()} - ${max.toLocaleString()} ${currency}`;
  }
  if (min) {
    return `Từ ${min.toLocaleString()} ${currency}`;
  }
  if (max) {
    return `Tối đa ${max.toLocaleString()} ${currency}`;
  }
  
  return 'Thỏa thuận';
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

          {/* Company Name - hiển thị cho job crawl */}
          {job.company_name && (
            <View style={styles.companyRow}>
              <Ionicons name="business-outline" size={16} color="#3b82f6" />
              <Text style={styles.companyText} numberOfLines={1}>
                {job.company_name}
              </Text>
            </View>
          )}

          {/* Source Badge */}
          {job.source && (
            <View style={styles.sourceRow}>
              <Badge label={`📡 ${job.source}`} variant="primary" />
              {job.job_type_id && <Badge label={job.job_type_id} variant="gray" />}
              {job.category && <Badge label={job.category} variant="warning" />}
            </View>
          )}

          {/* Owner info - chỉ hiển thị cho job thường */}
          {!job.source && job.ownerName && (
            <View style={styles.owner}>
              <Ionicons name="person-circle-outline" size={16} color="#64748b" />
              <Text style={styles.ownerText} numberOfLines={1}>
                {job.ownerName} • {job.ownerEmail}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.detail}>{job.location || 'Chưa có'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color="#64748b" />
            <Text style={styles.detail}>{formatSalary(job)}</Text>
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
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 8,
  },
  companyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    flex: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
});