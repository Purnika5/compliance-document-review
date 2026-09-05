import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import multer from 'multer';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error Occurred]', {
      path: req.path,
      method: req.method,
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(
      res,
      400,
      'Validation failed for request parameters',
      'VALIDATION_ERROR',
      err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    );
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 400, 'File size limit exceeded (maximum 25MB allowed)', 'FILE_TOO_LARGE');
      return;
    }
    sendError(res, 400, err.message, 'FILE_UPLOAD_ERROR');
    return;
  }

  sendError(
    res,
    500,
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    'INTERNAL_SERVER_ERROR'
  );
};
