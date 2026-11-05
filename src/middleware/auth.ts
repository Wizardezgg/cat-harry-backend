import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { IUser } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Extract from HTTPOnly Cookie (Challenge 1 Primary Security Vector)
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback to Authorization Header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access Denied: HTTPOnly session token required.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'aperture_studio_super_secret_jwt_2026_key';
    const decoded = jwt.verify(token, secret) as { id: string; email: string; role: string };

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid session token: User no longer exists.',
      });
      return;
    }

    req.user = (user.toObject() as unknown) as IUser;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid or expired token.',
      error: err?.message || 'Token verification error',
    });
  }
}

// Role-based authorization middleware
export function requireRole(allowedRole: 'host' | 'creator' | 'admin') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before checking role permissions.',
      });
      return;
    }

    if (req.user.role !== allowedRole && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: `Forbidden: Requires ${allowedRole.toUpperCase()} permissions.`,
      });
      return;
    }

    next();
  };
}
