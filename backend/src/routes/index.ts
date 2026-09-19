import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import notificationRoutes from './notification.routes';

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
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/api/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/api/notifications', notificationRoutes);

export default router;


