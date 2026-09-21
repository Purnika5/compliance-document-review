import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

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
    sendSuccess(res, { user: (req as any).user }, 200, 'Current user profile');
  });
}
