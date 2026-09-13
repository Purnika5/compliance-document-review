import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler, AppError } from './middleware/error.middleware';

export const createApp = (): Application => {
  const app: Application = express();

  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginOpenerPolicy: false
  }));
  app.use(cors({
    origin: config.cors.origin,
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const staticUploadHeaders = (_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    next();
  };

  app.use('/uploads/documents', staticUploadHeaders, express.static(config.uploads.dir));
  app.use('/uploads', staticUploadHeaders, express.static(config.uploads.dir));

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
