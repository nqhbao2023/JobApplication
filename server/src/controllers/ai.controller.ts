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

