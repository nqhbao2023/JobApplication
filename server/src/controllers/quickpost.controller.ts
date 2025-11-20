import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import quickPostService from '../services/quickpost.service';
import { checkForSpam, extractMetadata } from '../utils/spamDetection';

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
    const { title, description, contactInfo } = req.body;

    // ✅ Spam detection
    const spamCheck = checkForSpam({ title, description, contactInfo });
    
    // ✅ Extract metadata for tracking
    const metadata = extractMetadata(req);

    // ✅ Auto-reject if spam score too high
    if (spamCheck.isSpam) {
      console.warn(`🚨 Spam detected (score: ${spamCheck.score}): ${spamCheck.reason}`);
      console.warn(`📍 Metadata:`, metadata);
      
      res.status(400).json({
        error: 'Your submission appears to be spam and has been rejected.',
        reason: spamCheck.reason,
      });
      return;
    }

    const jobData = {
      ...req.body,
      jobSource: 'quick-post',
      isVerified: false, // Admin phải duyệt
      status: 'pending',
      metadata, // Lưu metadata để admin review
      spamScore: spamCheck.score, // Lưu spam score
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
    res.json({ message: 'Job rejected and removed.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Send application notification for quick-post job
 * Requires auth (candidate only)
 */
export const notifyQuickPostApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, cvUrl } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const success = await quickPostService.notifyQuickPostApplication(
      id,
      { name, email, phone, cvUrl }
    );

    res.json({ 
      success, 
      message: success 
        ? 'Application notification sent successfully' 
        : 'Failed to send notification (no email configured)'
    });
  } catch (error) {
    next(error);
  }
};
