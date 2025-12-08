import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import aiService from '../services/ai.service';
import jobService from '../services/job.service';
import { userService } from '../services/user.service';
import { User, AIRecommendation } from '../types';

/**
 * AI Job Recommendations Controller
 * Gợi ý việc làm phù hợp dựa trên skills của candidate
 * 
 * @route GET /api/ai/recommend
 * @query limit - Số lượng gợi ý tối đa (default: 10, max: 50)
 * @returns Array<AIRecommendation> - Danh sách jobs được gợi ý kèm điểm số và lý do
 */
export const recommendJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const candidateId = req.user?.uid;
    
    if (!candidateId) {
      res.status(401).json({ error: 'Unauthorized - User ID not found' });
      return;
    }

    // Parse limit from query (default 10, max 50)
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    console.log(`🤖 [AI Recommend] Starting for candidate: ${candidateId}, limit: ${limit}`);

    // 1. Fetch user profile to get skills
    let user: User;
    try {
      user = await userService.getUserById(candidateId) as User;
      console.log(`📋 [AI Recommend] User skills:`, user.skills || 'No skills found');
    } catch (userError: any) {
      console.warn(`⚠️ [AI Recommend] User not found: ${userError.message}`);
      // Return empty array if user not found (new user without profile)
      res.json([]);
      return;
    }

    // 2. Check if user has skills
    if (!user.skills || user.skills.length === 0) {
      console.log(`[AI Recommend] User has no skills, returning empty recommendations`);
      res.json([]);
      return;
    }

    // 3. Fetch active jobs from database
    const { jobs: allJobs } = await jobService.getAllJobs({
      status: 'active',
      limit: 200, // Fetch more jobs to filter
    });
    
    console.log(`📦 [AI Recommend] Found ${allJobs.length} active jobs`);

    if (allJobs.length === 0) {
      res.json([]);
      return;
    }

    // 4. Get AI recommendations
    const recommendations = await aiService.recommendJobs(user, allJobs, limit);
    
    console.log(`✅ [AI Recommend] Generated ${recommendations.length} recommendations`);

    // 5. Transform to API response format
    const response: AIRecommendation[] = recommendations.map(rec => ({
      jobId: rec.job.id || rec.job.$id || '',
      score: rec.score,
      reason: rec.reason,
      matchedSkills: rec.matchedSkills,
    }));

    res.json(response);
  } catch (error: any) {
    console.error('❌ [AI Recommend] Error:', error.message);
    next(error);
  }
};

export const enhanceDescription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { description } = req.body;

    if (!description) {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    const enhanced = await aiService.enhanceJobDescription(description);
    res.json({ enhanced });
  } catch (error) {
    next(error);
  }
};

export const extractSkills = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const skills = await aiService.extractSkillsFromText(text);
    res.json({ skills });
  } catch (error) {
    next(error);
  }
};

export const askAI = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const answer = await aiService.askAI(prompt);
    res.json({ answer });
  } catch (error) {
    next(error);
  }
};

export const categorizeJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required' });
      return;
    }

    const category = await aiService.autoCategorizeJob(title, description);
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

export const analyzeCV = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cvData = req.body;

    if (!cvData) {
      res.status(400).json({ error: 'CV data is required' });
      return;
    }

    const analysis = await aiService.analyzeCVStrength(cvData);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
};

export const predictSalary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobData = req.body;

    if (!jobData || !jobData.title || !jobData.category || !jobData.location || !jobData.type) {
      res.status(400).json({ error: 'Job data (title, category, location, type) is required' });
      return;
    }

    const prediction = await aiService.predictJobSalary(jobData);
    res.json(prediction);
  } catch (error) {
    next(error);
  }
};
