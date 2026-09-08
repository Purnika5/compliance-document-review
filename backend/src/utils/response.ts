import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string
): Response => {
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    data
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string = 'ERROR',
  details?: any
): Response => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      message,
      ...(details && { details })
    }
  });
};
