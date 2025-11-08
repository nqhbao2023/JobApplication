import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import jobService from '../services/job.service';

export const getAllJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, category, type, limit, offset } = req.query;

    const result = await jobService.getAllJobs({
      status: status as string,
      category: category as string,
      type: type as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await jobService.getJobById(id);

    await jobService.incrementViewCount(id);

    res.json(job);
  } catch (error) {
    next(error);
  }
};

export const createJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobData = {
      ...req.body,
      employerId: req.user!.uid,
    };

    const job = await jobService.createJob(jobData);
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await jobService.updateJob(id, req.body);
    res.json(job);
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await jobService.deleteJob(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getEmployerJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employerId = req.user!.uid;
    const jobs = await jobService.getJobsByEmployer(employerId);
    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

