import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

router.get('/', HealthController.check);
router.get('/circuit-breaker', HealthController.circuitBreakerStatus);
router.get('/audit-logs', HealthController.systemAuditLogs);

export default router;
