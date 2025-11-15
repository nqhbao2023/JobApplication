import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import quickPostService from '../services/quickpost.service';

/**
 * Quick Post Job - Không cần authentication
 * Dành cho: Sinh viên share job, chủ quán nhỏ post nhanh
 */
export const createQuickPostJob = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobData = {
      ...req.body,
      jobSource: 'quick-post',
      isVerified: false, // Admin phải duyệt
      status: 'pending',
    };

    const job = await quickPostService.createQuickPost(jobData);
    
    res.status(201).json({
      message: 'Job submitted successfully! Waiting for admin approval.',
      job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all pending quick posts (Admin only)
 */
export const getPendingQuickPosts = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const jobs = await quickPostService.getPendingQuickPosts();
    res.json({ jobs, count: jobs.length });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve quick post job (Admin only)
 */
export const approveQuickPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const job = await quickPostService.approveQuickPost(id);
    res.json({ message: 'Job approved and published!', job });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject quick post job (Admin only)
 */
export const rejectQuickPost = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await quickPostService.rejectQuickPost(id, reason);
    res.json({ message: 'Job rejected.' });
  } catch (error) {
    next(error);
  }
};
