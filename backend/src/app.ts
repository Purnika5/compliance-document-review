import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { errorHandler, AppError } from './middleware/error.middleware';
import { systemAuditMiddleware } from './middleware/systemAudit.middleware';

export const createApp = (): Application => {
  const app: Application = express();

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false
  }));
  app.use(cors({
    origin: config.cors.origin,
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // DevOps System Audit Logging: Records every state change (who, what, when) without PII
  app.use(systemAuditMiddleware);

  const staticUploadHeaders = (_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    next();
  };

  app.use('/uploads/documents', staticUploadHeaders, express.static(config.uploads.dir));
  app.use('/uploads', staticUploadHeaders, express.static(config.uploads.dir));
  app.use('/api/v1/uploads/documents', staticUploadHeaders, express.static(config.uploads.dir));
  app.use('/api/v1/uploads', staticUploadHeaders, express.static(config.uploads.dir));

  // Fallback handler for missing static uploads (serves sample PDF/DOCX if file missing on disk)
  app.use(['/uploads/*', '/api/v1/uploads/*'], staticUploadHeaders, (req: Request, res: Response, next: NextFunction) => {
    const isDocx = req.originalUrl.toLowerCase().includes('.docx') || req.originalUrl.toLowerCase().includes('.doc');
    if (isDocx) {
      const sampleDocxPath = path.join(config.uploads.dir, 'sample_compliance_filing.docx');
      if (fs.existsSync(sampleDocxPath)) {
        return res.contentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document').sendFile(sampleDocxPath);
      }
      return res.status(404).json({ success: false, message: 'Word document file not found on server disk.' });
    }

    const samplePdfPath = path.join(config.uploads.dir, 'sample_compliance_filing.pdf');
    if (fs.existsSync(samplePdfPath)) {
      return res.contentType('application/pdf').sendFile(samplePdfPath);
    }
    next();
  });

  if (config.env === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.use('/', routes);

  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
