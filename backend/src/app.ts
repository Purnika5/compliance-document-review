import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import routes from './routes';
import { errorHandler, AppError } from './middleware/error.middleware';

export const createApp = (): Application => {
  const app: Application = express();

  app.use(helmet());
  app.use(cors({
    origin: config.cors.origin,
    credentials: true
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(config.uploads.dir));

  if (config.env === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  app.use('/api', routes);
  app.use('/', routes);

  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
