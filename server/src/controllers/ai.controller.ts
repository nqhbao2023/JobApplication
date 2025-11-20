import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import aiService from '../services/ai.service';

export const recommendJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Lấy candidateId từ req để tránh lỗi 'req' không được dùng
    const candidateId = req.user?.uid;
    // TODO: Lấy danh sách jobs từ database và gọi aiService.recommendJobs
    // Hiện tại chưa có DB truy xuất, trả về mảng trống tạm thời
    console.log('recommendJobs requested by candidate:', candidateId);
    res.json([]);
  } catch (error) {
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
