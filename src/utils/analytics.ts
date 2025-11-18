/**
 * Analytics Utilities
 * Các hàm helper để tính toán metrics, growth rate, trends
 * Dễ hiểu, dễ bảo trì cho sinh viên
 */

/**
 * Tính growth rate (tỷ lệ tăng trưởng)
 * @param current - Giá trị hiện tại
 * @param previous - Giá trị trước đó
 * @returns % thay đổi (positive = tăng, negative = giảm)
 * 
 * Ví dụ:
 * calculateGrowthRate(120, 100) => 20 (tăng 20%)
 * calculateGrowthRate(80, 100) => -20 (giảm 20%)
 */
export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  const growth = ((current - previous) / previous) * 100;
  return Math.round(growth * 10) / 10; // Round đến 1 chữ số thập phân
};

/**
 * Xác định trend dựa trên growth rate
 * @param growthRate - % thay đổi
 * @returns 'up' | 'down' | 'stable'
 */
export const getTrend = (growthRate: number): 'up' | 'down' | 'stable' => {
  if (growthRate > 2) return 'up'; // Tăng > 2%
  if (growthRate < -2) return 'down'; // Giảm > 2%
  return 'stable'; // Ổn định (thay đổi < 2%)
};

/**
 * Lấy date range cho so sánh
 * @param days - Số ngày muốn lấy
 * @returns { start: Date, end: Date }
 * 
 * Ví dụ:
 * getDateRange(7) => { start: 7 ngày trước, end: hôm nay }
 */
export const getDateRange = (days: number): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  return { start, end };
};

/**
 * Lấy date range cho comparison (so sánh với period trước)
 * @param days - Số ngày của period hiện tại
 * @returns { current: {...}, previous: {...} }
 * 
 * Ví dụ: So sánh 7 ngày gần nhất với 7 ngày trước đó
 * getComparisonDateRanges(7) => {
 *   current: { start: 7 ngày trước, end: hôm nay },
 *   previous: { start: 14 ngày trước, end: 7 ngày trước }
 * }
 */
export const getComparisonDateRanges = (days: number) => {
  const currentEnd = new Date();
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - days);
  
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);
  
  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
};

/**
 * Đếm số documents được tạo trong khoảng thời gian
 * @param data - Array của documents
 * @param startDate - Ngày bắt đầu
 * @param endDate - Ngày kết thúc
 * @param dateField - Tên field chứa timestamp (default: 'created_at')
 * @returns Số lượng documents
 */
export const countInDateRange = (
  data: any[],
  startDate: Date,
  endDate: Date,
  dateField: string = 'created_at'
): number => {
  return data.filter((item) => {
    const itemDate = item[dateField]?.toDate?.() || new Date(item[dateField]);
    return itemDate >= startDate && itemDate <= endDate;
  }).length;
};

/**
 * Tính metrics cho dashboard với comparison
 * @param allData - Toàn bộ data
 * @param comparisonDays - Số ngày để compare (default: 7)
 * @param dateField - Field chứa date (default: 'created_at')
 * @returns { total, current, previous, growth, trend }
 */
export const calculateMetricsWithComparison = (
  allData: any[],
  comparisonDays: number = 7,
  dateField: string = 'created_at'
) => {
  const { current, previous } = getComparisonDateRanges(comparisonDays);
  
  const currentCount = countInDateRange(allData, current.start, current.end, dateField);
  const previousCount = countInDateRange(allData, previous.start, previous.end, dateField);
  
  const growth = calculateGrowthRate(currentCount, previousCount);
  const trend = getTrend(growth);
  
  return {
    total: allData.length,
    current: currentCount,
    previous: previousCount,
    growth,
    trend,
  };
};

/**
 * Format số lớn thành dạng ngắn gọn
 * @param num - Số cần format
 * @returns String đã format (VD: 1.2K, 3.5M)
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};
