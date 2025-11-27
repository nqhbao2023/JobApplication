import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { calculateMetricsWithComparison } from '@/utils/analytics';

/**
 * Custom Hook: useAnalyticsMetrics
 * Lấy metrics với growth comparison cho admin dashboard
 * 
 * @param collectionName - Tên collection trong Firestore
 * @param comparisonDays - Số ngày để so sánh (default: 7)
 * @returns { total, current, previous, growth, trend, loading }
 * 
 * Cách sử dụng:
 * const userMetrics = useAnalyticsMetrics('users', 7);
 * const jobMetrics = useAnalyticsMetrics('jobs', 30);
 */

export interface AnalyticsMetrics {
  total: number; // Tổng số toàn bộ
  current: number; // Số lượng trong period hiện tại
  previous: number; // Số lượng trong period trước
  growth: number; // % tăng/giảm
  trend: 'up' | 'down' | 'stable'; // Xu hướng
}

export const useAnalyticsMetrics = (
  collectionName: string,
  comparisonDays: number = 7
) => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    total: 0,
    current: 0,
    previous: 0,
    growth: 0,
    trend: 'stable',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [collectionName, comparisonDays]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Lấy toàn bộ documents từ collection
      const snapshot = await getDocs(collection(db, collectionName));
      const allData = snapshot.docs.map((doc) => ({
        $id: doc.id,
        ...doc.data(),
      }));

      // Tính metrics với comparison
      const calculatedMetrics = calculateMetricsWithComparison(
        allData,
        comparisonDays,
        'created_at'
      );

      setMetrics(calculatedMetrics);
    } catch (err) {
      console.error(`Error loading ${collectionName} metrics:`, err);
      setError(`Failed to load ${collectionName} data`);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, error, reload: loadMetrics };
};

/**
 * Custom Hook: useMultipleMetrics
 * Lấy metrics cho nhiều collections cùng lúc
 * 
 * @param collections - Array tên collections
 * @param comparisonDays - Số ngày để so sánh
 * @returns Map của metrics { [collectionName]: metrics }
 * 
 * Cách sử dụng:
 * const allMetrics = useMultipleMetrics(['users', 'jobs', 'companies']);
 */
export const useMultipleMetrics = (
  collections: string[],
  comparisonDays: number = 7
) => {
  const [metricsMap, setMetricsMap] = useState<Record<string, AnalyticsMetrics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllMetrics();
  }, [collections.join(','), comparisonDays]);

  const loadAllMetrics = async () => {
    try {
      setLoading(true);

      // Load tất cả collections song song
      const results = await Promise.all(
        collections.map(async (collectionName) => {
          const snapshot = await getDocs(collection(db, collectionName));
          const allData = snapshot.docs.map((doc) => ({
            $id: doc.id,
            ...doc.data(),
          }));

          const metrics = calculateMetricsWithComparison(
            allData,
            comparisonDays,
            'created_at'
          );

          return { collectionName, metrics };
        })
      );

      // Convert array thành map
      const map: Record<string, AnalyticsMetrics> = {};
      results.forEach(({ collectionName, metrics }) => {
        map[collectionName] = metrics;
      });

      setMetricsMap(map);
    } catch (err) {
      console.error('Error loading multiple metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  return { metricsMap, loading, reload: loadAllMetrics };
};

/**
 * Custom Hook: usePendingCounts
 * Đếm số items pending (cần xử lý)
 * 
 * @returns { pendingJobs, pendingQuickPosts, loading }
 * 
 * Dùng để hiển thị badge đếm trong Quick Actions
 */
export const usePendingCounts = () => {
  const [counts, setCounts] = useState({
    pendingJobs: 0,
    pendingQuickPosts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingCounts();
  }, []);

  const loadPendingCounts = async () => {
    try {
      setLoading(true);

      // Đếm jobs pending
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'pending')
      );
      const jobsSnapshot = await getDocs(jobsQuery);

      // Đếm quick posts pending (trong collection 'jobs' với jobSource='quick-post')
      const quickPostsQuery = query(
        collection(db, 'jobs'),
        where('jobSource', '==', 'quick-post'),
        where('status', '==', 'inactive') // Quick posts use 'inactive' status when pending
      );
      const quickPostsSnapshot = await getDocs(quickPostsQuery);

      setCounts({
        pendingJobs: jobsSnapshot.size,
        pendingQuickPosts: quickPostsSnapshot.size,
      });
    } catch (err) {
      console.error('Error loading pending counts:', err);
    } finally {
      setLoading(false);
    }
  };

  return { counts, loading, reload: loadPendingCounts };
};
