import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import notificationRoutes from './notification.routes';
import chatRoutes from './chat.routes';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Compliance Document Review System Backend API',
    endpoints: {
      health: '/health',
      auth: '/auth',
      documents: '/documents',
      notifications: '/notifications'
    }
  });
});

router.use('/health', healthRoutes);
router.use('/api/health', healthRoutes);
router.all('/api/migrate', HealthController.runMigrationEndpoint);
router.use('/auth', authRoutes);
router.use('/api/auth', authRoutes);

router.use('/documents', documentRoutes);
router.use('/api/documents', documentRoutes);

router.use('/notifications', notificationRoutes);
router.use('/api/notifications', notificationRoutes);

router.use('/chat', chatRoutes);
router.use('/api/chat', chatRoutes);

export default router;


