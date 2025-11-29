/**
 * RecommendedJobsSection.tsx
 * 
 * Component hiển thị danh sách việc làm được AI gợi ý dựa trên skills của candidate
 * 
 * Features:
 * - Tự động fetch recommendations khi user có skills
 * - Hiển thị điểm match và lý do gợi ý
 * - Pull-to-refresh support
 * - Loading/Error/Empty states
 * - Navigate to job detail on tap
 * 
 * @author AI Assistant
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { aiApiService, AIRecommendation } from '@/services/aiApi.service';
import { jobApiService } from '@/services/jobApi.service';
import { Job } from '@/types';

// ============================================
// TYPES
// ============================================

interface RecommendedJob extends AIRecommendation {
  jobDetails?: Job;
}

interface RecommendedJobsSectionProps {
  /** User's skills array - nếu rỗng sẽ hiển thị prompt */
  userSkills?: string[];
  /** Callback khi user muốn thêm skills */
  onAddSkillsPress?: () => void;
  /** Max số lượng jobs hiển thị */
  limit?: number;
  /** Show/hide section header */
  showHeader?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const RecommendedJobsSection: React.FC<RecommendedJobsSectionProps> = ({
  userSkills = [],
  onAddSkillsPress,
  limit = 5,
  showHeader = true,
}) => {
  // State
  const [recommendations, setRecommendations] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ============================================
  // FETCH RECOMMENDATIONS
  // ============================================

  const fetchRecommendations = useCallback(async () => {
    // Skip if no skills
    if (!userSkills || userSkills.length === 0) {
      setRecommendations([]);
      setHasLoaded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🤖 [RecommendedJobs] Fetching recommendations...');
      
      // 1. Get AI recommendations
      const aiRecs = await aiApiService.getRecommendations(limit);
      
      console.log(`✅ [RecommendedJobs] Got ${aiRecs.length} recommendations`);

      if (aiRecs.length === 0) {
        setRecommendations([]);
        setHasLoaded(true);
        return;
      }

      // 2. Fetch job details for each recommendation
      const jobsWithDetails: RecommendedJob[] = await Promise.all(
        aiRecs.map(async (rec) => {
          try {
            const jobDetails = await jobApiService.getJobById(rec.jobId);
            return { ...rec, jobDetails };
          } catch (err) {
            console.warn(`⚠️ [RecommendedJobs] Failed to fetch job ${rec.jobId}:`, err);
            return rec; // Return without details
          }
        })
      );

      // Filter out jobs without details
      const validJobs = jobsWithDetails.filter(j => j.jobDetails);
      setRecommendations(validJobs);
      
      console.log(`✅ [RecommendedJobs] Loaded ${validJobs.length} jobs with details`);
    } catch (err: any) {
      console.error('❌ [RecommendedJobs] Error:', err.message);
      setError('Không thể tải gợi ý. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [userSkills, limit]);

  // Fetch on mount and when skills change
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleJobPress = (job: Job) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/(shared)/jobDetail', params: { id: job.id || job.$id } } as any);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchRecommendations();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  // No skills prompt
  if (userSkills.length === 0 && hasLoaded) {
    return (
      <Animated.View 
        entering={FadeInDown.duration(400)}
        style={styles.noSkillsContainer}
      >
        <LinearGradient
          colors={['#f0f9ff', '#e0f2fe']}
          style={styles.noSkillsGradient}
        >
          <Ionicons name="bulb-outline" size={40} color="#0ea5e9" />
          <Text style={styles.noSkillsTitle}>Nhận gợi ý việc làm từ AI</Text>
          <Text style={styles.noSkillsText}>
            Thêm kỹ năng vào hồ sơ để AI gợi ý việc làm phù hợp với bạn
          </Text>
          {onAddSkillsPress && (
            <TouchableOpacity 
              style={styles.addSkillsButton}
              onPress={() => {
                // Show alert to guide user
                Alert.alert(
                  '📝 Cập nhật kỹ năng',
                  'Bạn sẽ được chuyển đến trang Hồ sơ để thêm kỹ năng của mình. Sau khi cập nhật, AI sẽ gợi ý việc làm phù hợp!',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Đi đến Hồ sơ', onPress: onAddSkillsPress },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addSkillsButtonText}>+ Thêm kỹ năng</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </Animated.View>
    );
  }

  // Loading state
  if (loading && !hasLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#7c3aed" />
        <Text style={styles.loadingText}>Đang phân tích kỹ năng của bạn...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state (has skills but no recommendations)
  if (recommendations.length === 0 && hasLoaded) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={32} color="#94a3b8" />
        <Text style={styles.emptyText}>
          Chưa có gợi ý phù hợp. Thử cập nhật kỹ năng của bạn!
        </Text>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      {/* Header */}
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={20} color="#7c3aed" />
            <Text style={styles.headerTitle}>AI Gợi ý cho bạn</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#64748b" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Jobs List */}
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.jobId}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 100).duration(300)}>
            <RecommendedJobCard
              recommendation={item}
              onPress={() => item.jobDetails && handleJobPress(item.jobDetails)}
            />
          </Animated.View>
        )}
      />
    </Animated.View>
  );
};

// ============================================
// SUB-COMPONENT: Recommended Job Card
// ============================================

interface RecommendedJobCardProps {
  recommendation: RecommendedJob;
  onPress: () => void;
}

const RecommendedJobCard: React.FC<RecommendedJobCardProps> = ({
  recommendation,
  onPress,
}) => {
  const { jobDetails, score, reason, matchedSkills } = recommendation;

  if (!jobDetails) return null;

  // Get score color
  const getScoreColor = (s: number) => {
    if (s >= 70) return '#10b981'; // Green
    if (s >= 50) return '#f59e0b'; // Orange
    return '#64748b'; // Gray
  };

  // Format salary
  const formatSalary = () => {
    if (!jobDetails.salary) return 'Thương lượng';
    
    // Handle string salary (e.g., "Thỏa thuận")
    if (typeof jobDetails.salary === 'string') {
      return jobDetails.salary || 'Thương lượng';
    }
    
    // Handle object salary
    const { min, max, currency = 'VND' } = jobDetails.salary as { min?: number; max?: number; currency?: string };
    if (!min && !max) return 'Thương lượng';
    if (min && max) {
      return `${(min / 1000000).toFixed(0)}-${(max / 1000000).toFixed(0)}M ${currency}`;
    }
    return `${(((min || max) as number) / 1000000).toFixed(0)}M ${currency}`;
  };

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Match Score Badge */}
      <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score) }]}>
        <Text style={styles.scoreText}>{score}% phù hợp</Text>
      </View>

      {/* Job Info */}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {jobDetails.title}
      </Text>
      
      <Text style={styles.cardCompany} numberOfLines={1}>
        {typeof jobDetails.company === 'string' 
          ? jobDetails.company 
          : (jobDetails.company as any)?.corp_name || jobDetails.company_name || 'Công ty'}
      </Text>

      {/* Meta Info */}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.metaText} numberOfLines={1}>
            {jobDetails.location || 'Chưa rõ'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={14} color="#64748b" />
          <Text style={styles.metaText}>{formatSalary()}</Text>
        </View>
      </View>

      {/* Matched Skills */}
      {matchedSkills.length > 0 && (
        <View style={styles.skillsContainer}>
          {matchedSkills.slice(0, 3).map((skill, idx) => (
            <View key={idx} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {matchedSkills.length > 3 && (
            <Text style={styles.moreSkills}>+{matchedSkills.length - 3}</Text>
          )}
        </View>
      )}

      {/* Reason */}
      <Text style={styles.reasonText} numberOfLines={1}>
        {reason}
      </Text>
    </TouchableOpacity>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  listContent: {
    paddingRight: 20,
    gap: 12,
  },

  // Card Styles
  cardContainer: {
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardCompany: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  skillBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  skillText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '600',
  },
  moreSkills: {
    fontSize: 11,
    color: '#64748b',
    alignSelf: 'center',
  },
  reasonText: {
    fontSize: 12,
    color: '#10b981',
    fontStyle: 'italic',
  },

  // Loading State
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },

  // Error State
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // No Skills Prompt
  noSkillsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  noSkillsGradient: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  noSkillsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
  },
  noSkillsText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  addSkillsButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0ea5e9',
    borderRadius: 20,
  },
  addSkillsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RecommendedJobsSection;
