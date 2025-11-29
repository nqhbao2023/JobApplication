/**
 * Utility functions để parse và format nội dung job từ các nguồn khác nhau
 * Version 2.0 - Improved parsing với AI-like intelligence
 */

export interface ParsedJobSections {
  overview: string;          // Tổng quan về công việc
  responsibilities: string;  // Nhiệm vụ/Chi tiết công việc
  requirements: string;      // Yêu cầu ứng viên
  benefits: string;          // Quyền lợi/Phúc lợi
  companyInfo: string;       // Thông tin công ty
}

/**
 * Parse nội dung từ description dài của viecoi
 * Sử dụng AI-like pattern matching để tách sections
 */
export const parseViecoiDescription = (rawDescription: string): ParsedJobSections => {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return {
      overview: '',
      responsibilities: '',
      requirements: '',
      benefits: '',
      companyInfo: '',
    };
  }

  // Normalize text
  let text = rawDescription
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  // Define comprehensive section patterns
  const patterns = {
    // Mô tả/Giới thiệu
    overview: /(?:Mô tả công việc|MÔ TẢ|CƠ HỘI NGHỀ NGHIỆP|GIỚI THIỆU|VỊ TRÍ\s*:)/i,
    
    // Chi tiết công việc
    responsibilities: /(?:CHI TIẾT CÔNG VIỆC|NHIỆM VỤ|TRÁCH NHIỆM|CÔNG VIỆC CHI TIẾT)/i,
    
    // Yêu cầu
    requirements: /(?:YÊU CẦU|Yêu cầu ứng viên|Yêu cầu công việc|ĐIỀU KIỆN)/i,
    
    // Quyền lợi
    benefits: /(?:QUYỀN LỢI HẤP DẪN|QUYỀN LỢI ĐƯỢC HƯỞNG|QUYỀN LỢI|Phúc lợi|Chế độ)/i,
    
    // Thông tin công ty (cuối cùng)
    company: /(?:là công ty|Công ty|Hiện tại chúng tôi|Xem thêm)/i,
  };

  // Find all section positions
  const positions: Array<{type: keyof ParsedJobSections, start: number, pattern: string}> = [];
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.search(pattern);
    if (match !== -1) {
      const matchedText = text.match(pattern)?.[0] || '';
      positions.push({ 
        type: key as keyof ParsedJobSections, 
        start: match,
        pattern: matchedText 
      });
    }
  }

  // Sort by position
  positions.sort((a, b) => a.start - b.start);

  // Extract sections
  const sections: ParsedJobSections = {
    overview: '',
    responsibilities: '',
    requirements: '',
    benefits: '',
    companyInfo: '',
  };

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    const next = positions[i + 1];
    
    const sectionStart = current.start;
    const sectionEnd = next ? next.start : text.length;
    
    let content = text.substring(sectionStart, sectionEnd);
    
    // Remove section header
    content = content.replace(current.pattern, '').trim();
    
    // Format content
    content = formatSectionContent(content);
    
    sections[current.type] = content;
  }

  // Fallback: Nếu không parse được sections, lấy toàn bộ text
  if (positions.length === 0) {
    sections.overview = formatSectionContent(text);
  }

  return sections;
};

/**
 * Format section content để dễ đọc
 */
const formatSectionContent = (content: string): string => {
  if (!content) return '';

  return content
    // Add line breaks after sentences
    .replace(/\.\s+([A-ZĐÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ])/g, '.\n\n$1')
    
    // Detect bullet points and add line breaks
    .replace(/\s+([-•])\s+/g, '\n\n$1 ')
    
    // Detect numbered lists
    .replace(/\s+(\d+[\.\)])\s+/g, '\n\n$1 ')
    
    // Detect common job keywords (Từ khóa, Kỹ năng sections)
    .replace(/(Từ khóa|Kỹ năng|Bằng cấp|Kinh nghiệm|Nơi làm việc|Lĩnh vực)/g, '\n\n**$1**')
    
    // Detect list item starters
    .replace(/\s+(Ưu tiên|Yêu thích|Có kinh nghiệm|Thành thạo|Tốt nghiệp|Chế độ|Du lịch|Thưởng)/g, '\n\n• $1')
    
    // Detect skill names (e.g., "Kỹ Năng Bán Hàng")
    .replace(/(Kỹ Năng [A-ZĐÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ][a-zđàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ\s]+)/g, '\n• $1')
    
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    
    // Trim spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
};

/**
 * Check xem job có phải từ viecoi không
 */
export const isViecoiJob = (job: any): boolean => {
  return job?.source === 'viecoi' || job?.external_url?.includes('viecoi.vn');
};

/**
 * Get all sections cho job detail page
 */
export const getJobSections = (job: any): ParsedJobSections => {
  if (!job) {
    return {
      overview: '',
      responsibilities: '',
      requirements: '',
      benefits: '',
      companyInfo: '',
    };
  }

  // Nếu là job từ viecoi, parse description
  if (isViecoiJob(job)) {
    return parseViecoiDescription(job.description || '');
  }

  // Job internal - construct từ các field riêng
  return {
    overview: job.description || '',
    responsibilities: job.responsibilities || '',
    requirements: Array.isArray(job.requirements) 
      ? job.requirements.map((r: string) => `• ${r}`).join('\n')
      : (job.requirements || ''),
    benefits: Array.isArray(job.benefits) 
      ? job.benefits.map((b: string) => `• ${b}`).join('\n')
      : (job.benefits || ''),
    companyInfo: '',
  };
};
