import React, { memo, useMemo } from 'react';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  type Job,
  type Company,
  type Category,
  type QuickFilter,
  PLACEHOLDER_JOB_IMG,
  PLACEHOLDER_COMPANY_IMG,
  QUICK_FILTER_CONFIG,
  getContrastColor,
  CARD_GAP,
} from '@/constants/candidate_Home.constants';

export const LoadingScreen = memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A80F0" />
    <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
  </View>
));

LoadingScreen.displayName = 'LoadingScreen';

export const ErrorView = memo(({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
    <Text style={styles.errorText}>{message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>Thử lại</Text>
    </TouchableOpacity>
  </View>
));

ErrorView.displayName = 'ErrorView';

export const SectionHeader = memo(({ 
  title, 
  onPressShowAll 
}: { 
  title: string; 
  onPressShowAll?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onPressShowAll && (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPressShowAll();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <View style={styles.showAllButton}>
          <Text style={styles.showAllBtn}>Xem tất cả</Text>
          <Ionicons name="chevron-forward" size={16} color="#4A80F0" />
        </View>
      </TouchableOpacity>
    )}
  </View>
));

SectionHeader.displayName = 'SectionHeader';

export const QuickFilters = memo(({
  selectedFilter,
  onFilterChange,
}: {
  selectedFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.filterContainer}
  >
    {(Object.keys(QUICK_FILTER_CONFIG) as QuickFilter[]).map(filter => {
      const { label, icon } = QUICK_FILTER_CONFIG[filter];
      const isActive = selectedFilter === filter;

      return (
        <TouchableOpacity
          key={filter}
          style={[styles.filterChip, isActive && styles.filterChipActive]}
          onPress={() => onFilterChange(filter)}
        >
          <Ionicons name={icon as any} size={16} color={isActive ? '#fff' : '#64748b'} />
          <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
));

QuickFilters.displayName = 'QuickFilters';

export const CompanyCard = memo(({ item }: { item: Company }) => (
  <TouchableOpacity
    style={[styles.companyCard, { backgroundColor: item.color || '#f0f4ff' }]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/(shared)/companyDescription', params: { companyId: item.$id } });
    }}
  >
    <Image
      style={styles.companyImage}
      source={{ uri: item.image || PLACEHOLDER_COMPANY_IMG }}
      contentFit="cover"
      transition={200}
    />
    <View style={styles.companyTextContainer}>
      <Text style={[styles.companyTitle, { color: getContrastColor(item.color) }]} numberOfLines={1}>
        {item.corp_name || 'Công ty'}
      </Text>
      <Text style={[styles.companySub, { color: getContrastColor(item.color) }]} numberOfLines={1}>
        {item.nation || 'Việt Nam'}
      </Text>
    </View>
  </TouchableOpacity>
));

CompanyCard.displayName = 'CompanyCard';

export const JobCard = memo(({
  item,
  company,
}: {
  item: Job;
  company?: Company;
}) => (
  <TouchableOpacity
    style={styles.jobCard}
    activeOpacity={0.7}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/jobDescription', params: { jobId: item.$id } });
    }}
  >
    <Image
      style={styles.jobImage}
      source={{ uri: item.image || PLACEHOLDER_JOB_IMG }}
      contentFit="cover"
      transition={200}
    />
    <View style={styles.jobTextContainer}>
      <Text style={styles.jobTitle} numberOfLines={2}>
        {item.title || 'Chưa có tiêu đề'}
      </Text>
      <View style={styles.jobInfoRow}>
        <Ionicons name="business-outline" size={14} color="#64748b" />
        <Text style={styles.jobCompany} numberOfLines={1}>
          {company?.corp_name ?? 'Không rõ công ty'}
        </Text>
      </View>
      {item.location && (
        <View style={styles.jobInfoRow}>
          <Ionicons name="location-outline" size={14} color="#64748b" />
          <Text style={styles.jobInfo} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
      )}
      {item.salary && (
        <View style={styles.jobInfoRow}>
          <Ionicons name="cash-outline" size={14} color="#10b981" />
          <Text style={[styles.jobInfo, { color: '#10b981', fontWeight: '600' }]} numberOfLines={1}>
            {item.salary}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
));

JobCard.displayName = 'JobCard';

export const CategoryCard = memo(({ item, jobCount }: { item: Category & { jobCount?: number }; jobCount?: number }) => (
  <TouchableOpacity
    style={[styles.categoryCard, { backgroundColor: item.color || '#f0f4ff' }]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/(shared)/categoryJobs',
        params: { id: item.$id, name: item.category_name },
      });
    }}
  >
    <View style={[styles.categoryIconContainer, { backgroundColor: getContrastColor(item.color) + '15' }]}>
      <Ionicons name={(item.icon_name as any) || 'briefcase-outline'} size={24} color={getContrastColor(item.color)} />
    </View>
    <Text style={[styles.categoryTitle, { color: getContrastColor(item.color) }]} numberOfLines={2}>
      {item.category_name || 'Danh mục'}
    </Text>
    <Text style={[styles.categorySub, { color: getContrastColor(item.color) }]}>
      {jobCount || 0} việc làm
    </Text>
  </TouchableOpacity>
));

CategoryCard.displayName = 'CategoryCard';

export const EmptyState = memo(({ message, icon }: { message: string; icon?: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name={(icon as any) || 'folder-open-outline'} size={48} color="#cbd5e1" />
    </View>
    <Text style={styles.emptyText}>{message}</Text>
  </View>
));

EmptyState.displayName = 'EmptyState';

export const JobAlertCTA = memo(() => (
  <TouchableOpacity
    style={styles.ctaContainer}
    activeOpacity={0.9}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/(shared)/Notifications');
    }}
  >
    <LinearGradient
      colors={['#4A80F0', '#357AE8']}
      style={styles.ctaGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.ctaIconContainer}>
        <Ionicons name="notifications" size={28} color="#fff" />
      </View>
      <View style={styles.ctaTextContainer}>
        <Text style={styles.ctaTitle}>Nhận thông báo việc làm mới</Text>
        <Text style={styles.ctaSubtitle}>Cập nhật công việc phù hợp mỗi ngày</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#fff" />
    </LinearGradient>
  </TouchableOpacity>
));

JobAlertCTA.displayName = 'JobAlertCTA';

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4A80F0',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: '#0f172a' },
  showAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  showAllBtn: { fontSize: 14, color: '#4A80F0', fontWeight: '600' },
  filterContainer: { paddingBottom: 4, gap: 10, paddingRight: 20 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: '#4A80F0',
    borderColor: '#4A80F0',
    shadowColor: '#4A80F0',
    shadowOpacity: 0.3,
  },
  filterText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  companyCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    marginRight: CARD_GAP,
  },
  companyImage: {
    height: 60,
    width: 60,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  companyTextContainer: { gap: 4 },
  companyTitle: { fontSize: 15, fontWeight: '700' },
  companySub: { fontSize: 12, opacity: 0.8 },
  jobCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  jobImage: {
    height: 72,
    width: 72,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  jobTextContainer: {
    marginLeft: 14,
    flex: 1,
    justifyContent: 'space-between',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 22,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  jobCompany: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  jobInfo: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  categoryCard: {
    width: 140,
    height: 140,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    marginRight: CARD_GAP,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
  },
  categorySub: {
    fontSize: 11,
    opacity: 0.75,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  ctaContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  ctaGradient: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4A80F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
  },
});