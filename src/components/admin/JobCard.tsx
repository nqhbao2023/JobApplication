import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../base/Card';
import { Badge } from '../base/Badge';
import { StatusBadge } from '../base/StatusBadge';
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
  // ✅ NEW: Fields for job type identification
  jobType?: 'employer_seeking' | 'candidate_seeking';
  employerId?: string;
  posterId?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    zalo?: string;
    facebook?: string;
  };
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
    case 'inactive': return 'warning';
    case 'closed': return 'gray';
    default: return 'primary';
  }
};

// ✅ NEW: Get source badge info based on job properties
const getSourceBadgeInfo = (job: Job): { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'gray' } => {
  // Quick Post: source = 'quick-post' OR jobType = 'candidate_seeking'
  if (job.source === 'quick-post' || job.jobType === 'candidate_seeking') {
    return { label: '📝 Ứng viên tìm việc', variant: 'warning' };
  }
  // Crawled: source = 'viecoi'
  if (job.source === 'viecoi') {
    return { label: '🌐 Viecoi', variant: 'primary' };
  }
  // Employer Jobs: source = 'internal' OR has employerId
  if (job.source === 'internal' || job.employerId) {
    return { label: '🏢 Employer', variant: 'success' };
  }
  // Default based on other indicators
  if (job.ownerName && job.ownerName !== 'N/A') {
    return { label: '🏢 Employer', variant: 'success' };
  }
  return { label: '📡 Unknown', variant: 'gray' };
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
  const sourceBadge = getSourceBadgeInfo(job);
  
  return (
    <Card>
      <View style={styles.container}>
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {job.title || 'N/A'}
            </Text>
            {/* Sử dụng StatusBadge mới thay vì Badge */}
            <StatusBadge 
              status={(job.status as any) || 'active'} 
              size="small"
            />
          </View>

          {/* ✅ NEW: Source Badge - Always show */}
          <View style={styles.sourceRow}>
            <Badge label={sourceBadge.label} variant={sourceBadge.variant} />
            {job.job_type_id && <Badge label={job.job_type_id} variant="gray" />}
            {job.category && <Badge label={job.category} variant="gray" />}
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

          {/* Owner info - hiển thị cho employer job hoặc quick post */}
          {job.ownerName && job.ownerName !== 'N/A' && (
            <View style={styles.owner}>
              <Ionicons name="person-circle-outline" size={16} color="#64748b" />
              <Text style={styles.ownerText} numberOfLines={1}>
                {job.ownerName} • {job.ownerEmail}
              </Text>
            </View>
          )}

          {/* Contact Info - hiển thị cho quick post */}
          {job.contactInfo && (job.contactInfo.phone || job.contactInfo.email) && (
            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={14} color="#10b981" />
              <Text style={styles.contactText} numberOfLines={1}>
                {job.contactInfo.phone || job.contactInfo.email || job.contactInfo.zalo}
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
  // ✅ NEW: Contact row for quick posts
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#ecfdf5',
    padding: 6,
    borderRadius: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#059669',
    flex: 1,
  },
});