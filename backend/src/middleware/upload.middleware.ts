import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config';
import { AppError } from './error.middleware';

if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(8).toString('hex');
    const sanitizedExt = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, sanitizedExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${randomHex}-${baseName}${sanitizedExt}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();

  const isExtensionValid = allowedExtensions.includes(ext);
  const isMimeValid = config.uploads.allowedMimeTypes.includes(file.mimetype);

  if (isExtensionValid && isMimeValid) {
    cb(null, true);
  } else {
    req.fileValidationError = new AppError(
      `Unsupported file format '${ext || 'unknown'}'. Allowed formats: PDF, DOCX, XLSX, TXT.`,
      400,
      'UNSUPPORTED_FILE_TYPE'
    );
    cb(null, false);
  }
};

import { Request, Response, NextFunction } from 'express';

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxFileSizeMB * 1024 * 1024
  }
});

export const uploadDocumentFile = {
  single: (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      multerUpload.single(fieldName)(req, res, (err: any) => {
        if (err) {
          req.on('data', () => {});
          if (!req.complete) {
            req.resume();
          }
          return next(err);
        }
        if ((req as any).fileValidationError) {
          return next((req as any).fileValidationError);
        }
        next();
      });
    };
  }
};
