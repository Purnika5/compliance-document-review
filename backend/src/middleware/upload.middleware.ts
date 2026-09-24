import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from './error.middleware';

if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  const cleanMime = (file.mimetype || '').toLowerCase().split(';')[0].trim();

  const isExtensionValid = allowedExtensions.includes(ext);
  const isMimeValid =
    config.uploads.allowedMimeTypes.includes(cleanMime) ||
    cleanMime === 'application/octet-stream' ||
    cleanMime === '' ||
    cleanMime === 'application/x-pdf' ||
    cleanMime.startsWith('text/');

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
      multerUpload.single(fieldName)(req as any, res as any, (err: any) => {
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

        if (req.file) {
          const file = req.file;
          const ext = path.extname(file.originalname).toLowerCase();
          const buffer = file.buffer;

          // Inspect binary magic bytes before saving to disk
          if (ext === '.pdf' || file.mimetype === 'application/pdf') {
            const isPdfMagic =
              buffer &&
              buffer.length >= 4 &&
              buffer[0] === 0x25 && // %
              buffer[1] === 0x50 && // P
              buffer[2] === 0x44 && // D
              buffer[3] === 0x46;   // F

            if (!isPdfMagic) {
              return next(
                new AppError(
                  'Spoofed file detected. PDF files must start with %PDF- (0x25 0x50 0x44 0x46) magic bytes.',
                  400,
                  'INVALID_FILE_SIGNATURE'
                )
              );
            }
          } else if (
            ext === '.docx' ||
            ext === '.xlsx' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ) {
            const isZipMagic =
              buffer &&
              buffer.length >= 4 &&
              buffer[0] === 0x50 && // P
              buffer[1] === 0x4B && // K
              buffer[2] === 0x03 &&
              buffer[3] === 0x04;

            if (!isZipMagic) {
              return next(
                new AppError(
                  'Spoofed file detected. DOCX/XLSX files must start with PK\\x03\\x04 (0x50 0x4B 0x03 0x04) magic bytes.',
                  400,
                  'INVALID_FILE_SIGNATURE'
                )
              );
            }
          }

          // Write validated file to disk
          if (!fs.existsSync(config.uploads.dir)) {
            fs.mkdirSync(config.uploads.dir, { recursive: true });
          }

          const randomHex = crypto.randomBytes(8).toString('hex');
          const sanitizedExt = ext;
          const baseName = path.basename(file.originalname, sanitizedExt).replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${Date.now()}-${randomHex}-${baseName}${sanitizedExt}`;
          const filePath = path.join(config.uploads.dir, filename);

          try {
            fs.writeFileSync(filePath, file.buffer);
          } catch (writeErr) {
            return next(new AppError('Failed to save uploaded file to storage.', 500, 'FILE_WRITE_ERROR'));
          }

          file.destination = config.uploads.dir;
          file.filename = filename;
          file.path = filePath;
          file.size = file.buffer.length;
        }

        next();
      });
    };
  }
};
