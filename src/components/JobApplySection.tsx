import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ApplyButton from '@/components/ApplyButton';
import { Job } from '@/types';

interface JobApplySectionProps {
  job: Job;
  onApplyFeatured?: () => void;
}

const JobApplySection: React.FC<JobApplySectionProps> = ({ job, onApplyFeatured }) => {
  // Default to 'featured' if jobSource is not set (legacy jobs)
  const jobSource = job.jobSource || 'featured';

  return (
    <View style={styles.container}>
      {/* Job Source Badge */}
      <View style={styles.badgeContainer}>
        {jobSource === 'crawled' && (
          <View style={[styles.badge, styles.crawledBadge]}>
            <Text style={styles.badgeText}>📱 Từ {job.sourceUrl ? new URL(job.sourceUrl).hostname : 'web'}</Text>
          </View>
        )}
        {jobSource === 'quick-post' && (
          <View style={[styles.badge, styles.quickPostBadge]}>
            <Text style={styles.badgeText}>⚡ Quick Post</Text>
          </View>
        )}
        {jobSource === 'featured' && job.isFeatured && (
          <View style={[styles.badge, styles.featuredBadge]}>
            <Text style={styles.badgeText}>⭐ Nổi bật</Text>
          </View>
        )}
      </View>

      {/* Work Schedule (for quick-post/part-time jobs) */}
      {job.workSchedule && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🕐 Lịch làm việc:</Text>
          <Text style={styles.infoValue}>{job.workSchedule}</Text>
        </View>
      )}

      {/* Hourly Rate (for part-time jobs) */}
      {job.hourlyRate && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>💰 Lương theo giờ:</Text>
          <Text style={styles.infoValue}>{job.hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ</Text>
        </View>
      )}

      {/* Apply Button */}
      <ApplyButton
        jobSource={jobSource}
        sourceUrl={job.sourceUrl}
        contactInfo={job.contactInfo}
        onApplyFeatured={onApplyFeatured}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  crawledBadge: {
    backgroundColor: '#E3F2FD',
  },
  quickPostBadge: {
    backgroundColor: '#E8F5E9',
  },
  featuredBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default JobApplySection;
