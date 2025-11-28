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
import type { JobMatchScore } from '@/services/jobMatching.service';
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
import { formatSalary } from '@/utils/salary.utils';

// Helper function to adjust color brightness for gradients
const adjustColorBrightness = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

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
    style={styles.companyCard}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/(shared)/companyDescription', params: { companyId: item.$id } });
    }}
    activeOpacity={0.8}
  >
    <View style={styles.companyLogoContainer}>
      <Image
        style={styles.companyImage}
        source={{ uri: item.image || PLACEHOLDER_COMPANY_IMG }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        recyclingKey={item.$id}
      />
    </View>
    <Text style={styles.companyTitle} numberOfLines={1}>
      {item.corp_name || 'Công ty'}
    </Text>
    <Text style={styles.companySub} numberOfLines={1}>
      {item.nation || 'Việt Nam'}
    </Text>
  </TouchableOpacity>
));

CompanyCard.displayName = 'CompanyCard';

export const JobCard = memo(({
  item,
  company,
  matchScore,
  isHighMatch,
}: {
  item: Job;
  company?: Company;
  matchScore?: JobMatchScore;
  isHighMatch?: boolean;
}) => {
  // Determine the best image to display
  // Priority: item.image (employer uploaded) > item.company_logo (viecoi/crawled) > company.image > placeholder
  const getCompanyLogo = () => {
    // Priority 1: Job image (employer-uploaded job image)
    if (item.image && typeof item.image === 'string' && item.image.trim() !== '') {
      return item.image;
    }
    
    // Priority 2: Company logo (for viecoi/crawled jobs)
    if (item.company_logo && typeof item.company_logo === 'string' && item.company_logo.trim() !== '') {
      return item.company_logo;
    }
    
    // Priority 3: Company image from company collection
    if (company?.image && typeof company.image === 'string' && company.image.trim() !== '') {
      return company.image;
    }
    
    // Fallback: Use placeholder with company name
    const companyName = company?.corp_name || item.company_name || 'Company';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&size=200&background=4A80F0&color=fff&bold=true&format=png`;
  };
  
  const imageUrl = getCompanyLogo();
  
  return (
  <TouchableOpacity
    style={styles.jobCard}
    activeOpacity={0.7}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // ✅ Navigate to different screens based on job type
      if (item.jobType === 'candidate_seeking') {
        // Tin tìm việc của candidate → hiển thị profile ứng viên
        router.push({ pathname: '/(shared)/candidateProfile', params: { jobId: item.$id } });
      } else {
        // Tin tuyển dụng của employer → hiển thị job description
        router.push({ pathname: '/jobDescription', params: { jobId: item.$id } });
      }
    }}
  >
    <Image
      style={styles.jobImage}
      source={{ uri: imageUrl }}
      contentFit="contain"
      transition={200}
      cachePolicy="memory-disk"
      recyclingKey={item.$id}
    />
    {/* High Match Badge */}
    {isHighMatch && (
      <View style={styles.highMatchBadge}>
        <Ionicons name="star" size={12} color="#fff" />
        <Text style={styles.highMatchText}>Phù hợp {Math.round((matchScore?.totalScore || 0) * 100)}%</Text>
      </View>
    )}
    {/* Badge for external jobs */}
    {item.source === 'viecoi' && (
      <View style={styles.externalBadge}>
        <Text style={styles.externalBadgeText}>📱 viecoi.vn</Text>
      </View>
    )}
    {item.jobSource === 'quick-post' && (
      <View style={styles.quickPostBadge}>
        <Text style={styles.quickPostBadgeText}>⚡ Quick Post</Text>
      </View>
    )}
    <View style={styles.jobTextContainer}>
      <Text style={styles.jobTitle} numberOfLines={2}>
        {item.title || 'Chưa có tiêu đề'}
      </Text>
      <View style={styles.jobInfoRow}>
        <Ionicons name="business-outline" size={14} color="#64748b" />
        <Text style={styles.jobCompany} numberOfLines={1}>
          {company?.corp_name ?? item.company_name ?? 'Không rõ công ty'}
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
            {formatSalary(item.salary)}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
  );
});

JobCard.displayName = 'JobCard';

// 🎨 Mapping category name to beautiful icons
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // IT / Software
  'it': 'code-slash',
  'công nghệ thông tin': 'code-slash',
  'phần mềm': 'laptop-outline',
  'lập trình': 'terminal-outline',
  'developer': 'code-working-outline',
  'software': 'code-slash',
  // Marketing / Communications
  'marketing': 'megaphone-outline',
  'truyền thông': 'share-social-outline',
  'digital marketing': 'trending-up-outline',
  'pr': 'newspaper-outline',
  'quảng cáo': 'megaphone-outline',
  // Sales / Business
  'sales': 'cart-outline',
  'kinh doanh': 'briefcase-outline',
  'bán hàng': 'storefront-outline',
  'business': 'business-outline',
  // HR / Admin
  'nhân sự': 'people-outline',
  'hr': 'people-circle-outline',
  'hành chính': 'clipboard-outline',
  'tuyển dụng': 'person-add-outline',
  // Finance / Accounting
  'tài chính': 'wallet-outline',
  'kế toán': 'calculator-outline',
  'kiểm toán': 'document-text-outline',
  'ngân hàng': 'card-outline',
  'finance': 'cash-outline',
  // Design / Creative
  'thiết kế': 'color-palette-outline',
  'design': 'brush-outline',
  'sáng tạo': 'sparkles-outline',
  'đồ họa': 'images-outline',
  'creative': 'bulb-outline',
  // Healthcare
  'y tế': 'medkit-outline',
  'dược': 'flask-outline',
  'healthcare': 'fitness-outline',
  'bác sĩ': 'pulse-outline',
  // Engineering
  'kỹ thuật': 'construct-outline',
  'engineering': 'hardware-chip-outline',
  'cơ khí': 'cog-outline',
  'điện': 'flash-outline',
  'xây dựng': 'build-outline',
  // Education
  'giáo dục': 'school-outline',
  'đào tạo': 'book-outline',
  'giảng viên': 'library-outline',
  // Hospitality / Service
  'nhà hàng': 'restaurant-outline',
  'khách sạn': 'bed-outline',
  'du lịch': 'airplane-outline',
  'dịch vụ': 'ribbon-outline',
  // Logistics
  'vận tải': 'car-outline',
  'logistics': 'cube-outline',
  'kho bãi': 'archive-outline',
  'giao hàng': 'bicycle-outline',
  // Others
  'bất động sản': 'home-outline',
  'luật': 'shield-checkmark-outline',
  'báo chí': 'newspaper-outline',
  'media': 'videocam-outline',
};

// Get best matching icon for a category name
const getCategoryIcon = (categoryName?: string, iconName?: string): keyof typeof Ionicons.glyphMap => {
  // If icon_name is already provided and valid, use it
  if (iconName && iconName !== 'briefcase-outline') {
    return iconName as keyof typeof Ionicons.glyphMap;
  }
  
  if (!categoryName) return 'grid-outline';
  
  const name = categoryName.toLowerCase();
  
  // Try exact match first
  if (CATEGORY_ICON_MAP[name]) {
    return CATEGORY_ICON_MAP[name];
  }
  
  // Try partial match
  for (const [key, icon] of Object.entries(CATEGORY_ICON_MAP)) {
    if (name.includes(key) || key.includes(name)) {
      return icon;
    }
  }
  
  return 'grid-outline'; // Default fallback - looks better than briefcase
};

export const CategoryCard = memo(({ item, jobCount }: { item: Category & { jobCount?: number }; jobCount?: number }) => {
  // Generate gradient colors based on category color
  const baseColor = item.color || '#4A80F0';
  const gradientColors: [string, string] = [
    baseColor,
    adjustColorBrightness(baseColor, -30),
  ];
  
  // 🎨 Get appropriate icon for this category
  const categoryIcon = getCategoryIcon(item.category_name, item.icon_name);
  
  return (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: '/(shared)/categoryJobs',
        params: { id: item.$id, name: item.category_name },
      });
    }}
  >
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.categoryCard}
    >
      <View style={styles.categoryIconBg}>
        <Ionicons name={categoryIcon} size={24} color="#fff" />
      </View>
      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle} numberOfLines={2}>
          {item.category_name || 'Danh mục'}
        </Text>
        <View style={styles.categoryJobCountContainer}>
          <Ionicons name="briefcase" size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.categorySub}>
            {jobCount || 0} việc làm
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" style={styles.categoryArrowIcon} />
    </LinearGradient>
  </TouchableOpacity>
  );
});

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
  // ✅ REDESIGNED: Company Card - More compact and clean
  companyCard: {
    width: 130,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginRight: CARD_GAP,
  },
  companyLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  companyImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
  },
  companyTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 2,
  },
  companySub: { 
    fontSize: 11, 
    color: '#64748b',
    textAlign: 'center',
  },
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
    position: 'relative',
  },
  externalBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  externalBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  highMatchBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  highMatchText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  quickPostBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  quickPostBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  // ✅ REDESIGNED: Category Card - Horizontal layout, more compact
  categoryCard: {
    width: 170,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    marginRight: CARD_GAP,
    overflow: 'hidden',
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryContent: {
    flex: 1,
    marginLeft: 12,
  },
  categoryTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#fff',
    lineHeight: 17,
    marginBottom: 4,
  },
  categoryJobCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categorySub: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
    opacity: 0.85,
  },
  categoryArrowIcon: {
    marginLeft: 4,
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