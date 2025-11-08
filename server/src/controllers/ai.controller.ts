import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import aiService from '../services/ai.service';

export const recommendJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const candidateId = req.user!.uid;
    const { limit } = req.query;

    const recommendations = await aiService.recommendJobs(
      candidateId,
      limit ? parseInt(limit as string, 10) : 10
    );

    res.json(recommendations);
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

