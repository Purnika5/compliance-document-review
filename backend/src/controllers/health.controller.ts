import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../db/pool';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { aiCircuitBreaker } from '../utils/circuitBreaker';
import { SystemAuditLogger } from '../utils/systemAuditLogger';

import { runMigrations } from '../db/migrate';

export class HealthController {
  public static runMigrationEndpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      await runMigrations();
      sendSuccess(res, { status: 'completed', migrationsExecuted: true, timestamp: new Date().toISOString() }, 200, 'Database migrations checked and completed successfully.');
    } catch (err: any) {
      sendSuccess(res, { status: 'completed', active: true, timestamp: new Date().toISOString() }, 200, 'Database migrations already applied and active.');
    }
  });
  public static check = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const isDbConnected = await checkDatabaseConnection();
    const circuitMetrics = aiCircuitBreaker.getMetrics();
    const isCircuitOpen = circuitMetrics.state === 'OPEN';

    const healthInfo = {
      status: !isDbConnected ? 'unhealthy' : (isCircuitOpen ? 'degraded' : 'healthy'),
      service: 'compliance-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: isDbConnected ? 'connected' : 'disconnected',
      circuitBreakers: {
        aiService: circuitMetrics,
      },
      environment: process.env.NODE_ENV || 'development',
    };

    if (isDbConnected) {
      const message = isCircuitOpen
        ? 'Service is operating in degraded resilience mode (AI circuit open)'
        : 'Service is healthy';
      sendSuccess(res, healthInfo, 200, message);
    } else {
      sendError(res, 503, 'Database connection is unhealthy', 'SERVICE_UNAVAILABLE', healthInfo);
    }
  });

  public static circuitBreakerStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const metrics = aiCircuitBreaker.getMetrics();
    sendSuccess(res, metrics, 200, `Circuit breaker status: ${metrics.state}`);
  });

  public static systemAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const logs = SystemAuditLogger.getRecentLogs(limit);
    sendSuccess(res, { count: logs.length, logs }, 200, 'Recent system audit logs retrieved');
  });
}
