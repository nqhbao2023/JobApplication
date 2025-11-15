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
}

export default new AIService();