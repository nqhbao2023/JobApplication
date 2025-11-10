import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import savedJobService from '../services/savedJob.service';

export const getSavedJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const savedJobs = await savedJobService.getSavedJobs(userId);
    res.json(savedJobs);
  } catch (error) {
    next(error);
  }
};

export const saveJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { jobId } = req.params;

    const savedJob = await savedJobService.saveJob(userId, jobId);
    res.status(201).json(savedJob);
  } catch (error) {
    next(error);
  }
};

export const removeSavedJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { jobId } = req.params;

    await savedJobService.removeJob(userId, jobId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
