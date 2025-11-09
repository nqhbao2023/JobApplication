import axios from 'axios';
import { db } from '../config/firebase';
import { Job, AIRecommendation } from '../types';
import { AppError } from '../middleware/errorHandler';

export class AIService {
  private apiKey: string;
  private apiUrl: string;

  constructor() {
    this.apiKey = process.env.AI_API_KEY || '';
    this.apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1';
  }

  async recommendJobs(candidateId: string, limit: number = 10): Promise<AIRecommendation[]> {
    try {
      const userDoc = await db.collection('users').doc(candidateId).get();
      
      if (!userDoc.exists) {
        throw new AppError('User not found', 404);
      }

      const userData = userDoc.data();
      const userSkills = userData?.skills || [];

      if (userSkills.length === 0) {
        return [];
      }

      const jobsSnapshot = await db
        .collection('jobs')
        .where('status', '==', 'active')
        .limit(100)
        .get();

      const jobs = jobsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[];

      const recommendations: AIRecommendation[] = jobs
        .map((job) => {
          const matchedSkills = this.calculateMatchedSkills(userSkills, job.skills || []);
          const score = this.calculateMatchScore(matchedSkills, job.skills || []);

          return {
            jobId: job.id!,
            score,
            reason: this.generateReason(matchedSkills),
            matchedSkills,
          };
        })
        .filter((rec) => rec.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return recommendations;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to generate recommendations: ${error.message}`, 500);
    }
  }

  async enhanceJobDescription(description: string): Promise<string> {
    try {
      if (!this.apiKey) {
        return description;
      }

      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a professional job description writer. Enhance the given job description to be more clear, engaging, and professional.',
            },
            {
              role: 'user',
              content: `Enhance this job description:\n\n${description}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0]?.message?.content || description;
    } catch (error: any) {
      console.error('AI enhancement failed:', error.message);
      return description;
    }
  }

  async extractSkillsFromText(text: string): Promise<string[]> {
    try {
      const commonSkills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby',
        'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
        'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase',
        'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
        'Git', 'CI/CD', 'Agile', 'Scrum', 'REST API', 'GraphQL',
        'HTML', 'CSS', 'Sass', 'Tailwind', 'Bootstrap',
        'React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS',
      ];

      const textLower = text.toLowerCase();
      const foundSkills = commonSkills.filter((skill) =>
        textLower.includes(skill.toLowerCase())
      );

      return foundSkills;
    } catch (error: any) {
      console.error('Skill extraction failed:', error.message);
      return [];
    }
  }

  private calculateMatchedSkills(userSkills: string[], jobSkills: string[]): string[] {
    const userSkillsLower = userSkills.map((s) => s.toLowerCase());

    return jobSkills.filter((skill) =>
      userSkillsLower.includes(skill.toLowerCase())
    );
  }

  private calculateMatchScore(matchedSkills: string[], jobSkills: string[]): number {
    if (jobSkills.length === 0) return 0;
    return Math.round((matchedSkills.length / jobSkills.length) * 100);
  }

  private generateReason(matchedSkills: string[]): string {
    if (matchedSkills.length === 0) {
      return 'Bạn có thể học thêm kỹ năng cần thiết cho công việc này.';
    }

    if (matchedSkills.length === 1) {
      return `Bạn có kỹ năng ${matchedSkills[0]} phù hợp với yêu cầu.`;
    }

    return `Bạn có ${matchedSkills.length} kỹ năng phù hợp: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}.`;
  }
}

export default new AIService();