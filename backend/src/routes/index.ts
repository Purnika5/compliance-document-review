import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import piiRoutes from './pii.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/pii', piiRoutes);

export default router;
