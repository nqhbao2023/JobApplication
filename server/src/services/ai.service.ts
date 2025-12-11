// server/src/services/ai.service.ts
import axios from 'axios';
import { Job, User } from '../types';

export class AIService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.apiUrl = process.env.AI_API_URL || '';
  }

  // 1. GỢI Ý JOBS (Rule-based)
  async recommendJobs(
    user: User, 
    allJobs: Job[], 
    limit: number = 10
  ): Promise<Array<{ job: Job; score: number; reason: string; matchedSkills: string[] }>> {
    // Extract user skills từ profile (giả sử có field skills)
    const userSkills = this.extractUserSkills(user);
    
    if (userSkills.length === 0) {
      return [];
    }

    const recommendations = allJobs
      .map((job) => {
        // Sửa: dùng job.skills (kiểu mảng string)
        const jobSkills = Array.isArray(job.skills)
          ? job.skills
          : this.extractSkillsFromText(job.skills || '');
        const matchedSkills = this.calculateMatchedSkills(userSkills, jobSkills);
        const score = this.calculateMatchScore(matchedSkills, jobSkills);

        return {
          job,
          score,
          reason: this.generateReason(matchedSkills),
          matchedSkills,
        };
      })
      .filter((rec) => rec.score > 30) // Chỉ lấy match >30%
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }

  // 2. HỎI AI (Google Gemini) - Dùng cho chatbot hoặc hỏi đáp chung
  async askAI(prompt: string, isChat: boolean = true): Promise<string> {
    try {
      if (!this.apiKey || !this.apiUrl) {
        console.warn('AI API not configured');
        return 'AI chưa được cấu hình. Vui lòng kiểm tra lại API key.';
      }

      // System instruction cho chatbot - giúp AI trả lời ngắn gọn, thân thiện
      const systemInstruction = isChat ? `Bạn là "Job4S Assistant" - Trợ lý sự nghiệp thông minh dành riêng cho sinh viên Việt Nam.

NHIỆM VỤ CỦA BẠN:
Hỗ trợ người dùng tìm việc làm, viết CV, chuẩn bị phỏng vấn và định hướng nghề nghiệp với tư cách là một chuyên gia tuyển dụng hàng đầu nhưng có phong cách trẻ trung, gần gũi.

QUY TẮC TRẢ LỜI (TUÂN THỦ TUYỆT ĐỐI):
1. KHÔNG sử dụng Markdown (không dùng **, ##, *, _). Chỉ dùng văn bản thuần.
2. Trả lời SÚC TÍCH, đi thẳng vào vấn đề. Với câu hỏi đơn giản, trả lời trong 2-3 câu.
3. Sử dụng emoji 😊 để tạo cảm giác thân thiện, tích cực.
4. Dùng gạch đầu dòng bằng ký tự "•" hoặc số "1." "2." để liệt kê ý.
5. Tập trung vào bối cảnh thị trường lao động Việt Nam (thực tập, part-time, fresher).
6. Luôn đưa ra lời khuyên CỤ THỂ và HÀNH ĐỘNG ĐƯỢC (Actionable advice).
7. Nếu câu hỏi quá ngắn hoặc thiếu thông tin, hãy hỏi ngược lại để tư vấn chính xác hơn.

VÍ DỤ TRẢ LỜI:
• "Mức lương thực tập IT tại VN thường từ 2-5 triệu/tháng, tùy công ty. Các tập đoàn lớn có thể trả cao hơn hoặc theo năng lực 😊"
• "Để CV ấn tượng: 1. Tập trung vào dự án thực tế. 2. Dùng số liệu để chứng minh kết quả. 3. Trình bày gọn gàng trong 1 trang."

Câu hỏi của user: ` : '';

      const fullPrompt = systemInstruction + prompt;

      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: isChat ? 4000 : 8000, // Tăng token vì model 2.5 pro cần suy nghĩ (CoT)
            topP: 0.9,
            topK: 40,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      let result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi từ AI.';
      
      // Clean up markdown formatting từ response nếu AI vẫn dùng
      if (isChat) {
        result = this.cleanMarkdown(result);
      }
      
      return result;
    } catch (error: any) {
      console.error('AI request failed:', error.message);
      return 'Xin lỗi, mình gặp lỗi kết nối. Bạn thử lại sau nhé! 🙏';
    }
  }

  // Helper: Clean markdown từ response
  private cleanMarkdown(text: string): string {
    return text
      // Remove bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Replace bullet points with numbers or clean format
      .replace(/^[\*\-]\s+/gm, '• ')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // 3. ENHANCE JOB DESCRIPTION (Google Gemini)
  async enhanceJobDescription(description: string): Promise<string> {
    const prompt = `Bạn là chuyên gia viết mô tả công việc. Hãy cải thiện mô tả sau để rõ ràng, hấp dẫn hơn (giữ tiếng Việt):\n\n${description}`;
    return this.askAI(prompt, false); // isChat = false để giữ format
  }

  // 3.5. AUTO-CATEGORIZE JOB (Google Gemini)
  async autoCategorizeJob(title: string, description: string): Promise<string> {
    const categories = [
      'IT-Software', 'Marketing', 'Sales', 'Design', 'Finance',
      'HR', 'Healthcare', 'Education', 'F&B', 'Retail',
      'Logistics', 'Construction', 'Manufacturing', 'Other'
    ];

    const prompt = `
Phân loại công việc sau vào 1 trong các category: ${categories.join(', ')}

Tiêu đề: ${title}
Mô tả: ${description.substring(0, 500)}

Chỉ trả về TÊN CATEGORY duy nhất, không giải thích. Ví dụ: "IT-Software" hoặc "Marketing"
    `.trim();

    try {
      const result = await this.askAI(prompt, false); // isChat = false
      const category = result.trim().replace(/["']/g, '');
      
      // Validate result is in our categories list
      const matchedCategory = categories.find(c => 
        c.toLowerCase() === category.toLowerCase()
      );
      
      return matchedCategory || 'Other';
    } catch (error) {
      console.error('AI categorization failed:', error);
      return 'Other';
    }
  }

  // 4. EXTRACT SKILLS từ text
  extractSkillsFromText(textOrArray: string | string[]): string[] {
    const commonSkills = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase', 'Appwrite',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Git', 'CI/CD', 'Agile', 'Scrum', 'REST API', 'GraphQL',
      'HTML', 'CSS', 'Sass', 'Tailwind', 'Bootstrap',
      'React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS',
      'Photoshop', 'Illustrator', 'Figma', 'UI/UX', 'SEO', 'Marketing',
    ];

    if (Array.isArray(textOrArray)) {
      // Nếu là mảng, lọc các kỹ năng có trong commonSkills
      return textOrArray.filter(skill =>
        commonSkills.includes(skill)
      );
    }

    const textLower = textOrArray.toLowerCase();
    const found = commonSkills.filter((skill) =>
      textLower.includes(skill.toLowerCase())
    );

    return [...new Set(found)];
  }

  // 5. EXTRACT USER SKILLS (từ user profile thực tế)
  private extractUserSkills(user: User): string[] {
    // ✅ Lấy skills thực tế từ user profile
    if (user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      console.log(`📋 [AI] Extracted ${user.skills.length} skills from user profile`);
      return user.skills;
    }
    
    // Fallback: Không có skills
    console.log(`⚠️ [AI] User has no skills in profile`);
    return [];
  }

  // HELPER: Match skills
  private calculateMatchedSkills(userSkills: string[], jobSkills: string[]): string[] {
    const userSkillsLower = userSkills.map((s) => s.toLowerCase());
    return jobSkills.filter((skill) =>
      userSkillsLower.includes(skill.toLowerCase())
    );
  }

  // HELPER: Calculate score (đơn giản: chỉ dựa vào skills)
  private calculateMatchScore(matchedSkills: string[], jobSkills: string[]): number {
    if (jobSkills.length === 0) return 0;
    return Math.round((matchedSkills.length / jobSkills.length) * 100);
  }

  // HELPER: Generate reason
  private generateReason(matchedSkills: string[]): string {
    if (matchedSkills.length === 0) {
      return '✗ Chưa có kỹ năng phù hợp';
    }

    return `✓ Có ${matchedSkills.length} kỹ năng phù hợp: ${matchedSkills.slice(0, 3).join(', ')}`;
  }

  // 5. ANALYZE CV STRENGTH (Google Gemini) - OPTIMIZED FOR STUDENTS
  async analyzeCVStrength(cvData: {
    education?: string;
    experience?: string;
    skills?: string[];
    projects?: string;
    summary?: string;
    hasPersonalInfo?: boolean;
  }): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  }> {
    // Tính điểm cơ bản trước để làm tham chiếu cho AI
    const baseScore = this.calculateBaseScore(cvData);
    
    const prompt = `
Bạn là chuyên gia đánh giá CV cho SINH VIÊN và người mới ra trường tại Việt Nam.

⚠️ QUY TẮC QUAN TRỌNG:
1. Đây là CV của SINH VIÊN - họ có thể chưa có nhiều kinh nghiệm làm việc chính thức
2. Đánh giá CÔNG BẰNG dựa trên những gì họ CÓ, không trừ điểm quá nặng vì thiếu kinh nghiệm
3. DỰ ÁN cá nhân và HOẠT ĐỘNG ngoại khóa cũng có giá trị như kinh nghiệm làm việc với sinh viên
4. Điểm tối thiểu là 30/100 nếu CV có đầy đủ thông tin cơ bản

📊 THANG ĐIỂM THAM KHẢO CHO SINH VIÊN:
- 80-100: CV xuất sắc (có GPA cao, nhiều dự án, kỹ năng đa dạng, kinh nghiệm thực tập)
- 60-79: CV tốt (có học vấn rõ ràng, vài kỹ năng và dự án)
- 40-59: CV khá (có thông tin cơ bản, cần bổ sung thêm chi tiết)
- 30-39: CV cơ bản (thiếu nhiều thông tin quan trọng)
- Dưới 30: Chỉ khi CV gần như trống hoàn toàn

📋 CV CẦN ĐÁNH GIÁ:

Học vấn: ${cvData.education || 'Chưa có thông tin'}
Kinh nghiệm: ${cvData.experience || 'Chưa có kinh nghiệm (bình thường với sinh viên)'}
Kỹ năng: ${cvData.skills?.length ? cvData.skills.join(', ') : 'Chưa liệt kê kỹ năng'}
Dự án: ${cvData.projects || 'Chưa có dự án'}
Mục tiêu nghề nghiệp: ${cvData.summary || 'Chưa có'}
Thông tin cá nhân đầy đủ: ${cvData.hasPersonalInfo ? 'Có' : 'Thiếu'}

📊 Điểm tham chiếu dựa trên độ đầy đủ: ${baseScore}/100

Hãy trả về JSON với format CHÍNH XÁC sau (không thêm markdown, không giải thích, chỉ JSON thuần):
{
  "score": <số từ ${Math.max(30, baseScore - 10)} đến ${Math.min(100, baseScore + 15)}>,
  "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
  "improvements": ["cần cải thiện 1", "cần cải thiện 2"],
  "suggestions": ["gợi ý cụ thể 1", "gợi ý cụ thể 2"]
}
    `.trim();

    try {
      const result = await this.askAI(prompt);
      
      // Try to parse JSON from response
      let jsonText = result.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }
      
      // Try to extract JSON if there's extra text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Ensure score is within reasonable bounds for students
      const finalScore = Math.min(100, Math.max(30, parsed.score || baseScore));
      
      return {
        score: finalScore,
        strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 
          ? parsed.strengths 
          : this.getDefaultStrengths(cvData),
        improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0 
          ? parsed.improvements 
          : this.getDefaultImprovements(cvData),
        suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0 
          ? parsed.suggestions 
          : this.getDefaultSuggestions(cvData),
      };
    } catch (error) {
      console.error('CV analysis failed, using rule-based scoring:', error);
      
      // Enhanced fallback: rule-based scoring optimized for students
      return this.fallbackCVAnalysis(cvData);
    }
  }

  // Helper: Calculate base score for CV
  private calculateBaseScore(cvData: {
    education?: string;
    experience?: string;
    skills?: string[];
    projects?: string;
    summary?: string;
    hasPersonalInfo?: boolean;
  }): number {
    let score = 35; // Base score for any CV attempt
    
    // Personal Info (10 points)
    if (cvData.hasPersonalInfo) score += 10;
    
    // Education (25 points) - Most important for students
    if (cvData.education && cvData.education.length > 10) {
      score += 15;
      if (cvData.education.toLowerCase().includes('gpa') || 
          cvData.education.toLowerCase().includes('thành tích')) {
        score += 10;
      }
    }
    
    // Skills (20 points)
    if (cvData.skills && cvData.skills.length > 0) {
      score += Math.min(20, cvData.skills.length * 4);
    }
    
    // Projects (20 points) - Very important for students without experience
    if (cvData.projects && cvData.projects.length > 10) {
      score += 15;
      if (cvData.projects.toLowerCase().includes('công nghệ') || 
          cvData.projects.toLowerCase().includes('link')) {
        score += 5;
      }
    }
    
    // Experience (10 points) - Optional for students
    if (cvData.experience && cvData.experience.length > 10) {
      score += 10;
    }
    
    // Summary/Objective (5 points)
    if (cvData.summary && cvData.summary.length > 20) {
      score += 5;
    }
    
    return Math.min(100, score);
  }

  // Helper: Get default strengths based on CV data
  private getDefaultStrengths(cvData: any): string[] {
    const strengths: string[] = [];
    
    if (cvData.education) strengths.push('Có thông tin học vấn rõ ràng');
    if (cvData.skills?.length > 3) strengths.push(`Có ${cvData.skills.length} kỹ năng được liệt kê`);
    if (cvData.projects) strengths.push('Có dự án cá nhân/học tập');
    if (cvData.experience) strengths.push('Có kinh nghiệm làm việc');
    if (cvData.hasPersonalInfo) strengths.push('Thông tin liên hệ đầy đủ');
    
    if (strengths.length === 0) {
      strengths.push('Đã bắt đầu xây dựng CV');
    }
    
    return strengths;
  }

  // Helper: Get default improvements based on CV data
  private getDefaultImprovements(cvData: any): string[] {
    const improvements: string[] = [];
    
    if (!cvData.education || cvData.education.length < 20) {
      improvements.push('Cần bổ sung chi tiết về học vấn (trường, ngành, GPA)');
    }
    if (!cvData.skills || cvData.skills.length < 3) {
      improvements.push('Nên thêm nhiều kỹ năng hơn (tối thiểu 5-8 kỹ năng)');
    }
    if (!cvData.projects || cvData.projects.length < 20) {
      improvements.push('Cần thêm mô tả chi tiết về các dự án đã làm');
    }
    if (!cvData.summary) {
      improvements.push('Thiếu phần mục tiêu nghề nghiệp');
    }
    
    return improvements.slice(0, 3);
  }

  // Helper: Get default suggestions based on CV data
  private getDefaultSuggestions(cvData: any): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Thêm số liệu cụ thể vào các thành tích (VD: "Tăng 20% hiệu suất")');
    
    if (!cvData.skills || cvData.skills.length < 5) {
      suggestions.push('Bổ sung cả kỹ năng cứng (technical) và kỹ năng mềm (soft skills)');
    }
    
    if (!cvData.projects) {
      suggestions.push('Thêm các dự án học tập, dự án cá nhân hoặc hoạt động ngoại khóa');
    }
    
    suggestions.push('Sử dụng các từ khóa liên quan đến ngành nghề bạn muốn ứng tuyển');
    
    return suggestions.slice(0, 3);
  }

  // Enhanced fallback CV analysis for students
  private fallbackCVAnalysis(cvData: any): {
    score: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  } {
    const score = this.calculateBaseScore(cvData);
    const strengths = this.getDefaultStrengths(cvData);
    const improvements = this.getDefaultImprovements(cvData);
    const suggestions = this.getDefaultSuggestions(cvData);
    
    return { score, strengths, improvements, suggestions };
  }

  // 6. PREDICT JOB SALARY (Rule-based + Market data)
  async predictJobSalary(jobData: {
    title: string;
    category: string;
    location: string;
    type: 'part-time' | 'full-time' | 'internship' | 'freelance';
  }): Promise<{
    min: number;
    max: number;
    avg: number;
    unit: string;
    confidence: string;
  } | null> {
    // Import salary database
    const SALARY_DATA = this.getSalaryDatabase();
    
    // Normalize category to lowercase for lookup
    const normalizedCategory = jobData.category.toLowerCase().trim();
    const categoryData = SALARY_DATA[normalizedCategory];
    
    if (!categoryData) {
      console.warn('[AI] Unknown category:', jobData.category, '-> Falling back to sales');
      // Fallback to sales if category not found (common middle-range)
      const fallbackData = SALARY_DATA['sales'];
      if (!fallbackData || !fallbackData[jobData.type]) {
        return null;
      }
      const typeData = fallbackData[jobData.type];
      return {
        min: typeData.min,
        max: typeData.max,
        avg: typeData.avg,
        unit: typeData.unit,
        confidence: 'medium', // Low confidence because we used fallback
      };
    }
    
    const typeData = categoryData[jobData.type];
    if (!typeData) {
      console.warn('[AI] Unknown job type:', jobData.type, 'for category:', normalizedCategory);
      return null;
    }
    
    // Adjust by location - these are multipliers for salary based on city
    let multiplier = 1.0;
    let locationConfidence = 'high';
    const locationLower = jobData.location.toLowerCase();
    
    if (locationLower.includes('ho chi minh') || locationLower.includes('hcm') || 
        locationLower.includes('sai gon') || locationLower.includes('tp.hcm') ||
        locationLower.includes('thanh pho ho chi minh')) {
      multiplier = 1.2;
      locationConfidence = 'high';
    } else if (locationLower.includes('ha noi') || locationLower.includes('hanoi')) {
      multiplier = 1.15;
      locationConfidence = 'high';
    } else if (locationLower.includes('da nang')) {
      multiplier = 1.1;
      locationConfidence = 'high';
    } else if (locationLower.includes('binh duong') || locationLower.includes('thu dau mot') ||
               locationLower.includes('dong nai') || locationLower.includes('can tho')) {
      multiplier = 1.05;
      locationConfidence = 'medium';
    } else {
      // Other provinces - use base salary with medium confidence
      multiplier = 1.0;
      locationConfidence = 'medium';
    }
    
    return {
      min: Math.round(typeData.min * multiplier),
      max: Math.round(typeData.max * multiplier),
      avg: Math.round(typeData.avg * multiplier),
      unit: typeData.unit,
      confidence: locationConfidence,
    };
  }
  
  private getSalaryDatabase(): Record<string, any> {
    return {
      'f&b': {
        'part-time': { min: 18000, max: 30000, avg: 23000, unit: 'VNĐ/giờ' },
        'full-time': { min: 4000000, max: 7000000, avg: 5500000, unit: 'VNĐ/tháng' },
        'internship': { min: 15000, max: 25000, avg: 20000, unit: 'VNĐ/giờ' },
      },
      'it-software': {
        'part-time': { min: 40000, max: 100000, avg: 60000, unit: 'VNĐ/giờ' },
        'full-time': { min: 10000000, max: 30000000, avg: 18000000, unit: 'VNĐ/tháng' },
        'internship': { min: 30000, max: 80000, avg: 50000, unit: 'VNĐ/giờ' },
      },
      'marketing': {
        'part-time': { min: 25000, max: 50000, avg: 35000, unit: 'VNĐ/giờ' },
        'full-time': { min: 7000000, max: 15000000, avg: 10000000, unit: 'VNĐ/tháng' },
        'internship': { min: 20000, max: 40000, avg: 30000, unit: 'VNĐ/giờ' },
      },
      'sales': {
        'part-time': { min: 20000, max: 40000, avg: 28000, unit: 'VNĐ/giờ' },
        'full-time': { min: 6000000, max: 20000000, avg: 12000000, unit: 'VNĐ/tháng' },
        'internship': { min: 18000, max: 35000, avg: 25000, unit: 'VNĐ/giờ' },
      },
      'retail': {
        'part-time': { min: 18000, max: 28000, avg: 22000, unit: 'VNĐ/giờ' },
        'full-time': { min: 4500000, max: 8000000, avg: 6000000, unit: 'VNĐ/tháng' },
        'internship': { min: 15000, max: 25000, avg: 20000, unit: 'VNĐ/giờ' },
      },
      'design': {
        'part-time': { min: 30000, max: 70000, avg: 45000, unit: 'VNĐ/giờ' },
        'full-time': { min: 8000000, max: 20000000, avg: 12000000, unit: 'VNĐ/tháng' },
        'internship': { min: 25000, max: 60000, avg: 40000, unit: 'VNĐ/giờ' },
      },
      'education': {
        'part-time': { min: 50000, max: 150000, avg: 80000, unit: 'VNĐ/giờ' },
        'full-time': { min: 8000000, max: 20000000, avg: 12000000, unit: 'VNĐ/tháng' },
        'internship': { min: 40000, max: 100000, avg: 60000, unit: 'VNĐ/giờ' },
      },
      'logistics': {
        'part-time': { min: 20000, max: 35000, avg: 25000, unit: 'VNĐ/giờ' },
        'full-time': { min: 5000000, max: 12000000, avg: 8000000, unit: 'VNĐ/tháng' },
        'internship': { min: 18000, max: 30000, avg: 22000, unit: 'VNĐ/giờ' },
      },
    };
  }
}

export default new AIService();