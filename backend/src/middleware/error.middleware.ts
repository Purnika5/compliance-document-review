import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import multer from 'multer';
import fs from 'fs';

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
  if (req.readable) {
    req.resume();
  }

  // Clean up any uploaded file on disk if an error occurred during request processing
  if (req.file && req.file.path) {
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error Occurred]', {
      path: req.path,
      method: req.method,
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }

  const sendFinalError = (statusCode: number, message: string, code: string, details?: any) => {
    if (!req.complete && req.readable) {
      let sent = false;
      const send = () => {
        if (sent) return;
        sent = true;
        sendError(res, statusCode, message, code, details);
      };
      req.on('data', () => {});
      req.once('end', send);
      req.once('error', send);
      req.resume();
      setTimeout(send, 100);
      return;
    }
    sendError(res, statusCode, message, code, details);
  };

  if (err instanceof AppError) {
    sendFinalError(err.statusCode, err.message, err.code, err.details);
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

  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    sendError(res, 400, 'Malformed JSON payload in request body', 'BAD_REQUEST');
    return;
  }

  if (err.type === 'entity.too.large' || err.status === 413) {
    sendError(res, 413, 'Request payload too large (maximum 10MB allowed)', 'PAYLOAD_TOO_LARGE');
    return;
  }

  if (err.code === '23505') {
    sendError(res, 409, 'A record with these details already exists', 'CONFLICT');
    return;
  }

  if (err.code === '22P02') {
    sendError(res, 400, 'Invalid input syntax for parameter', 'INVALID_SYNTAX');
    return;
  }

  sendError(
    res,
    500,
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    'INTERNAL_SERVER_ERROR'
  );
};
