import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  notificationQuerySchema,
  notificationIdParamSchema
} from '../validations/notification.validation';

const router = Router();


router.use(authenticateToken);

// SSE real-time stream endpoint
router.get('/stream', NotificationController.streamNotifications);

// Unread notification badge count
router.get('/unread-count', NotificationController.getUnreadCount);

// Retrieve notifications list
router.get('/', validate({ query: notificationQuerySchema }), NotificationController.getNotifications);

// Mark single notification as read
router.patch('/:id/read', validate({ params: notificationIdParamSchema }), NotificationController.markAsRead);

// Mark document notifications as read
router.post('/document/:documentId/read', NotificationController.markDocumentAsRead);

// Mark all notifications as read
router.post('/read-all', NotificationController.markAllAsRead);

export default router;
