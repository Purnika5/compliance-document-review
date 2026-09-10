import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../db/pool';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export class HealthController {
  public static check = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const isDbConnected = await checkDatabaseConnection();

    const healthInfo = {
      status: isDbConnected ? 'healthy' : 'degraded',
      service: 'compliance-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: isDbConnected ? 'connected' : 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    };

    if (isDbConnected) {
      sendSuccess(res, healthInfo, 200, 'Service is healthy');
    } else {
      sendError(res, 503, 'Database connection is unhealthy', 'SERVICE_UNAVAILABLE', healthInfo);
    }
  });
}
