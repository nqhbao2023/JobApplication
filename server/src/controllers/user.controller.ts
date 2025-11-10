import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import userService from '../services/user.service';

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const profile = await userService.getCurrentUser(uid);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

export const bootstrapUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || req.body.email || null;

    const profile = await userService.upsertCurrentUser(uid, {
      ...req.body,
      email,
    });

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
};
