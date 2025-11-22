/**
 * Danh sách vị trí công việc phổ biến để gợi ý
 * Sử dụng cho autocomplete trong trang tìm kiếm
 */
export const POPULAR_JOB_POSITIONS = [
  // IT & Technology
  'IT Support',
  'It Helpdesk',
  'Nhân Viên IT',
  'It Phần Cứng',
  'It (Kỹ Thuật Điện)',
  'Nhân Viên Kỹ Thuật / IT Helpdesk',
  'IT Sửa Chữa Bảo Trình',
  'Thực Tập Sinh IT',
  'Lập Trình Viên',
  'Kỹ Sư Phần Mềm',
  'Fullstack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Mobile Developer',
  'DevOps Engineer',
  'Data Analyst',
  'Data Engineer',
  'UI/UX Designer',
  'Tester / QA',
  
  // Marketing & Sales
  'Nhân Viên Marketing',
  'Marketing Online',
  'Digital Marketing',
  'Content Marketing',
  'SEO Specialist',
  'Social Media Marketing',
  'Nhân Viên Kinh Doanh',
  'Nhân Viên Bán Hàng',
  'Telesales',
  'Sale Executive',
  'Business Development',
  
  // Accounting & Finance
  'Kế Toán',
  'Kế Toán Tổng Hợp',
  'Kế Toán Trưởng',
  'Nhân Viên Kế Toán',
  'Kế Toán Nội Bộ',
  'Chuyên Viên Triển Khai ERP',
  'Kiểm Toán Viên',
  'Nhân Viên Tài Chính',
  
  // Administration & HR
  'Nhân Viên Hành Chính',
  'Thư Ký',
  'Trợ Lý Giám Đốc',
  'Nhân Viên Nhân Sự',
  'HR Manager',
  'Recruitment Specialist',
  
  // Customer Service
  'Nhân Viên Chăm Sóc Khách Hàng',
  'Customer Service',
  'Tư Vấn Viên',
  'Nhân Viên Tổng Đài',
  
  // Engineering & Manufacturing
  'Kỹ Sư Cơ Khí',
  'Kỹ Sư Điện',
  'Kỹ Sư Điện Tử',
  'Kỹ Sư Xây Dựng',
  'Kỹ Thuật Viên',
  'Công Nhân Sản Xuất',
  'Quản Đốc Sản Xuất',
  
  // Healthcare
  'Y Tá',
  'Điều Dưỡng',
  'Bác Sĩ',
  'Dược Sĩ',
  'Nhân Viên Y Tế',
  
  // Education
  'Giáo Viên',
  'Giảng Viên',
  'Gia Sư',
  'Trợ Giảng',
  
  // Hospitality & Tourism
  'Nhân Viên Lễ Tân',
  'Receptionist',
  'Nhân Viên Phục Vụ',
  'Waiter / Waitress',
  'Đầu Bếp',
  'Bartender',
  'Housekeeping',
  'Tour Guide',
  
  // Logistics & Warehouse
  'Nhân Viên Kho',
  'Thủ Kho',
  'Điều Phối Giao Hàng',
  'Tài Xế',
  'Shipper',
  'Nhân Viên Giao Nhận',
  
  // Design & Creative
  'Graphic Designer',
  'Thiết Kế Đồ Họa',
  'Video Editor',
  'Photographer',
  'Content Creator',
  
  // Others
  'Nhân Viên Văn Phòng',
  'Nhân Viên Tổng Hợp',
  'Thực Tập Sinh',
  'Part-time',
  'Freelancer',
];

/**
 * Filter và sort job positions dựa trên input của user
 */
export const filterJobPositions = (query: string): string[] => {
  if (!query || query.trim() === '') {
    return POPULAR_JOB_POSITIONS.slice(0, 20); // Top 20 mặc định
  }

  const searchLower = query.toLowerCase().trim();
  
  // Tìm exact match trước
  const exactMatches = POPULAR_JOB_POSITIONS.filter(pos => 
    pos.toLowerCase() === searchLower
  );
  
  // Tìm starts with
  const startsWithMatches = POPULAR_JOB_POSITIONS.filter(pos => 
    pos.toLowerCase().startsWith(searchLower) && 
    !exactMatches.includes(pos)
  );
  
  // Tìm contains
  const containsMatches = POPULAR_JOB_POSITIONS.filter(pos => 
    pos.toLowerCase().includes(searchLower) && 
    !exactMatches.includes(pos) && 
    !startsWithMatches.includes(pos)
  );
  
  return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 10);
};
