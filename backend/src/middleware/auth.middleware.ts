import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthTokenPayload, UserRole } from '../types/models';
import { AppError } from './error.middleware';

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  let token: string | undefined;

  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
    token = req.query.token.trim();
  }

  if (!token) {
    return next(
      new AppError(
        "Authentication token required. Provide header 'Authorization: Bearer <token>' or query parameter '?token=<jwt_token>'",
        401,
        'UNAUTHORIZED'
      )
    );
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthTokenPayload;
    if (!decoded.id || !decoded.role) {
      return next(new AppError('Invalid token payload', 401, 'INVALID_TOKEN'));
    }
    
    (req as any).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(
        new AppError(
          `Forbidden: User role '${user.role}' lacks permission`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

export const requireAdvisor = requireRole(['Advisor']);
export const requireOfficer = requireRole(['Officer']);
