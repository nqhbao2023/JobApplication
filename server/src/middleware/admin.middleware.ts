import { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase';

/**
 * Admin middleware
 * Checks if authenticated user has admin role
 * Must be used AFTER authMiddleware
 */
export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Get user document from Firestore to check role
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const userData = userDoc.data();

    // Check if user is admin
    if (userData?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required',
      });
    }

    // Update req.user with role info
    req.user.role = userData.role;

    return next();
  } catch (error: any) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify admin status',
    });
  }
};

/**
 * Employer middleware
 * Checks if authenticated user has employer role
 */
export const employerMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const userData = userDoc.data();

    if (userData?.role !== 'employer' && userData?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Employer access required',
      });
    }

    req.user.role = userData.role;

    return next();
  } catch (error: any) {
    console.error('Employer middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify employer status',
    });
  }
};
