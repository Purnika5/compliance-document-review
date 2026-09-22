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
    if (!fs.existsSync(config.uploads.dir)) {
      fs.mkdirSync(config.uploads.dir, { recursive: true });
    }

    if (isDocx) {
      const sampleDocxPath = path.join(config.uploads.dir, 'sample_compliance_filing.docx');
      if (!fs.existsSync(sampleDocxPath)) {
        const minimalDocxBase64 =
          "UEsDBBQAAAAIAAAAIQCS74NsbwEAAFoDAAATAAAAW2NvbnRlbnRfVHlwZXNdLnhtbKyTT0/C" +
          "MAzF70j8DlrurQNhCSG2Ew4mHiTqgTvg15a2tGvXDvLtzaYLxIQ/wNte+vzyevW+vj42LlgP" +
          "1rmU5yKNIsCora+tLfLL+ml5ikIErcHajDnJEZydlTfX9bZ7xZgmbvA5SYW4xJCS71hLgbf9" +
          "1QZ8w111h/x8ZzP4x+E1O3v+w0+jR+790e0c1fJEp3tFz2bWoxK8D6eFkU08yAUpYV1T8T13" +
          "WlsrY28gTlh7m10L01wBwZ1wP31QfBspCqIe7kH689a+A1BLAQIUABQAAAAIAAAAIQCS74Ns" +
          "bwEAAFoDAAATAAAAAAAAAAAAAAAAAAAAAABbY29udGVudF9UeXBlc10ueG1sUEsBAhQA" +
          "FAAAAAgAAAAhAG+VbI85AQAAaQIAAAsAAAAAAAAAAAAAAAAAWQEAAF9yZWxzLy5yZWxz" +
          "UEsBAhQAFAAAAAgAAAAhAHQ3/gBmAQAAoAIAABEAAAAAAAAAAAAAAAAA6AIAAHdvcmQv" +
          "ZG9jdW1lbnQueG1sUEsFBgAAAAADAAMArgEAAJ4DAAAAAA==";
        fs.writeFileSync(sampleDocxPath, Buffer.from(minimalDocxBase64, 'base64'));
      }
      return res.contentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document').sendFile(sampleDocxPath);
    }

    const samplePdfPath = path.join(config.uploads.dir, 'sample_compliance_filing.pdf');
    if (!fs.existsSync(samplePdfPath)) {
      const minimalPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj\n4 0 obj << /Length 40 >> stream\nBT /F1 12 Tf 72 712 Td (Springer Capital Compliance Document) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer << /Size 5 /Root 1 0 R >>\nstartxref\n303\n%%EOF'
      );
      fs.writeFileSync(samplePdfPath, minimalPdf);
    }
    return res.contentType('application/pdf').sendFile(samplePdfPath);
  });

  if (config.env === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.use('/api/v1', routes);
  app.use('/api', routes);
  app.use('/', routes);

  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
