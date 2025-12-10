/**
 * Category Matching Utilities
 * 
 * Centralized logic for matching jobs with categories
 * Handles both internal jobs (with category IDs) and crawled jobs (with slug strings)
 */

// ✅ Category mappings for slug matching (viecoi crawled jobs use slugs like 'it-software', 'finance')
export const CATEGORY_MAPPINGS: Record<string, string[]> = {
  'công nghệ thông tin': ['it-software', 'it', 'software', 'tech', 'cntt', 'công nghệ', 'technology'],
  'kế toán / kiểm toán': ['finance', 'accounting', 'ke-toan', 'kiem-toan', 'kế toán', 'tai-chinh'],
  'marketing / truyền thông': ['marketing', 'pr', 'truyen-thong', 'digital-marketing', 'content'],
  'bán hàng / kinh doanh': ['sales', 'business', 'kinh-doanh', 'ban-hang', 'kinh doanh'],
  'nhân sự': ['hr', 'human-resource', 'nhan-su', 'tuyen-dung', 'nhân sự', 'admin'],
  'thiết kế đồ họa': ['design', 'graphic', 'thiet-ke', 'ui-ux', 'uiux', 'thiết kế'],
  'ẩm thực / f&b': ['f&b', 'fb', 'food', 'restaurant', 'am-thuc', 'nha-hang', 'f-b'],
  'du lịch / khách sạn': ['hospitality', 'hotel', 'tourism', 'du-lich', 'khach-san', 'du lịch'],
  'xây dựng / kiến trúc': ['construction', 'xay-dung', 'kien-truc', 'building', 'xây dựng'],
  'giáo dục / đào tạo': ['education', 'giao-duc', 'dao-tao', 'teacher', 'giang-vien', 'giáo dục'],
  'bảo hiểm': ['insurance', 'bao-hiem'],
  'logistics / vận tải': ['logistics', 'shipping', 'van-tai', 'giao-hang', 'vận tải'],
  'y tế / dược': ['healthcare', 'medical', 'y-te', 'duoc', 'pharmacy', 'y tế'],
  'hành chính / văn phòng': ['admin', 'office', 'hanh-chinh', 'van-phong', 'hành chính'],
  'dịch vụ khách hàng': ['customer-service', 'cskh', 'support', 'call-center'],
  'sản xuất': ['manufacturing', 'san-xuat', 'production', 'factory', 'sản xuất'],
  'bất động sản': ['real-estate', 'bat-dong-san', 'realestate', 'bất động sản'],
  'bán lẻ': ['retail', 'ban-le', 'cửa hàng', 'shop'],
  'khác': ['other', 'khac', 'general'],
};

// ✅ Reverse mapping: slug -> category name (for quick lookup)
export const SLUG_TO_CATEGORY_NAME: Record<string, string> = {};
Object.entries(CATEGORY_MAPPINGS).forEach(([categoryName, slugs]) => {
  slugs.forEach(slug => {
    SLUG_TO_CATEGORY_NAME[slug.toLowerCase()] = categoryName;
  });
});

/**
 * Check if a job matches a category
 * @param job - The job object to check
 * @param categoryId - The category ID from job_categories collection
 * @param categoryName - The category name from job_categories collection
 * @returns true if job matches the category
 */
export const jobMatchesCategory = (
  job: any,
  categoryId: string,
  categoryName?: string
): boolean => {
  const jc = job.jobCategories;
  if (!jc) return false;
  
  const catNameLower = (categoryName || '').toLowerCase();
  const catIdLower = categoryId.toLowerCase();
  
  // Method 1: Direct ID match
  if (typeof jc === 'string') {
    const jcLower = jc.toLowerCase();
    
    // Exact match with category ID
    if (jcLower === catIdLower) return true;
    
    // Exact match with category name
    if (catNameLower && jcLower === catNameLower) return true;
    
    // ✅ Slug matching for crawled jobs (e.g., 'it-software', 'finance')
    if (catNameLower) {
      const patterns = CATEGORY_MAPPINGS[catNameLower] || [];
      if (patterns.some(pattern => jcLower === pattern || jcLower.includes(pattern) || pattern.includes(jcLower))) {
        return true;
      }
    }
    
    // Also try matching the slug directly with all categories
    const matchedCategoryName = SLUG_TO_CATEGORY_NAME[jcLower];
    if (matchedCategoryName && matchedCategoryName.toLowerCase() === catNameLower) {
      return true;
    }
    
    return false;
  }
  
  // Method 2: Array of strings
  if (Array.isArray(jc) && typeof jc[0] === 'string') {
    return (jc as string[]).some(x => {
      const xLower = x.toLowerCase();
      if (xLower === catIdLower || xLower === catNameLower) return true;
      
      // Slug matching
      if (catNameLower) {
        const patterns = CATEGORY_MAPPINGS[catNameLower] || [];
        if (patterns.some(pattern => xLower === pattern || xLower.includes(pattern))) {
          return true;
        }
      }
      return false;
    });
  }
  
  // Method 3: Array of objects
  if (Array.isArray(jc)) {
    return jc.some((x: any) => x?.$id === categoryId);
  }
  
  // Method 4: Single object
  if (typeof jc === 'object' && jc.$id) {
    return jc.$id === categoryId;
  }
  
  return false;
};

/**
 * Get all slugs that match a category name
 * @param categoryName - The category name to get slugs for
 * @returns Array of matching slugs
 */
export const getCategorySlugs = (categoryName?: string): string[] => {
  if (!categoryName) return [];
  const lowerName = categoryName.toLowerCase();
  return CATEGORY_MAPPINGS[lowerName] || [];
};

/**
 * Get category name from a slug
 * @param slug - The slug to look up
 * @returns The matching category name or undefined
 */
export const getCategoryNameFromSlug = (slug: string): string | undefined => {
  return SLUG_TO_CATEGORY_NAME[slug.toLowerCase()];
};
