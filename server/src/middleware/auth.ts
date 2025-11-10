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

    // ✅ Load role from Firestore (role không có trong Firebase token)
    let role: string | undefined;
    try {
      const { db } = await import('../config/firebase');
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        role = userData?.role;
        
        // Normalize role cũ (student -> candidate)
        if (role === 'student') {
          role = 'candidate';
        }
        
        // Ưu tiên admin nếu có flag isAdmin
        if (userData?.isAdmin === true) {
          role = 'admin';
        }
      }
    } catch (dbError: any) {
      // ✅ Nếu load role từ Firestore fail, vẫn cho phép authenticate
      // Role sẽ là undefined và authorize middleware sẽ check
      console.error('Failed to load user role from Firestore:', dbError);
      // Không throw error, chỉ log và tiếp tục với role = undefined
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: role || undefined,
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
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

