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
  async askAI(prompt: string): Promise<string> {
    try {
      if (!this.apiKey || !this.apiUrl) {
        console.warn('AI API not configured');
        return 'AI chưa được cấu hình. Vui lòng kiểm tra lại API key.';
      }

      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi từ AI.';
    } catch (error: any) {
      console.error('AI request failed:', error.message);
      return 'Lỗi khi gọi AI. Vui lòng thử lại sau.';
    }
  }

  // 3. ENHANCE JOB DESCRIPTION (Google Gemini)
  async enhanceJobDescription(description: string): Promise<string> {
    const prompt = `Bạn là chuyên gia viết mô tả công việc. Hãy cải thiện mô tả sau để rõ ràng, hấp dẫn hơn (giữ tiếng Việt):\n\n${description}`;
    return this.askAI(prompt);
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
      const result = await this.askAI(prompt);
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

  // 5. EXTRACT USER SKILLS (từ user object hoặc giả định)
  private extractUserSkills(_user: User): string[] {
    // Giả sử user có field skills (nếu không có, return empty)
    // Hoặc extract từ name/email nếu test
    
    // VD: Giả định user có skills
    return ['React Native', 'JavaScript', 'TypeScript', 'Firebase'];
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

  // 5. ANALYZE CV STRENGTH (Google Gemini)
  async analyzeCVStrength(cvData: {
    education?: string;
    experience?: string;
    skills?: string[];
    projects?: string;
    summary?: string;
  }): Promise<{
    score: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  }> {
    const prompt = `
Bạn là chuyên gia đánh giá CV. Phân tích CV sinh viên sau và cho điểm từ 0-100:

Học vấn: ${cvData.education || 'Chưa có'}
Kinh nghiệm: ${cvData.experience || 'Chưa có'}
Kỹ năng: ${cvData.skills?.join(', ') || 'Chưa có'}
Dự án: ${cvData.projects || 'Chưa có'}
Giới thiệu: ${cvData.summary || 'Chưa có'}

Hãy trả về JSON với format CHÍNH XÁC sau (không thêm markdown, chỉ JSON thuần):
{
  "score": 75,
  "strengths": ["Có kinh nghiệm thực tập tại công ty IT", "GPA cao 3.5/4.0"],
  "improvements": ["Thiếu kỹ năng mềm", "Chưa có dự án cá nhân"],
  "suggestions": ["Thêm section Hobbies/Interests", "Viết rõ achievements với số liệu cụ thể", "Bổ sung soft skills"]
}
    `.trim();

    try {
      const result = await this.askAI(prompt);
      
      // Try to parse JSON from response
      // Gemini sometimes wraps JSON in markdown code blocks
      let jsonText = result.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(jsonText);
      
      return {
        score: Math.min(100, Math.max(0, parsed.score || 0)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch (error) {
      console.error('CV analysis failed:', error);
      
      // Fallback: rule-based scoring
      let score = 0;
      const strengths: string[] = [];
      const improvements: string[] = [];
      const suggestions: string[] = [];
      
      if (cvData.education) {
        score += 20;
        strengths.push('Có thông tin học vấn');
      } else {
        improvements.push('Chưa có thông tin học vấn');
        suggestions.push('Thêm thông tin trường học, chuyên ngành, GPA');
      }
      
      if (cvData.experience) {
        score += 30;
        strengths.push('Có kinh nghiệm làm việc');
      } else {
        improvements.push('Chưa có kinh nghiệm');
        suggestions.push('Thêm kinh nghiệm thực tập hoặc dự án');
      }
      
      if (cvData.skills && cvData.skills.length > 0) {
        score += 25;
        strengths.push(`Có ${cvData.skills.length} kỹ năng`);
      } else {
        improvements.push('Chưa liệt kê kỹ năng');
        suggestions.push('Thêm kỹ năng chuyên môn và kỹ năng mềm');
      }
      
      if (cvData.projects) {
        score += 15;
        strengths.push('Có dự án cá nhân');
      } else {
        improvements.push('Chưa có dự án');
        suggestions.push('Thêm dự án cá nhân hoặc dự án học tập');
      }
      
      if (cvData.summary) {
        score += 10;
        strengths.push('Có phần giới thiệu bản thân');
      } else {
        suggestions.push('Thêm phần tóm tắt giới thiệu bản thân ngắn gọn');
      }
      
      return { score, strengths, improvements, suggestions };
    }
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
    
    const categoryData = SALARY_DATA[jobData.category.toLowerCase()];
    if (!categoryData) {
      return null;
    }
    
    const typeData = categoryData[jobData.type];
    if (!typeData) {
      return null;
    }
    
    // Adjust by location
    let multiplier = 1.0;
    const locationLower = jobData.location.toLowerCase();
    
    if (locationLower.includes('hồ chí minh') || locationLower.includes('hcm') || locationLower.includes('sài gòn')) {
      multiplier = 1.2;
    } else if (locationLower.includes('hà nội') || locationLower.includes('hanoi')) {
      multiplier = 1.15;
    } else if (locationLower.includes('đà nẵng')) {
      multiplier = 1.1;
    } else if (locationLower.includes('bình dương') || locationLower.includes('thủ dầu một')) {
      multiplier = 1.05;
    } else {
      multiplier = 0.9;
    }
    
    return {
      min: Math.round(typeData.min * multiplier),
      max: Math.round(typeData.max * multiplier),
      avg: Math.round(typeData.avg * multiplier),
      unit: typeData.unit,
      confidence: multiplier >= 1.1 ? 'Cao' : multiplier >= 1.0 ? 'Trung bình' : 'Thấp',
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