import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
      return;
    }

    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role,
    };

    next();
  } catch (error: any) {
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token',
      details: error.message 
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    if (roles.length && !roles.includes(req.user.role || '')) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions' 
      });
      return;
    }

    next();
  };
};

