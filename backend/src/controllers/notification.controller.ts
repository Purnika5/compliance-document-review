import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { sendSuccess } from '../utils/response';

export class NotificationController {
  public static getNotifications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const unreadOnly = String(req.query.unread_only) === 'true';
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await NotificationService.getUserNotifications(
        userId,
        unreadOnly,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit
        }
      });
    } catch (err) {
      next(err);
    }
  };

  public static getUnreadCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const counts = await NotificationService.getUnreadCount(userId);
      sendSuccess(res, counts);
    } catch (err) {
      next(err);
    }
  };

  public static markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const notificationId = req.params.id;
      const notification = await NotificationService.markAsRead(notificationId, userId);
      sendSuccess(res, notification);
    } catch (err) {
      next(err);
    }
  };

  public static markAllAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await NotificationService.markAllAsRead(userId);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  public static streamNotifications = (
    req: Request,
    res: Response
  ): void => {
    const userId = (req as any).user.id;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders?.();

    // Send connection established event
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Real-time notification stream active' })}\n\n`);

    // Register active SSE response stream
    NotificationService.addSSEClient(userId, res);

    // Heartbeat ping interval
    const intervalId = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);
    if (intervalId.unref) {
      intervalId.unref();
    }

    const cleanup = () => {
      clearInterval(intervalId);
      NotificationService.removeSSEClient(userId, res);
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('finish', cleanup);
  };
}
