import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { query } from '../db/pool';
import { User } from '../types/models';
import { AppError } from '../middleware/error.middleware';

export class AuthController {
  public static signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await AuthService.signup(req.body);
    sendSuccess(res, result, 201, 'User registered successfully');
  });

  public static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await AuthService.login(req.body);
    sendSuccess(res, result, 200, 'Login successful');
  });

  public static getCurrentUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req.user as any)?.id;
    if (userId) {
      const userResult = await query<User>(
        'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        const u = userResult.rows[0];
        sendSuccess(res, {
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            created_at: u.created_at,
            updated_at: u.updated_at
          }
        }, 200, 'Current user profile');
        return;
      }
    }
    sendSuccess(res, { user: (req as any).user }, 200, 'Current user profile');
  });

  public static updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req.user as any)?.id;
    if (!userId) {
      throw new AppError('Authentication required to update profile', 401, 'UNAUTHORIZED');
    }
    const updatedUser = await AuthService.updateProfile(userId, req.body);
    sendSuccess(res, { user: updatedUser }, 200, 'User profile updated successfully');
  });
}
